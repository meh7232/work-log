'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkLog, WorkStatus } from '@/types';
import WorkCard from '@/components/WorkCard';

const STATUSES: (WorkStatus | '전체')[] = ['전체', '진행중', '완료', '보류'];

export default function ListPage() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<WorkStatus | '전체'>('전체');
  const [filterAuthor, setFilterAuthor] = useState('전체');
  const [filterMonth, setFilterMonth] = useState('전체');

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

  const authors = ['전체', ...Array.from(new Set(logs.map(l => l.author))).sort()];
  const months = ['전체', ...Array.from(new Set(logs.map(l => l.month))).sort().reverse()];

  const filtered = logs.filter(l => {
    if (filterStatus !== '전체' && l.status !== filterStatus) return false;
    if (filterAuthor !== '전체' && l.author !== filterAuthor) return false;
    if (filterMonth !== '전체' && l.month !== filterMonth) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.author.toLowerCase().includes(q) ||
        l.client.toLowerCase().includes(q) ||
        l.content.toLowerCase().includes(q) ||
        l.notes.toLowerCase().includes(q) ||
        l.special_notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">전체 목록</h1>

      <input
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="🔍  작성자, 거래처, 업무내용, 전달사항으로 검색..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
              }`}>
              {s}
            </button>
          ))}
        </div>
        <select className="border border-gray-300 rounded-lg px-2 py-1 text-xs"
          value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)}>
          {authors.map(a => <option key={a}>{a}</option>)}
        </select>
        <select className="border border-gray-300 rounded-lg px-2 py-1 text-xs"
          value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          {months.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      <p className="text-xs text-gray-400 mb-3">총 {filtered.length}건</p>

      {loading ? (
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">검색 결과가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(log => <WorkCard key={log.id} log={log} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}
