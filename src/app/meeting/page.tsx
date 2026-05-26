'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkLog } from '@/types';
import { getMonthKey, statusColor, formatDate, isOverdue } from '@/lib/utils';
import WorkCard from '@/components/WorkCard';

type ViewMode = 'all' | 'byAuthor' | 'byClient' | 'incomplete' | 'summary';

export default function MeetingPage() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase
      .from('work_logs')
      .select('*')
      .order('work_date', { ascending: false });
    setLogs((data as WorkLog[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadLogs(); }, []);

  const months = useMemo(() =>
    Array.from(new Set(logs.map(l => l.month))).sort().reverse(), [logs]);

  const monthLogs = useMemo(() =>
    logs.filter(l => l.month === selectedMonth), [logs, selectedMonth]);

  const byAuthor = useMemo(() => {
    const map: Record<string, WorkLog[]> = {};
    monthLogs.forEach(l => { if (!map[l.author]) map[l.author] = []; map[l.author].push(l); });
    return map;
  }, [monthLogs]);

  const byClient = useMemo(() => {
    const map: Record<string, WorkLog[]> = {};
    monthLogs.forEach(l => { if (!map[l.client]) map[l.client] = []; map[l.client].push(l); });
    return map;
  }, [monthLogs]);

  const incomplete = useMemo(() => monthLogs.filter(l => l.status !== '완료'), [monthLogs]);

  function copySummary() {
    const lines = [
      `📋 ${selectedMonth} 월말 업무 보고`,
      `생성: ${new Date().toLocaleString('ko-KR')}`,
      `총 ${monthLogs.length}건 | 완료 ${monthLogs.filter(l => l.status === '완료').length}건 | 미완료 ${incomplete.length}건`,
      '',
    ];
    Object.entries(byAuthor).forEach(([author, list]) => {
      lines.push(`■ ${author} (${list.length}건)`);
      list.forEach(l => {
        lines.push(`  [${l.status}] ${l.client} — ${l.content.slice(0, 60)}${l.content.length > 60 ? '...' : ''}`);
        if (l.deadline) lines.push(`       마감: ${l.deadline}${isOverdue(l) ? ' ⚠초과' : ''}`);
        if (l.notes) lines.push(`       전달: ${l.notes}`);
      });
      lines.push('');
    });
    if (incomplete.length > 0) {
      lines.push('■ 미완료 업무');
      incomplete.forEach(l => lines.push(`  [${l.status}] ${l.author} | ${l.client} — ${l.content.slice(0, 50)}`));
    }
    navigator.clipboard.writeText(lines.join('\n'));
    alert('회의 요약이 클립보드에 복사되었습니다.');
  }

  const TABS: { key: ViewMode; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'byAuthor', label: '직원별' },
    { key: 'byClient', label: '거래처별' },
    { key: 'incomplete', label: `미완료 (${incomplete.length})` },
    { key: 'summary', label: '📄 요약' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">월말 회의</h1>
        <button onClick={copySummary}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900">
          📋 요약 복사
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-medium text-gray-600">월 선택</label>
        <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          {months.length === 0
            ? <option value={selectedMonth}>{selectedMonth}</option>
            : months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-xs text-gray-400">총 {monthLogs.length}건</span>
      </div>

      <div className="flex gap-1 flex-wrap mb-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setViewMode(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400 text-sm">불러오는 중...</p>
        : monthLogs.length === 0 ? <p className="text-gray-400 text-sm">{selectedMonth} 기록이 없습니다.</p>
        : (
          <>
            {viewMode === 'all' && (
              <div className="flex flex-col gap-3">
                {monthLogs.map(l => <WorkCard key={l.id} log={l} />)}
              </div>
            )}
            {viewMode === 'byAuthor' && (
              <div className="flex flex-col gap-6">
                {Object.entries(byAuthor).map(([author, list]) => (
                  <div key={author}>
                    <h2 className="font-bold text-gray-700 mb-2 text-sm">
                      👤 {author} <span className="font-normal text-gray-400">({list.length}건)</span>
                    </h2>
                    <div className="flex flex-col gap-2">{list.map(l => <WorkCard key={l.id} log={l} />)}</div>
                  </div>
                ))}
              </div>
            )}
            {viewMode === 'byClient' && (
              <div className="flex flex-col gap-6">
                {Object.entries(byClient).map(([client, list]) => (
                  <div key={client}>
                    <h2 className="font-bold text-gray-700 mb-2 text-sm">
                      🏢 {client} <span className="font-normal text-gray-400">({list.length}건)</span>
                    </h2>
                    <div className="flex flex-col gap-2">{list.map(l => <WorkCard key={l.id} log={l} />)}</div>
                  </div>
                ))}
              </div>
            )}
            {viewMode === 'incomplete' && (
              <div className="flex flex-col gap-3">
                {incomplete.length === 0
                  ? <p className="text-green-600 text-sm font-medium">✅ 미완료 업무가 없습니다!</p>
                  : incomplete.map(l => <WorkCard key={l.id} log={l} />)}
              </div>
            )}
            {viewMode === 'summary' && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h2 className="font-bold text-gray-800 mb-4">📋 {selectedMonth} 월말 보고 요약</h2>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <StatBox label="총 업무" value={monthLogs.length} />
                  <StatBox label="완료" value={monthLogs.filter(l => l.status === '완료').length} color="green" />
                  <StatBox label="미완료" value={incomplete.length} color={incomplete.length > 0 ? 'red' : 'green'} />
                </div>
                <h3 className="font-semibold text-gray-700 text-sm mb-2">직원별 현황</h3>
                <div className="flex flex-col gap-2 mb-5">
                  {Object.entries(byAuthor).map(([author, list]) => (
                    <div key={author} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-sm text-gray-800 w-20 flex-shrink-0">{author}</span>
                      <div className="flex gap-1 flex-wrap">
                        {(['진행중', '완료', '보류'] as const).map(s => {
                          const cnt = list.filter(l => l.status === s).length;
                          if (!cnt) return null;
                          return <span key={s} className={`text-xs px-2 py-0.5 rounded-full ${statusColor(s)}`}>{s} {cnt}</span>;
                        })}
                      </div>
                      <span className="ml-auto text-xs text-gray-400">{list.length}건</span>
                    </div>
                  ))}
                </div>
                {monthLogs.filter(isOverdue).length > 0 && (
                  <>
                    <h3 className="font-semibold text-red-600 text-sm mb-2">⚠ 마감 초과 업무</h3>
                    <div className="flex flex-col gap-2 mb-5">
                      {monthLogs.filter(isOverdue).map(l => (
                        <div key={l.id} className="p-3 bg-red-50 rounded-lg text-sm">
                          <span className="font-medium">{l.author}</span> | {l.client} — {l.content.slice(0, 50)}
                          <span className="text-red-600 ml-2">마감: {formatDate(l.deadline)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {monthLogs.filter(l => l.notes).length > 0 && (
                  <>
                    <h3 className="font-semibold text-blue-600 text-sm mb-2">📢 전달사항</h3>
                    <div className="flex flex-col gap-2">
                      {monthLogs.filter(l => l.notes).map(l => (
                        <div key={l.id} className="p-3 bg-blue-50 rounded-lg text-sm">
                          <span className="font-medium">{l.author}</span> | {l.client}
                          <p className="text-blue-800 mt-1">{l.notes}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  const bg = color === 'green' ? 'bg-green-50 text-green-700' : color === 'red' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700';
  return (
    <div className={`rounded-lg p-3 text-center ${bg}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}
