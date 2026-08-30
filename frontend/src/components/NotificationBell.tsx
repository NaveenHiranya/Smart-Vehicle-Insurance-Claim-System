import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertCircle, Wrench, CircleDollarSign, FileText, MessageSquare } from 'lucide-react';
import api from '../services/api';

interface Notification {
  id: string;
  claimId: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const typeIcon: Record<string, typeof Bell> = {
  DOC_REMINDER: FileText,
  GARAGE_ESTIMATE: Wrench,
  FINAL_VALUE: CircleDollarSign,
  ADMIN_MESSAGE: MessageSquare,
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data.items ?? []);
      setUnread(res.data.unread ?? 0);
    } catch {
      // silent — notifications are non-critical
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const markRead = async (n: Notification) => {
    if (!n.read) {
      try { await api.patch(`/notifications/${n.id}/read`); } catch { /* ignore */ }
    }
    setOpen(false);
    if (n.claimId) navigate(`/claims/${n.claimId}`);
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await api.patch('/notifications/read-all');
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      setUnread(0);
    } finally { setLoading(false); }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2 text-gray-600 hover:bg-gray-100 transition"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-300/30">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {loading ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-gray-500">No notifications yet</div>
            ) : (
              items.map((n) => {
                const Icon = typeIcon[n.type] ?? AlertCircle;
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition flex gap-3 ${!n.read ? 'bg-primary-50/40' : ''}`}
                  >
                    <div className={`shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${!n.read ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                        {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{n.message}</p>
                      <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-gray-100 px-4 py-2 text-center">
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
