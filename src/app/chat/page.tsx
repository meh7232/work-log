'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkLog, WorkStatus } from '@/types';
import {
  getWeekKey, getMonthKey, getPrevWeekKey,
  isOverdue, formatDate, statusColor,
} from '@/lib/utils';

/* ── 타입 ── */
interface Message {
  role: 'user' | 'bot';
  text: string;
  cards?: WorkLog[];
  time: string;
}

type FlowStep =
  | 'author' | 'client' | 'content'
  | 'status' | 'deadline' | 'notes' | 'special' | 'confirm';

interface AddFlow {
  step: FlowStep;
  data: Partial<WorkLog>;
}

/* ── 시간 포맷 ── */
function nowStr() {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

/* ── 챗봇 응답 생성 ── */
async function getReply(
  input: string,
  logs: WorkLog[],
  flow: AddFlow | null,
): Promise<{ text: string; cards?: WorkLog[]; nextFlow?: AddFlow | null }> {
  const msg = input.trim();
  const lower = msg.toLowerCase();

  /* ─ 업무 추가 플로우 진행 중 ─ */
  if (flow) {
    return handleAddFlow(msg, flow, logs);
  }

  /* ─ 업무 추가 시작 ─ */
  if (/업무\s*(추가|등록|입력|새로|기록)/.test(lower) || lower.includes('새 업무')) {
    return {
      text: '업무를 추가할게요! 담당자 이름을 알려주세요.',
      nextFlow: { step: 'author', data: {} },
    };
  }

  /* ─ 도움말 ─ */
  if (/도움|뭐\s*할|기능|help/.test(lower)) {
    return {
      text: `💡 이런 걸 물어볼 수 있어요:\n\n• "이번주 업무" — 이번 주 업무 목록\n• "지난주 업무" — 지난 주 업무 목록\n• "이번달 업무" — 이번 달 전체 목록\n• "마감 초과" — 기한이 지난 업무\n• "미완료 업무" — 진행중·보류 업무\n• "홍길동 업무" — 특정 담당자 업무\n• "전체 현황" — 요약 통계\n• "업무 추가" — 새 업무 등록`,
    };
  }

  /* ─ 전체 현황 ─ */
  if (/전체\s*현황|요약|통계|현황/.test(lower)) {
    const today = new Date();
    const thisWeek = getWeekKey(today);
    const thisMonth = getMonthKey(today);
    const tw = logs.filter(l => l.week === thisWeek).length;
    const tm = logs.filter(l => l.month === thisMonth).length;
    const done = logs.filter(l => l.status === '완료').length;
    const ongoing = logs.filter(l => l.status === '진행중').length;
    const hold = logs.filter(l => l.status === '보류').length;
    const overdue = logs.filter(l => isOverdue(l)).length;
    return {
      text: `📊 전체 업무 현황\n\n전체 ${logs.length}건\n• 이번 주 ${tw}건 | 이번 달 ${tm}건\n• 완료 ${done}건 | 진행중 ${ongoing}건 | 보류 ${hold}건\n• ⚠ 마감 초과 ${overdue}건`,
    };
  }

  /* ─ 이번주 ─ */
  if (/이번\s*주|이번주/.test(lower)) {
    const key = getWeekKey(new Date());
    const filtered = logs.filter(l => l.week === key);
    if (!filtered.length) return { text: '이번 주 등록된 업무가 없어요.' };
    return { text: `📋 이번 주 업무 ${filtered.length}건이에요.`, cards: filtered };
  }

  /* ─ 지난주 ─ */
  if (/지난\s*주|지난주/.test(lower)) {
    const key = getPrevWeekKey(new Date());
    const filtered = logs.filter(l => l.week === key);
    if (!filtered.length) return { text: '지난 주 등록된 업무가 없어요.' };
    return { text: `📋 지난 주 업무 ${filtered.length}건이에요.`, cards: filtered };
  }

  /* ─ 이번달 ─ */
  if (/이번\s*달|이번달|이번\s*월/.test(lower)) {
    const key = getMonthKey(new Date());
    const filtered = logs.filter(l => l.month === key);
    if (!filtered.length) return { text: '이번 달 등록된 업무가 없어요.' };
    return { text: `📅 이번 달 업무 ${filtered.length}건이에요.`, cards: filtered };
  }

  /* ─ 마감 초과 ─ */
  if (/마감\s*(초과|지난|넘은|지연)|기한\s*초과/.test(lower)) {
    const filtered = logs.filter(l => isOverdue(l));
    if (!filtered.length) return { text: '마감 초과 업무가 없어요! 👍' };
    return { text: `🚨 마감이 지난 업무 ${filtered.length}건이에요.`, cards: filtered };
  }

  /* ─ 미완료 ─ */
  if (/미완료|안\s*끝난|진행\s*중|완료\s*안/.test(lower)) {
    const filtered = logs.filter(l => l.status !== '완료');
    if (!filtered.length) return { text: '미완료 업무가 없어요! 모두 완료했네요 🎉' };
    return { text: `⏳ 미완료 업무 ${filtered.length}건이에요.`, cards: filtered };
  }

  /* ─ 완료된 업무 ─ */
  if (/완료\s*(된|한|업무)|끝난/.test(lower)) {
    const filtered = logs.filter(l => l.status === '완료');
    if (!filtered.length) return { text: '완료된 업무가 없어요.' };
    return { text: `✅ 완료 업무 ${filtered.length}건이에요.`, cards: filtered };
  }

  /* ─ 보류 ─ */
  if (/보류/.test(lower)) {
    const filtered = logs.filter(l => l.status === '보류');
    if (!filtered.length) return { text: '보류 중인 업무가 없어요.' };
    return { text: `⏸ 보류 업무 ${filtered.length}건이에요.`, cards: filtered };
  }

  /* ─ 특정 담당자 검색 ─ */
  const authorMatch = logs.find(l =>
    lower.includes(l.author.trim().toLowerCase())
  );
  if (authorMatch) {
    const name = authorMatch.author.trim();
    const filtered = logs.filter(l =>
      l.author.trim().toLowerCase() === name.toLowerCase()
    );
    return { text: `👤 ${name} 담당 업무 ${filtered.length}건이에요.`, cards: filtered };
  }

  /* ─ 거래처 검색 ─ */
  const clientMatch = logs.find(l =>
    l.client && lower.includes(l.client.trim().toLowerCase())
  );
  if (clientMatch) {
    const client = clientMatch.client.trim();
    const filtered = logs.filter(l =>
      l.client.trim().toLowerCase() === client.toLowerCase()
    );
    return { text: `🏢 ${client} 관련 업무 ${filtered.length}건이에요.`, cards: filtered };
  }

  /* ─ 기본 응답 ─ */
  return {
    text: '잘 모르겠어요 😅 "도움말"을 입력하면 사용법을 알려드릴게요!',
  };
}

/* ── 업무 추가 플로우 ── */
async function handleAddFlow(
  input: string,
  flow: AddFlow,
  logs: WorkLog[],
): Promise<{ text: string; cards?: WorkLog[]; nextFlow?: AddFlow | null }> {
  const data = { ...flow.data };

  if (flow.step === 'author') {
    data.author = input;
    return { text: `거래처를 알려주세요.`, nextFlow: { step: 'client', data } };
  }
  if (flow.step === 'client') {
    data.client = input;
    return { text: `업무 내용을 입력해주세요.`, nextFlow: { step: 'content', data } };
  }
  if (flow.step === 'content') {
    data.content = input;
    return {
      text: `진행 상태를 선택해주세요.\n\n1. 진행중\n2. 완료\n3. 보류`,
      nextFlow: { step: 'status', data },
    };
  }
  if (flow.step === 'status') {
    const statusMap: Record<string, WorkStatus> = {
      '1': '진행중', '진행중': '진행중',
      '2': '완료', '완료': '완료',
      '3': '보류', '보류': '보류',
    };
    const status = statusMap[input.trim()];
    if (!status) {
      return { text: '1·2·3 또는 "진행중", "완료", "보류" 중 입력해주세요.', nextFlow: flow };
    }
    data.status = status;
    return {
      text: `마감일을 입력해주세요. (예: 2025-07-31)\n없으면 "없음"이라고 입력해주세요.`,
      nextFlow: { step: 'deadline', data },
    };
  }
  if (flow.step === 'deadline') {
    const trimmed = input.trim();
    data.deadline = /없음|없어|스킵|skip/i.test(trimmed) ? '' : trimmed;
    return {
      text: `전달사항이 있으면 입력해주세요.\n없으면 "없음"이라고 입력해주세요.`,
      nextFlow: { step: 'notes', data },
    };
  }
  if (flow.step === 'notes') {
    const trimmed = input.trim();
    data.notes = /없음|없어|스킵|skip/i.test(trimmed) ? '' : trimmed;
    return {
      text: `특이사항이 있으면 입력해주세요.\n없으면 "없음"이라고 입력해주세요.`,
      nextFlow: { step: 'special', data },
    };
  }
  if (flow.step === 'special') {
    const trimmed = input.trim();
    data.special_notes = /없음|없어|스킵|skip/i.test(trimmed) ? '' : trimmed;

    const today = new Date();
    data.work_date = today.toISOString().slice(0, 10);
    data.week = getWeekKey(today);
    data.month = getMonthKey(today);

    return {
      text: `📝 업무 내용을 확인해주세요.\n\n담당자: ${data.author}\n거래처: ${data.client}\n내용: ${data.content}\n상태: ${data.status}\n마감: ${data.deadline || '없음'}\n전달사항: ${data.notes || '없음'}\n특이사항: ${data.special_notes || '없음'}\n\n등록하시겠어요? (네/아니오)`,
      nextFlow: { step: 'confirm', data },
    };
  }
  if (flow.step === 'confirm') {
    if (/네|예|ㅇ|확인|등록|ok|yes/i.test(input)) {
      const { error } = await supabase.from('work_logs').insert(data as never);
      if (error) {
        return { text: '등록 중 오류가 발생했어요. 다시 시도해주세요.', nextFlow: null };
      }
      return { text: `✅ 업무가 등록됐어요!\n\n담당자: ${data.author} | 거래처: ${data.client}\n내용: ${data.content}`, nextFlow: null };
    }
    return { text: '업무 등록을 취소했어요.', nextFlow: null };
  }

  return { text: '오류가 발생했어요. 처음부터 다시 시도해주세요.', nextFlow: null };
}

/* ── 업무 카드 컴포넌트 ── */
function MiniCard({ log }: { log: WorkLog }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-semibold text-gray-800 truncate">{log.content}</span>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(log.status)}`}>
          {log.status}
        </span>
      </div>
      <div className="flex gap-3 text-xs text-gray-500">
        <span>👤 {log.author}</span>
        <span>🏢 {log.client}</span>
        {log.deadline && <span>📅 {formatDate(log.deadline)}</span>}
      </div>
      {log.notes && (
        <p className="mt-1 text-xs text-gray-500 truncate">💬 {log.notes}</p>
      )}
    </div>
  );
}

