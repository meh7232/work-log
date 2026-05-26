'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkStatus, WorkLogInput } from '@/types';
import { getWeekKey, getMonthKey } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const STATUSES: WorkStatus[] = ['진행중', '완료', '보류'];
const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';

export default function WritePage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    author: '', work_date: today, client: '',
    content: '', status: '진행중' as WorkStatus,
    notes: '', special_notes: '', deadline: '',
  });
  const [saving, setSaving] = useState(false);
  const [warn, setWarn] = useState('');

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setWarn('');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.author.trim()) { setWarn('작성자를 입력해주세요.'); return; }
    if (!form.client.trim()) { setWarn('거래처명을 입력해주세요.'); return; }
    if (!form.content.trim()) { setWarn('업무내용을 입력해주세요.'); return; }
    if (!form.notes.trim()) {
      const ok = confirm('전달사항이 비어있습니다. 그래도 저장하시겠습니까?');
      if (!ok) return;
    }

    setSaving(true);
    const date = new Date(form.work_date);
    const log: WorkLogInput = {
      ...form,
      week: getWeekKey(date),
      month: getMonthKey(date),
    };

    const { error } = await supabase.from('work_logs').insert(log as never);
    setSaving(false);

    if (error) {
      setWarn('저장 중 오류가 발생했습니다: ' + error.message);
      return;
    }
    alert('저장되었습니다.');
    router.push('/');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">업무 기록 작성</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5">

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="작성자 *">
            <input className={INPUT} placeholder="이름" value={form.author} onChange={e => set('author', e.target.value)} />
          </Field>
          <Field label="작성일 *">
            <input type="date" className={INPUT} value={form.work_date} onChange={e => set('work_date', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="거래처명 *">
            <input className={INPUT} placeholder="거래처명" value={form.client} onChange={e => set('client', e.target.value)} />
          </Field>
          <Field label="진행상태 *">
            <div className="flex gap-2 mt-1">
              {STATUSES.map(s => (
                <button key={s} type="button" onClick={() => set('status', s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.status === s
                      ? s === '완료' ? 'bg-green-600 text-white border-green-600'
                        : s === '진행중' ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-yellow-500 text-white border-yellow-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}>{s}</button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="업무내용 *">
          <textarea className={`${INPUT} min-h-[100px]`} placeholder="이번 주 진행한 업무 내용을 입력하세요"
            value={form.content} onChange={e => set('content', e.target.value)} />
        </Field>

        <Field label="마감일">
          <input type="date" className={INPUT} value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </Field>

        <Field label="전달사항">
          <textarea className={`${INPUT} min-h-[80px]`} placeholder="팀원·상사에게 전달할 내용"
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>

        <Field label="특이사항">
          <textarea className={`${INPUT} min-h-[80px]`} placeholder="특별히 공유할 사항"
            value={form.special_notes} onChange={e => set('special_notes', e.target.value)} />
        </Field>

        {warn && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">⚠ {warn}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중...' : '저장하기'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
