export type WorkStatus = '진행중' | '완료' | '보류';

export interface WorkLog {
  id: number;
  author: string;
  work_date: string;       // YYYY-MM-DD
  client: string;
  content: string;
  status: WorkStatus;
  notes: string;
  special_notes: string;
  deadline: string;        // YYYY-MM-DD, 빈 문자열 허용
  week: string;            // YYYY-WXX
  month: string;           // YYYY-MM
  inserted_at?: string;
}

export type WorkLogInput = Omit<WorkLog, 'id' | 'inserted_at'>;
