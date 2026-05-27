'use client';

import { useEffect, useState } from 'react';

const PASSWORD = '1234';
const STORAGE_KEY = 'work_auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'ok') {
      setAuthed(true);
    }
    setChecking(false);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'ok');
      setAuthed(true);
    } else {
      setError(true);
      setInput('');
    }
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <p className="text-2xl mb-2">📋</p>
            <h1 className="text-xl font-bold text-gray-800">업무 공유 시스템</h1>
            <p className="text-sm text-gray-400 mt-1">비밀번호를 입력해주세요</p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-center tracking-widest text-lg"
              placeholder="••••"
              value={input}
              onChange={e => { setInput(e.target.value); setError(false); }}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center">비밀번호가 틀렸습니다</p>}
            <button type="submit"
              className="w-full bg-[#1C3A5E] text-white py-3 rounded-xl font-bold hover:bg-[#15304F] transition-colors">
              입장하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
