import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { MessageCircle, Clock, CheckCircle, XCircle, Send, AlertTriangle, RefreshCw } from 'lucide-react';

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  OPEN: { color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  IN_PROGRESS: { color: 'bg-blue-100 text-blue-700', icon: Clock },
  RESOLVED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CLOSED: { color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

const FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const loadTickets = (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    adminApi.get('/support-tickets')
      .then((res) => setTickets(res.data))
      .catch(() => setError('Failed to load support tickets.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTickets(); }, []);

  const openReply = (t: any) => {
    setSelected(t);
    setReply(t.adminReply || '');
    setError('');
  };

  const sendReply = async (status?: string) => {
    if (!selected || saving) return;
    if (!reply.trim() && !status) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.patch(`/support-tickets/${selected.id}`, {
        adminReply: reply.trim() || undefined,
        status,
      });
      setSelected(null);
      setReply('');
      loadTickets(false);
    } catch {
      setError('Failed to send reply. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (ticketId: string, status: string) => {
    try {
      await adminApi.patch(`/support-tickets/${ticketId}`, { status });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status } : t)));
      if (selected?.id === ticketId) setSelected({ ...selected, status });
    } catch {
      setError('Failed to update status.');
    }
  };

  const filtered = filter === 'ALL' ? tickets : tickets.filter((t) => t.status === filter);
  const openCount = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400"></div></div>;

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary-600" />
            Support Tickets
          </h1>
          <p className="text-gray-500 mt-1">Problems and complaints reported through the AI assistant</p>
        </div>
        <div className="flex items-center gap-3">
          {openCount > 0 && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              {openCount} open
            </span>
          )}
          <button onClick={() => loadTickets()} title="Refresh"
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f.replace('_', ' ')}
            {f !== 'ALL' && (
              <span className="ml-1.5 opacity-70">{tickets.filter((t) => t.status === f).length}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No support tickets {filter !== 'ALL' ? `with status "${filter.replace('_', ' ')}"` : 'yet'}.</p>
          <p className="text-xs mt-1">Tickets appear here when users report problems through the AI assistant chat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const cfg = statusConfig[t.status] || statusConfig.OPEN;
            const StatusIcon = cfg.icon;
            return (
              <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-primary-200 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {t.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">{t.subject}</h3>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{t.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      <span>From: {t.user?.firstName} {t.user?.lastName} ({t.user?.email})</span>
                      {t.claim && (
                        <Link to={`/admin/claims/${t.claim.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                          Claim: {t.claim.vehicle?.year} {t.claim.vehicle?.make} {t.claim.vehicle?.model} ({t.claim.status})
                        </Link>
                      )}
                    </div>
                    {t.adminReply && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                        <span className="font-medium">Replied:</span> {t.adminReply}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => openReply(t)}
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition">
                      {t.adminReply ? 'Reply again' : 'Reply'}
                    </button>
                    <select
                      value={t.status}
                      onChange={(e) => changeStatus(t.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs bg-white"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Reply to: {selected.subject}</h2>
              <p className="text-xs text-gray-500 mt-1">
                From {selected.user?.firstName} {selected.user?.lastName} — {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="p-5">
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 mb-4 whitespace-pre-wrap">{selected.message}</div>
              {selected.claim && (
                <Link to={`/admin/claims/${selected.claim.id}`} onClick={() => setSelected(null)}
                  className="block p-3 mb-4 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700 hover:bg-primary-100 transition">
                  View related claim: {selected.claim.vehicle?.year} {selected.claim.vehicle?.make} {selected.claim.vehicle?.model} ({selected.claim.status})
                </Link>
              )}
              <label className="block text-sm font-medium text-gray-700 mb-1">Your reply (sent to the user as a notification)</label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply to the user..."
                rows={4}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                autoFocus
              />
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2 flex-wrap">
              <button onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">
                Cancel
              </button>
              <button onClick={() => sendReply('RESOLVED')} disabled={saving || !reply.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition">
                Reply & Resolve
              </button>
              <button onClick={() => sendReply('IN_PROGRESS')} disabled={saving || !reply.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40 transition flex items-center gap-1.5">
                <Send className="h-4 w-4" />
                {saving ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
