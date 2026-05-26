import { WorkLog } from '@/types';

export function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getPrevWeekKey(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return getWeekKey(d);
}

export function isOverdue(log: WorkLog): boolean {
  if (!log.deadline || log.status === '완료') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(log.deadline) < today;
}

export function isMissingNotes(log: WorkLog): boolean {
  return !log.notes || log.notes.trim() === '';
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function statusColor(status: string): string {
  if (status === '완료') return 'bg-green-100 text-green-800';
  if (status === '진행중') return 'bg-blue-100 text-blue-800';
  return 'bg-yellow-100 text-yellow-800';
}
