import { useEffect, useState } from 'react';
import { Download, LogOut, PawPrint } from 'lucide-react';
import PlannerPage from '@/features/planner/planner-page';
import { logout } from './auth/main-auth';
import { getSession } from './auth/session';
import { apiFetch } from './services/api';

export function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  async function download() {
    try {
      const data = await apiFetch('/export');
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vetify-planner-export.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export failed.');
    }
  }
  return (
    <>
      <header className="border-b border-teal-100 bg-white px-4 py-4 sm:px-8">
        <nav
          className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4"
          aria-label="Planner navigation"
        >
          <a href="/" className="flex items-center gap-2 font-bold text-teal-900">
            <PawPrint aria-hidden="true" />
            Vetify Planner
          </a>
          <div className="flex items-center gap-4 text-sm">
            <span>
              {getSession()?.user.name?.trim() || getSession()?.user.email || 'Your account'}
            </span>
            <button
              type="button"
              onClick={() => void download()}
              className="flex items-center gap-1 text-teal-800"
            >
              <Download size={16} aria-hidden="true" />
              Export
            </button>
            <button
              type="button"
              onClick={() => void logout().catch(() => {})}
              className="flex items-center gap-1 text-teal-800"
            >
              <LogOut size={16} aria-hidden="true" />
              Log out
            </button>
          </div>
        </nav>
      </header>
      {!online && (
        <p role="status" className="bg-amber-100 p-3 text-center text-sm text-amber-950">
          You are offline. Connect to view or save meals.
        </p>
      )}
      {error && (
        <p role="alert" className="p-3 text-center text-rose-800">
          {error}
        </p>
      )}
      {online ? (
        <PlannerPage />
      ) : (
        <main className="p-8 text-center">Your meal data stays online. Reconnect to continue.</main>
      )}
    </>
  );
}
