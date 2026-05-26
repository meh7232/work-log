'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkLog } from '@/types';
import { getWeekKey, getPrevWeekKey, isOverdue, isMissingNotes } from '@/lib/utils';
import WorkCard from '@/components/WorkCard';
import Link from 'next/link';

export default function DashboardPage() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);

  const thisWeek = getWeekKey(new Date());
  const prevWeek = getPrevWeekKey(new Date());

  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase
      .from('work_logs')
      .select('*')
      .order('work_date', { ascending: false });
    setLogs((data as WorkLog[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from('work_logs').delete().eq('id', id);
    loadLogs();
  }

  useEffect(() => { loadLogs(); }, []);

  const thisWeekLogs = logs.filter(l => l.week === thisWeek);
  const prevIncomplete = logs.filter(l => l.week === prevWeek && l.status !== '완료');
  const overdueLogs = logs.filter(l => isOverdue(l));
  const missingNotesList = logs.filter(l => isMissingNotes(l) && l.status !== '완료');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 text-sm mt-1">{thisWeek} 주간 업무 현황</p>
        </div>
        <Link href="/write" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + 업무 기록
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <SummaryCard label="이번주 업무" value={thisWeekLogs.length} color="blue" />
        <SummaryCard label="지난주 미완료" value={prevIncomplete.length} color={prevIncomplete.length > 0 ? 'orange' : 'green'} />
        <SummaryCard label="마감 초과" value={overdueLogs.length} color={overdueLogs.length > 0 ? 'red' : 'green'} />
        <SummaryCard label="전달사항 누락" value={missingNotesList.length} color={missingNotesList.length > 0 ? 'orange' : 'green'} />
      </div>

      {prevIncomplete.length > 0 && (
        <Section title={`⚠ 지난주 미완료 업무 (${prevIncomplete.length}건)`} color="orange">
          {prevIncomplete.map(log => <WorkCard key={log.id} log={log} onDelete={handleDelete} />)}
        </Section>
      )}

      {overdueLogs.length > 0 && (
        <Section title={`🚨 마감일 초과 업무 (${overdueLogs.length}건)`} color="red">
          {overdueLogs.map(log => <WorkCard key={log.id} log={log} onDelete={handleDelete} />)}
        </Section>
      )}

      {missingNotesList.length > 0 && (
        <Section title={`! 전달사항 미입력 업무 (${missingNotesList.length}건)`} color="yellow">
          {missingNotesList.map(log => <WorkCard key={log.id} log={log} onDelete={handleDelete} />)}
        </Section>
      )}

      <Section title={`📋 이번주 업무 (${thisWeekLogs.length}건)`} color="blue">
        {loading ? (
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        ) : thisWeekLogs.length === 0 ? (
          <p className="text-gray-400 text-sm">이번 주 등록된 업무가 없습니다.</p>
        ) : (
          thisWeekLogs.map(log => <WorkCard key={log.id} log={log} onDelete={handleDelete} />)
        )}
      </Section>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700', red: 'bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1">{label}</p>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const borders: Record<string, string> = {
    blue: 'border-blue-200', orange: 'border-orange-200',
    red: 'border-red-200', yellow: 'border-yellow-200',
  };
  return (
    <div className={`mb-6 border rounded-xl overflow-hidden ${borders[color]}`}>
      <div className={`px-4 py-3 font-semibold text-sm bg-white border-b ${borders[color]}`}>{title}</div>
      <div className="p-4 bg-white flex flex-col gap-3">{children}</div>
    </div>
  );
}