/* ── 메인 페이지 ── */
export default function ChatPage() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: '안녕하세요! 업무 공유 챗봇이에요 😊\n\n업무 조회, 현황 확인, 새 업무 등록을 도와드릴게요.\n"도움말"을 입력하면 사용법을 알려드릴게요!',
      time: nowStr(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addFlow, setAddFlow] = useState<AddFlow | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('work_logs').select('*').order('work_date', { ascending: false })
      .then(({ data }) => setLogs((data as WorkLog[]) ?? []));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text, time: nowStr() }]);
    setLoading(true);

    try {
      const currentLogs = addFlow ? logs : await fetchLogs();
      const reply = await getReply(text, currentLogs, addFlow);

      if (reply.nextFlow !== undefined) {
        setAddFlow(reply.nextFlow ?? null);
        if (reply.nextFlow === null) {
          const refreshed = await fetchLogs();
          setLogs(refreshed);
        }
      }

      setMessages(prev => [
        ...prev,
        { role: 'bot', text: reply.text, cards: reply.cards, time: nowStr() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function fetchLogs(): Promise<WorkLog[]> {
    const { data } = await supabase
      .from('work_logs').select('*').order('work_date', { ascending: false });
    const result = (data as WorkLog[]) ?? [];
    setLogs(result);
    return result;
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const quickButtons = [
    '이번주 업무', '마감 초과', '미완료 업무', '전체 현황', '업무 추가',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">💬 업무 챗봇</h1>
        <p className="text-sm text-gray-500">업무 현황을 대화로 확인하고 등록하세요</p>
      </div>

      {/* 빠른 버튼 */}
      <div className="flex gap-2 flex-wrap mb-3">
        {quickButtons.map(q => (
          <button
            key={q}
            onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-4 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {msg.role === 'bot' && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                AI
              </div>
            )}
            <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>
              {msg.cards && msg.cards.length > 0 && (
                <div className="w-full flex flex-col gap-2 mt-1">
                  {msg.cards.map(log => <MiniCard key={log.id} log={log} />)}
                </div>
              )}
              <span className="text-xs text-gray-400">{msg.time}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">AI</div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={addFlow ? '답변을 입력하세요...' : '업무에 대해 물어보세요...'}
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          전송
        </button>
      </div>
    </div>
  );
}
