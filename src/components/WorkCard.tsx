import Link from 'next/link';
import { WorkLog } from '@/types';
import { formatDate, isOverdue, isMissingNotes, statusColor } from '@/lib/utils';

interface Props {
  log: WorkLog;
  onDelete?: (id: number) => void;
}

export default function WorkCard({ log, onDelete }: Props) {
  const overdue = isOverdue(log);
  const missingNotes = isMissingNotes(log);

  return (
    <div className={`border rounded-xl p-4 bg-white shadow-sm ${overdue ? 'border-red-400' : 'border-gray-200'}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-bold text-gray-900">{log.author}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(log.status)}`}>
          {log.status}
        </span>
        {overdue && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
            ⚠ 마감 초과
          </span>
        )}
        {missingNotes && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">
            ! 전달사항 없음
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">{formatDate(log.work_date)}</span>
      </div>

      <div className="mb-2">
        <span className="text-xs text-gray-500 mr-1">거래처</span>
        <span className="font-semibold text-gray-800">{log.client}</span>
      </div>
      <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">{log.content}</p>

      {log.deadline && (
        <p className={`text-xs mb-1 ${overdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
          마감일: {formatDate(log.deadline)}
        </p>
      )}

      {log.notes && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 font-bold mb-0.5">전달사항</p>
          <p className="text-sm text-blue-900 whitespace-pre-wrap">{log.notes}</p>
        </div>
      )}
      {log.special_notes && (
        <div className="mt-2 p-2 bg-yellow-50 rounded-lg">
          <p className="text-xs text-yellow-700 font-bold mb-0.5">특이사항</p>
          <p className="text-sm text-yellow-900 whitespace-pre-wrap">{log.special_notes}</p>
        </div>
      )}

      <div className="mt-3 flex gap-3">
        <Link href={`/edit/${log.id}`} className="text-xs text-blue-400 hover:text-blue-600">
          수정
        </Link>
        {onDelete && (
          <button onClick={() => onDelete(log.id)} className="text-xs text-red-400 hover:text-red-600">
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
