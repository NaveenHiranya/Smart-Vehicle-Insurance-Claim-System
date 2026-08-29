import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { ArrowLeft, Shield, CheckCircle, XCircle, ThumbsUp, ThumbsDown, Clock, StickyNote, Trash2, Plus, Wrench, RefreshCw } from 'lucide-react';
import { uploadUrl } from '../../utils/uploadUrl';
import { normalizeGarageItems, estimateTotals } from '../../utils/garageEstimate';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', GARAGE_REVIEW: 'bg-orange-100 text-orange-700',
  GARAGE_ESTIMATED: 'bg-purple-100 text-purple-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-green-100 text-green-700',
};
const severityBg: Record<string, string> = {
  MINOR: 'bg-green-100 text-green-700', MODERATE: 'bg-yellow-100 text-yellow-700', SEVERE: 'bg-red-100 text-red-700',
};
const docVerifColors: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-700', PENDING: 'bg-gray-100 text-gray-600',
  ISSUES_FOUND: 'bg-red-100 text-red-700', UNREADABLE: 'bg-red-100 text-red-700',
};
const ALL_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'GARAGE_REVIEW', 'GARAGE_ESTIMATED', 'APPROVED', 'REJECTED', 'COMPLETED'];

export function AdminClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [docAction, setDocAction] = useState<Record<string, { loading: boolean; rejectInput: boolean; reason: string }>>({});
  const [noteText, setNoteText] = useState('');
  const [noteCategory, setNoteCategory] = useState('general');
  const [noteSaving, setNoteSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    try {
      await adminApi.post(`/claims/${id}/notes`, { category: noteCategory, content: noteText.trim() });
      setNoteText('');
      await fetchClaim();
    } catch { alert('Failed to add note'); }
    finally { setNoteSaving(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      await adminApi.delete(`/notes/${noteId}`);
      await fetchClaim();
    } catch { alert('Failed to delete note'); }
  };

  const handleReanalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      await adminApi.post(`/claims/${id}/analyze`);
      await fetchClaim();
    } catch (err: any) {
      setAnalyzeError(err.response?.data?.error || 'AI damage analysis failed. Please try again.');
    } finally { setAnalyzing(false); }
  };

  const handleDeleteClaim = async () => {
    setDeleting(true);
    try {
      await adminApi.delete(`/claims/${id}`);
      navigate('/admin/claims');
    } catch {
      alert('Failed to delete claim');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400"></div></div>;
  if (!claim) return null;

  return (
    <div className="w-full">
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
          <button
            onClick={handleReanalyze}
            disabled={analyzing || claim.images?.length === 0}
            title={claim.images?.length === 0 ? 'No images to analyze' : "Re-run the AI damage analysis on this claim's photos"}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 transition shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Re-analyze Damage'}
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 border border-red-300 rounded-lg text-sm font-semibold hover:bg-red-50 transition shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              Delete Claim
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 font-medium">Delete claim and all its data permanently?</span>
              <button
                onClick={handleDeleteClaim}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {analyzing && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-center gap-3">
            <RefreshCw className="h-4 w-4 text-purple-600 animate-spin shrink-0" />
            <p className="text-sm text-purple-700">AI is re-analyzing the damage photos. This usually takes 5–30 seconds — results will appear automatically.</p>
          </div>
        )}
        {analyzeError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3">
            <p className="text-sm text-red-700">{analyzeError}</p>
            <button onClick={handleReanalyze} disabled={analyzing}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 whitespace-nowrap">
              Retry now
            </button>
          </div>
        )}

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
                <div className="bg-blue-50 rounded-lg p-2 text-center"><p className="text-xs text-blue-600">Parts</p><p className="font-bold text-blue-900">Rs. {claim.repairEstimate.totalPartsCost.toLocaleString()}</p></div>
                <div className="bg-purple-50 rounded-lg p-2 text-center"><p className="text-xs text-purple-600">Labor</p><p className="font-bold text-purple-900">Rs. {claim.repairEstimate.totalLaborCost.toLocaleString()}</p></div>
                <div className="bg-primary-50 rounded-lg p-2 text-center"><p className="text-xs text-primary-600">Total</p><p className="font-bold text-primary-900">Rs. {claim.repairEstimate.totalCost.toLocaleString()}</p></div>
                <div className="bg-green-50 rounded-lg p-2 text-center"><p className="text-xs text-green-600">Days</p><p className="font-bold text-green-900">{claim.repairEstimate.estimatedDays}</p></div>
              </div>
            </div>
          )}
          {claim.insurancePayout && (() => {
            const payout = claim.insurancePayout!;
            // The garage estimate is the deduction basis once submitted; until then the AI estimate applies
            const baseTotal = claim.garageEstimate?.totalCost ?? claim.repairEstimate?.totalCost ?? 0;
            const basisLabel = claim.garageEstimate ? 'Garage estimate total' : 'Repair estimate total';
            const coveragePercent = claim.policy?.coveragePercent ?? 100;
            const afterDeductible = Math.max(0, baseTotal - payout.deductible);
            return (
              <div className="bg-white rounded-xl shadow-sm border border-green-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 flex-wrap">
                  <Shield className="h-4 w-4 text-green-600" />Payout Estimate
                  {claim.policy && (
                    <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {claim.policy.coverageType} · {coveragePercent}% cover
                    </span>
                  )}
                </h2>
                <div className="space-y-1.5 text-sm mb-3">
                  <div className="flex justify-between"><span className="text-gray-400">{basisLabel}</span><span className="font-medium">Rs. {baseTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Deductible</span><span className="font-medium text-red-600">− Rs. {payout.deductible.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">After deductible</span><span className="font-medium">Rs. {afterDeductible.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Policy coverage</span><span className="font-medium">× {coveragePercent}%</span></div>
                  {claim.vehicle?.valuation != null && claim.vehicle.valuation > 0 && payout.coveredAmount >= claim.vehicle.valuation && (
                    <div className="flex justify-between"><span className="text-gray-400">Vehicle valuation cap</span><span className="font-medium text-amber-600">max Rs. {claim.vehicle.valuation.toLocaleString()}</span></div>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-700">Est. payout — {coveragePercent}% of Rs. {afterDeductible.toLocaleString()} after deductible</p>
                  <p className="font-bold text-green-700">Rs. {payout.estimatedPayout.toLocaleString()}</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Garage Estimate Section */}
      {claim.garage && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-600" /> Garage: {claim.garage.name}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-3 bg-orange-50 rounded-lg text-xs">
            <div><span className="text-gray-500">Owner:</span><br /><span className="font-medium">{claim.garage.ownerName}</span></div>
            <div><span className="text-gray-500">Phone:</span><br /><span className="font-medium">{claim.garage.phone}</span></div>
            <div><span className="text-gray-500">City:</span><br /><span className="font-medium">{claim.garage.city}</span></div>
            <div><span className="text-gray-500">License:</span><br /><span className="font-medium">{claim.garage.licenseNumber}</span></div>
          </div>
          {(() => {
            const gItems = claim.garageEstimate ? normalizeGarageItems(claim.garageEstimate.items) : null;
            const gTotals = gItems ? estimateTotals(gItems) : null;
            return claim.garageEstimate && gItems && gTotals ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Garage Estimate Submitted</span>
                <span className="text-xs text-gray-500">{new Date(claim.garageEstimate.submittedAt).toLocaleString()}</span>
              </div>
              {claim.repairEstimate && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-[10px] text-blue-600 font-medium">AI Estimate</p>
                    <p className="text-sm font-bold text-blue-900">Rs. {claim.repairEstimate.totalCost.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-orange-600 font-medium">Garage Estimate</p>
                    <p className="text-sm font-bold text-orange-900">Rs. {claim.garageEstimate.totalCost.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-600 font-medium">Difference</p>
                    <p className={`text-sm font-bold ${claim.garageEstimate.totalCost > claim.repairEstimate.totalCost ? 'text-red-600' : 'text-green-600'}`}>
                      Rs. {(claim.garageEstimate.totalCost - claim.repairEstimate.totalCost).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-600 font-medium">Garage Days</p>
                    <p className="text-sm font-bold text-gray-900">{claim.garageEstimate.estimatedDays}</p>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                    <th className="pb-2">Type</th><th className="pb-2">Part</th><th className="pb-2 text-right">Amount</th>
                  </tr></thead>
                  <tbody>
                    {gItems.parts.map((part, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${part.addedByGarage ? 'bg-orange-50' : ''}`}>
                        <td className="py-1.5 capitalize text-xs">{part.damageType?.replace(/_/g, ' ')}{part.addedByGarage && <span className="text-[10px] text-orange-600 ml-1">(added)</span>}</td>
                        <td className="py-1.5 text-xs">{part.partName}</td>
                        <td className="py-1.5 text-right font-medium text-xs">Rs. {part.partCost?.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-gray-100 bg-purple-50">
                      <td className="py-1.5 font-medium text-purple-900 text-xs">Labor</td>
                      <td className="py-1.5 text-xs text-gray-600">{gItems.laborHours}h @ Rs. {gItems.laborRate.toLocaleString()}/h</td>
                      <td className="py-1.5 text-right font-medium text-xs">Rs. {gTotals.laborCost.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-sky-50">
                      <td className="py-1.5 font-medium text-sky-900 text-xs">Paint & Materials</td>
                      <td></td>
                      <td className="py-1.5 text-right font-medium text-xs">Rs. {gItems.paintMaterials.toLocaleString()}</td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="py-1.5 text-xs" colSpan={2}>Total</td>
                      <td className="py-1.5 text-right text-xs">Rs. {gTotals.totalCost.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {claim.garageEstimate.notes && <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">{claim.garageEstimate.notes}</p>}
            </>
            ) : (
              <p className="text-sm text-gray-400">Garage has not submitted an estimate yet.</p>
            );
          })()}
        </div>
      )}

      {/* Images */}
      {claim.images?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-3">Claim Images ({claim.images.length})</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {claim.images.map((img: any) => (
              <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                <img src={uploadUrl(img.filePath)} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">{img.type === 'FULL_VEHICLE' ? 'Full' : 'Dmg'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Notes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary-600" /> Review Notes
        </h2>

        {/* Add note form */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none sm:w-36">
            <option value="general">General</option>
            <option value="vehicle">Vehicle</option>
            <option value="document">Document</option>
          </select>
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a review note..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
          />
          <button
            onClick={handleAddNote}
            disabled={noteSaving || !noteText.trim()}
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
          >
            <Plus className="h-4 w-4" /> {noteSaving ? 'Adding...' : 'Add Note'}
          </button>
        </div>

        {/* Existing notes */}
        {!claim.adminNotes || claim.adminNotes.length === 0 ? (
          <p className="text-sm text-gray-400">No review notes yet.</p>
        ) : (
          <div className="space-y-2">
            {claim.adminNotes.map((note: any) => (
              <div key={note.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                      note.category === 'vehicle' ? 'bg-blue-100 text-blue-700' :
                      note.category === 'document' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-200 text-gray-700'
                    }`}>{note.category}</span>
                    <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700">{note.content}</p>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition flex-shrink-0"
                  title="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
                    <img src={uploadUrl(doc.filePath)} alt="" className="h-14 w-20 object-cover rounded border border-gray-200 flex-shrink-0" />
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
