import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { ArrowLeft, Shield, CheckCircle, XCircle, AlertTriangle, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-green-100 text-green-700',
};
const severityBg: Record<string, string> = {
  MINOR: 'bg-green-100 text-green-700', MODERATE: 'bg-yellow-100 text-yellow-700', SEVERE: 'bg-red-100 text-red-700',
};
const docVerifColors: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-700', PENDING: 'bg-gray-100 text-gray-600',
  ISSUES_FOUND: 'bg-red-100 text-red-700', UNREADABLE: 'bg-red-100 text-red-700',
};
const ALL_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];

export function AdminClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [docAction, setDocAction] = useState<Record<string, { loading: boolean; rejectInput: boolean; reason: string }>>({});

  const fetchClaim = () =>
    adminApi.get(`/claims/${id}`).then((r) => {
      setClaim(r.data);
      setNewStatus(r.data.status);
    }).finally(() => setLoading(false));

  useEffect(() => { fetchClaim(); }, [id]);

  const handleStatusChange = async () => {
    if (newStatus === claim.status) return;
    setStatusSaving(true);
    try {
      await adminApi.patch(`/claims/${id}/status`, { status: newStatus });
      await fetchClaim();
    } catch { alert('Failed to update status'); }
    finally { setStatusSaving(false); }
  };

  const handleQuickStatus = async (status: string) => {
    if (status === claim.status) return;
    setStatusSaving(true);
    try {
      await adminApi.patch(`/claims/${id}/status`, { status });
      await fetchClaim();
    } catch { alert('Failed to update status'); }
    finally { setStatusSaving(false); }
  };

  const handleApproveDoc = async (docId: string) => {
    setDocAction((p) => ({ ...p, [docId]: { ...p[docId], loading: true } }));
    try {
      await adminApi.patch(`/documents/${docId}/approve`);
      await fetchClaim();
    } catch { alert('Failed to approve document'); }
    finally { setDocAction((p) => ({ ...p, [docId]: { ...p[docId], loading: false } })); }
  };

  const handleRejectDoc = async (docId: string) => {
    const reason = docAction[docId]?.reason || '';
    setDocAction((p) => ({ ...p, [docId]: { ...p[docId], loading: true } }));
    try {
      await adminApi.patch(`/documents/${docId}/reject`, { reason });
      await fetchClaim();
    } catch { alert('Failed to reject document'); }
    finally { setDocAction((p) => ({ ...p, [docId]: { ...p[docId], loading: false, rejectInput: false } })); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400"></div></div>;
  if (!claim) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/admin/claims')}
        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mb-5 font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Claims
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{claim.vehicle?.make} {claim.vehicle?.model} {claim.vehicle?.year}</h1>
            <p className="text-sm text-gray-500">{claim.user?.firstName} {claim.user?.lastName} &bull; {claim.user?.email}</p>
            <p className="text-sm text-gray-500 mt-1">{claim.incidentLocation} — {new Date(claim.incidentDate).toLocaleDateString()}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[claim.status]}`}>{claim.status.replace('_', ' ')}</span>
        </div>
        <p className="text-sm text-gray-600 mb-5">{claim.incidentDescription}</p>

        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handleQuickStatus('APPROVED')}
            disabled={statusSaving || claim.status === 'APPROVED'}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition shadow-sm"
          >
            <ThumbsUp className="h-4 w-4" />
            {claim.status === 'APPROVED' ? 'Already Approved' : 'Approve Claim'}
          </button>
          <button
            onClick={() => handleQuickStatus('REJECTED')}
            disabled={statusSaving || claim.status === 'REJECTED'}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition shadow-sm"
          >
            <ThumbsDown className="h-4 w-4" />
            {claim.status === 'REJECTED' ? 'Already Rejected' : 'Reject Claim'}
          </button>
          <button
            onClick={() => handleQuickStatus('UNDER_REVIEW')}
            disabled={statusSaving || claim.status === 'UNDER_REVIEW'}
            className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 disabled:opacity-40 transition shadow-sm"
          >
            <Clock className="h-4 w-4" />
            Mark Under Review
          </button>
          <button
            onClick={() => handleQuickStatus('COMPLETED')}
            disabled={statusSaving || claim.status === 'COMPLETED'}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 transition shadow-sm"
          >
            <CheckCircle className="h-4 w-4" />
            Mark Completed
          </button>
        </div>

        {/* Advanced status change */}
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-600 transition list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span> Advanced status override
          </summary>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg mt-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Set Status:</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
              className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button onClick={handleStatusChange} disabled={statusSaving || newStatus === claim.status}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition">
              {statusSaving ? 'Saving...' : 'Update Status'}
            </button>
          </div>
        </details>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Damage Assessment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Damage Assessment</h2>
          {claim.damageAssessment ? (
            <>
              <div className="flex gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${severityBg[claim.damageAssessment.overallSeverity]}`}>
                  {claim.damageAssessment.overallSeverity}
                </span>
                <span className="text-xs text-gray-500">{new Date(claim.damageAssessment.assessedAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded">{claim.damageAssessment.drivabilityAssessment}</p>
              <div className="space-y-1.5">
                {(claim.damageAssessment.damages as any[]).map((d: any, i: number) => (
                  <div key={i} className="p-2 border border-gray-100 rounded text-xs">
                    <div className="flex justify-between mb-0.5">
                      <span className="font-medium capitalize">{d.type?.replace(/_/g, ' ')}</span>
                      <span className={`px-1.5 py-0.5 rounded ${severityBg[d.severity]}`}>{d.severity}</span>
                    </div>
                    <p className="text-gray-500">{d.location}</p>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-gray-400">No assessment yet</p>}
        </div>

        {/* Repair & Payout */}
        <div className="space-y-4">
          {claim.repairEstimate && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Repair Estimate</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-2 text-center"><p className="text-xs text-blue-600">Parts</p><p className="font-bold text-blue-900">${claim.repairEstimate.totalPartsCost.toLocaleString()}</p></div>
                <div className="bg-purple-50 rounded-lg p-2 text-center"><p className="text-xs text-purple-600">Labor</p><p className="font-bold text-purple-900">${claim.repairEstimate.totalLaborCost.toLocaleString()}</p></div>
                <div className="bg-primary-50 rounded-lg p-2 text-center"><p className="text-xs text-primary-600">Total</p><p className="font-bold text-primary-900">${claim.repairEstimate.totalCost.toLocaleString()}</p></div>
                <div className="bg-green-50 rounded-lg p-2 text-center"><p className="text-xs text-green-600">Days</p><p className="font-bold text-green-900">{claim.repairEstimate.estimatedDays}</p></div>
              </div>
            </div>
          )}
          {claim.insurancePayout && (
            <div className="bg-white rounded-xl shadow-sm border border-green-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-green-600" />Payout Estimate</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-gray-400">Deductible</p><p className="font-bold">${claim.insurancePayout.deductible.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-400">Covered</p><p className="font-bold">${claim.insurancePayout.coveredAmount.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-400">Payout</p><p className="font-bold text-green-600">${claim.insurancePayout.estimatedPayout.toLocaleString()}</p></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Images */}
      {claim.images?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-3">Claim Images ({claim.images.length})</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {claim.images.map((img: any) => (
              <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                <img src={img.filePath} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">{img.type === 'FULL_VEHICLE' ? 'Full' : 'Dmg'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Documents Review</h2>
        {(!claim.documents || claim.documents.length === 0)
          ? <p className="text-sm text-gray-400">No documents uploaded by user yet.</p>
          : (
            <div className="space-y-3">
              {claim.documents.map((doc: any) => {
                const da = docAction[doc.id] || { loading: false, rejectInput: false, reason: '' };
                return (
                  <div key={doc.id} className="flex flex-wrap items-center gap-4 p-3 border border-gray-200 rounded-lg">
                    <img src={doc.filePath} alt="" className="h-14 w-20 object-cover rounded border border-gray-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{doc.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-400">{new Date(doc.uploadedAt).toLocaleString()}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${docVerifColors[doc.verificationStatus]}`}>{doc.verificationStatus}</span>
                    </div>

                    {da.rejectInput && (
                      <div className="flex gap-2 flex-1 min-w-48">
                        <input value={da.reason} onChange={(e) => setDocAction((p) => ({ ...p, [doc.id]: { ...p[doc.id], reason: e.target.value } }))}
                          placeholder="Rejection reason..." className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-400 outline-none" />
                        <button onClick={() => handleRejectDoc(doc.id)} disabled={da.loading}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                          {da.loading ? '...' : 'Confirm'}
                        </button>
                        <button onClick={() => setDocAction((p) => ({ ...p, [doc.id]: { ...p[doc.id], rejectInput: false } }))}
                          className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-xs">Cancel</button>
                      </div>
                    )}

                    {!da.rejectInput && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveDoc(doc.id)} disabled={da.loading || doc.verificationStatus === 'VERIFIED'}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 transition">
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button onClick={() => setDocAction((p) => ({ ...p, [doc.id]: { loading: false, rejectInput: true, reason: '' } }))}
                          disabled={da.loading}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-40 transition">
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
    </div>
  );
}
