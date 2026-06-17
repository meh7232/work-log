import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ── 카카오 응답 형식 ── */
function textReply(text: string) {
  return NextResponse.json({
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
    },
  });
}

function listReply(text: string, items: { title: string; description: string }[]) {
  if (items.length === 0) return textReply(text);

  // 카카오 listCard는 최대 5개, 초과 시 여러 simpleText로 분리
  const preview = items.slice(0, 5);
  const lines = preview.map((it, i) => `${i + 1}. ${it.title}\n   ${it.description}`).join('\n\n');
  const more = items.length > 5 ? `\n\n...외 ${items.length - 5}건 더 있어요.` : '';
  return textReply(`${text}\n\n${lines}${more}`);
}

/* ── 날짜 유틸 ── */
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getPrevWeekKey(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return getWeekKey(d);
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isOverdue(log: any): boolean {
  if (!log.deadline || log.status === '완료') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(log.deadline) < today;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toItems(logs: any[]) {
  return logs.map(l => ({
    title: `[${l.status}] ${l.content}`,
    description: `담당: ${l.author} | 거래처: ${l.client}${l.deadline ? ` | 마감: ${l.deadline}` : ''}`,
  }));
}

/* ── 메인 핸들러 ── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const utterance: string = body?.userRequest?.utterance?.trim() ?? '';
    const lower = utterance.toLowerCase();

    const { data: logs } = await supabase
      .from('work_logs')
      .select('*')
      .order('work_date', { ascending: false });

    const all = logs ?? [];
    const today = new Date();

    /* 도움말 */
    if (/도움|help|뭐\s*할/.test(lower)) {
      return textReply(
        '📋 업무 챗봇 사용법\n\n' +
        '• 이번주 업무\n' +
        '• 지난주 업무\n' +
        '• 이번달 업무\n' +
        '• 마감 초과\n' +
        '• 미완료 업무\n' +
        '• 전체 현황\n' +
        '• [이름] 업무 (예: 홍길동 업무)',
      );
    }

    /* 전체 현황 */
    if (/전체\s*현황|요약|통계/.test(lower)) {
      const tw = all.filter((l) => l.week === getWeekKey(today)).length;
      const tm = all.filter((l) => l.month === getMonthKey(today)).length;
      const done = all.filter((l) => l.status === '완료').length;
      const ongoing = all.filter((l) => l.status === '진행중').length;
      const hold = all.filter((l) => l.status === '보류').length;
      const overdue = all.filter((l) => isOverdue(l)).length;
      return textReply(
        `📊 전체 업무 현황\n\n` +
        `전체 ${all.length}건\n` +
        `이번 주 ${tw}건 | 이번 달 ${tm}건\n` +
        `완료 ${done} | 진행중 ${ongoing} | 보류 ${hold}\n` +
        `⚠ 마감 초과 ${overdue}건`,
      );
    }

    /* 이번주 */
    if (/이번\s*주|이번주/.test(lower)) {
      const filtered = all.filter((l) => l.week === getWeekKey(today));
      if (!filtered.length) return textReply('이번 주 등록된 업무가 없어요.');
      return listReply(`📋 이번 주 업무 ${filtered.length}건`, toItems(filtered));
    }

    /* 지난주 */
    if (/지난\s*주|지난주/.test(lower)) {
      const filtered = all.filter((l) => l.week === getPrevWeekKey(today));
      if (!filtered.length) return textReply('지난 주 등록된 업무가 없어요.');
      return listReply(`📋 지난 주 업무 ${filtered.length}건`, toItems(filtered));
    }

    /* 이번달 */
    if (/이번\s*달|이번달/.test(lower)) {
      const filtered = all.filter((l) => l.month === getMonthKey(today));
      if (!filtered.length) return textReply('이번 달 등록된 업무가 없어요.');
      return listReply(`📅 이번 달 업무 ${filtered.length}건`, toItems(filtered));
    }

    /* 마감 초과 */
    if (/마감\s*(초과|지난|넘)|기한\s*초과/.test(lower)) {
      const filtered = all.filter((l) => isOverdue(l));
      if (!filtered.length) return textReply('마감 초과 업무가 없어요! 👍');
      return listReply(`🚨 마감 초과 ${filtered.length}건`, toItems(filtered));
    }

    /* 미완료 */
    if (/미완료|안\s*끝|진행\s*중/.test(lower)) {
      const filtered = all.filter((l) => l.status !== '완료');
      if (!filtered.length) return textReply('미완료 업무가 없어요! 🎉');
      return listReply(`⏳ 미완료 ${filtered.length}건`, toItems(filtered));
    }

    /* 완료 */
    if (/완료\s*(된|업무)|끝난/.test(lower)) {
      const filtered = all.filter((l) => l.status === '완료');
      if (!filtered.length) return textReply('완료된 업무가 없어요.');
      return listReply(`✅ 완료 ${filtered.length}건`, toItems(filtered));
    }

    /* 보류 */
    if (/보류/.test(lower)) {
      const filtered = all.filter((l) => l.status === '보류');
      if (!filtered.length) return textReply('보류 중인 업무가 없어요.');
      return listReply(`⏸ 보류 ${filtered.length}건`, toItems(filtered));
    }

    /* 담당자 검색 */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authorMatch = all.find((l: any) =>
      lower.includes(l.author.trim().toLowerCase()),
    );
    if (authorMatch) {
      const name = authorMatch.author.trim();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = all.filter((l: any) =>
        l.author.trim().toLowerCase() === name.toLowerCase(),
      );
      return listReply(`👤 ${name} 업무 ${filtered.length}건`, toItems(filtered));
    }

    /* 기본 */
    return textReply(
      '잘 모르겠어요 😅\n"도움말"을 입력하면 사용법을 알려드릴게요!',
    );
  } catch {
    return textReply('오류가 발생했어요. 잠시 후 다시 시도해주세요.');
  }
}
