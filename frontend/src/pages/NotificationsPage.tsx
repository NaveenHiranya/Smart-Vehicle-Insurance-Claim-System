import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertCircle, Wrench, CircleDollarSign, FileText, MessageSquare, ArrowLeft } from 'lucide-react';
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

const typeColor: Record<string, string> = {
  DOC_REMINDER: 'bg-amber-100 text-amber-700',
  GARAGE_ESTIMATE: 'bg-orange-100 text-orange-700',
  FINAL_VALUE: 'bg-green-100 text-green-700',
  ADMIN_MESSAGE: 'bg-primary-100 text-primary-700',
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data.items ?? []);
      setUnread(res.data.unread ?? 0);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (n: Notification) => {
    if (!n.read) {
      try { await api.patch(`/notifications/${n.id}/read`); } catch { /* ignore */ }
      setItems((prev) => prev.map((i) => i.id === n.id ? { ...i, read: true } : i));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.claimId) navigate(`/claims/${n.claimId}`);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      setUnread(0);
    } finally { setMarkingAll(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mb-5 font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-md shadow-primary-600/25">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
              <p className="text-xs text-gray-500">
                {unread > 0 ? `${unread} unread` : 'All caught up'}
              </p>
            </div>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 border border-primary-200 rounded-lg hover:bg-primary-50 transition"
            >
              <CheckCheck className="h-4 w-4" />
              {markingAll ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Bell className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">You'll see updates here when your claims progress.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((n) => {
              const Icon = typeIcon[n.type] ?? AlertCircle;
              const color = typeColor[n.type] ?? 'bg-gray-100 text-gray-500';
              return (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition flex gap-3 ${!n.read ? 'bg-primary-50/30' : ''}`}
                >
                  <div className={`shrink-0 mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${!n.read ? color : 'bg-gray-100 text-gray-500'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                      {n.claimId && (
                        <span className="text-[10px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">View claim</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
