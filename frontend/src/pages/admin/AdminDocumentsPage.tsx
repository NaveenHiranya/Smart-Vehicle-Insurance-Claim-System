import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { FileText, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

const verifColors: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-700',
  PENDING: 'bg-gray-100 text-gray-600',
  ISSUES_FOUND: 'bg-red-100 text-red-700',
  UNREADABLE: 'bg-red-100 text-red-700',
};

const STATUS_TABS = ['PENDING', 'ISSUES_FOUND', 'ALL'] as const;
type StatusTab = typeof STATUS_TABS[number];

interface DocAction {
  loading: boolean;
  rejectInput: boolean;
  reason: string;
}

export function AdminDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>('PENDING');
  const [docAction, setDocAction] = useState<Record<string, DocAction>>({});

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== 'ALL') params.set('status', tab);
    adminApi
      .get(`/documents?${params}`)
      .then((r) => setDocs(r.data))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const getAction = (docId: string): DocAction =>
    docAction[docId] || { loading: false, rejectInput: false, reason: '' };

  const setAction = (docId: string, patch: Partial<DocAction>) =>
    setDocAction((p) => ({ ...p, [docId]: { ...getAction(docId), ...patch } }));

  const handleApprove = async (docId: string) => {
    setAction(docId, { loading: true });
    try {
      await adminApi.patch(`/documents/${docId}/approve`);
      load();
    } catch {
      alert('Failed to approve document');
    } finally {
      setAction(docId, { loading: false });
    }
  };

  const handleReject = async (docId: string) => {
    const reason = getAction(docId).reason;
    setAction(docId, { loading: true });
    try {
      await adminApi.patch(`/documents/${docId}/reject`, { reason });
      load();
    } catch {
      alert('Failed to reject document');
    } finally {
      setAction(docId, { loading: false, rejectInput: false });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 mt-1">Review and approve user-uploaded documents</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-5">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'ALL' ? 'All' : t === 'ISSUES_FOUND' ? 'Issues Found' : 'Pending'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400" />
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No documents found for this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc: any) => {
            const da = getAction(doc.id);
            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-4"
              >
                {/* Thumbnail */}
                <img
                  src={doc.filePath}
                  alt=""
                  className="h-16 w-24 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {doc.type?.replace(/_/g, ' ')}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${verifColors[doc.verificationStatus]}`}
                    >
                      {doc.verificationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {doc.claim?.user?.firstName} {doc.claim?.user?.lastName}
                    </span>
                    {' — '}
                    {doc.claim?.vehicle?.year} {doc.claim?.vehicle?.make}{' '}
                    {doc.claim?.vehicle?.model}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                    {doc.verificationResult && (
                      <span className="ml-2 text-red-500">
                        Reason: {doc.verificationResult}
                      </span>
                    )}
                  </p>
                </div>

                {/* Link to claim */}
                <Link
                  to={`/admin/claims/${doc.claim?.id}`}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View Claim
                </Link>

                {/* Reject reason input */}
                {da.rejectInput && (
                  <div className="flex gap-2 w-full sm:w-auto flex-1 min-w-56">
                    <input
                      value={da.reason}
                      onChange={(e) => setAction(doc.id, { reason: e.target.value })}
                      placeholder="Rejection reason..."
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-400 outline-none"
                    />
                    <button
                      onClick={() => handleReject(doc.id)}
                      disabled={da.loading}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {da.loading ? '...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setAction(doc.id, { rejectInput: false })}
                      className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Approve / Reject buttons */}
                {!da.rejectInput && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(doc.id)}
                      disabled={da.loading || doc.verificationStatus === 'VERIFIED'}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 transition"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => setAction(doc.id, { rejectInput: true, reason: '' })}
                      disabled={da.loading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-40 transition"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
