import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { ArrowLeft, Shield, CheckCircle, XCircle, ThumbsUp, ThumbsDown, Clock, StickyNote, Trash2, Plus, Wrench, RefreshCw, CircleDollarSign, ChevronDown, AlertTriangle, MessageSquare, Send } from 'lucide-react';
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const [finalValueDraft, setFinalValueDraft] = useState('');
  const [finalValueSaving, setFinalValueSaving] = useState(false);
  const [finalValueError, setFinalValueError] = useState('');
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState('');
  const [fraudExpanded, setFraudExpanded] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [msgSent, setMsgSent] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileError, setReconcileError] = useState('');
  const [reconcileExpanded, setReconcileExpanded] = useState(false);

  const fetchClaim = () =>
    adminApi.get(`/claims/${id}`).then((r) => {
      setClaim(r.data);
      setNewStatus(r.data.status);
      setFinalValueDraft(r.data.finalClaimableValue != null ? String(r.data.finalClaimableValue) : '');
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

  // Sets (or clears) the insurer's final claimable value — the confirmed payout for this claim
  const handleSetFinalValue = async (clear: boolean) => {
    const raw = finalValueDraft.trim();
    if (!clear) {
      const value = Number(raw);
      if (raw === '' || Number.isNaN(value) || value < 0) {
        setFinalValueError('Enter a non-negative amount.');
        return;
      }
    }
    setFinalValueSaving(true);
    setFinalValueError('');
    try {
      await adminApi.patch(`/claims/${id}/final-value`, clear ? { finalClaimableValue: null } : { finalClaimableValue: Number(raw) });
      await fetchClaim();
    } catch (err: any) {
      setFinalValueError(err.response?.data?.error || 'Failed to set final claimable value.');
    } finally { setFinalValueSaving(false); }
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
    }
  };

  const handleRescore = async () => {
    setScoring(true);
    setScoreError('');
    try {
      await adminApi.post(`/claims/${id}/fraud-score`);
      await fetchClaim();
    } catch {
      setScoreError('Failed to calculate fraud score.');
    } finally {
      setScoring(false);
    }
  };

  const handleSendMessage = async () => {
    if (!msgBody.trim() || !claim?.user?.id) return;
    setMsgSending(true);
    setMsgError('');
    try {
      await adminApi.post('/notifications', {
        userId: claim.user.id,
        claimId: id,
        title: msgTitle.trim() || 'Message from admin',
        message: msgBody.trim(),
      });
      setMsgTitle('');
      setMsgBody('');
      setMsgSent(true);
      setTimeout(() => setMsgSent(false), 3000);
    } catch {
      setMsgError('Failed to send message.');
    } finally {
      setMsgSending(false);
    }
  };

  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileError('');
    try {
      await adminApi.post(`/claims/${id}/reconcile`);
      await fetchClaim();
    } catch {
      setReconcileError('Failed to reconcile estimates.');
    } finally {
      setReconciling(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400"></div></div>;
  if (!claim) return null;

  // Menu entries for the single blue Claim Actions dropdown (replaces the old colored button row)
  const actionItems: { icon: typeof ThumbsUp; label: string; disabled: boolean; title?: string; action: () => void }[] = [
    { icon: ThumbsUp, label: claim.status === 'APPROVED' ? 'Already Approved' : 'Approve Claim', disabled: statusSaving || claim.status === 'APPROVED', action: () => handleQuickStatus('APPROVED') },
    { icon: ThumbsDown, label: claim.status === 'REJECTED' ? 'Already Rejected' : 'Reject Claim', disabled: statusSaving || claim.status === 'REJECTED', action: () => handleQuickStatus('REJECTED') },
    { icon: Clock, label: 'Mark Under Review', disabled: statusSaving || claim.status === 'UNDER_REVIEW', action: () => handleQuickStatus('UNDER_REVIEW') },
    { icon: CheckCircle, label: 'Mark Completed', disabled: statusSaving || claim.status === 'COMPLETED', action: () => handleQuickStatus('COMPLETED') },
    {
      icon: RefreshCw,
      label: analyzing ? 'Analyzing...' : 'Re-analyze Damage',
      disabled: analyzing || claim.images?.length === 0,
      title: claim.images?.length === 0 ? 'No images to analyze' : "Re-run the AI damage analysis on this claim's photos",
      action: handleReanalyze,
    },
  ];

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

        {/* Fraud Risk Panel */}
        {(() => {
          const scored = claim.fraudScoredAt != null;
          const score = claim.fraudScore ?? 0;
          const flags: Array<{ signal: string; points: number; detail: string }> = Array.isArray(claim.fraudFlags) ? claim.fraudFlags : [];
          const tier = !scored ? 'NONE' : score <= 30 ? 'LOW' : score <= 60 ? 'MEDIUM' : 'HIGH';
          const tierStyle: Record<string, { bg: string; border: string; text: string; chip: string }> = {
            NONE:   { bg: 'bg-gray-50',  border: 'border-gray-200',  text: 'text-gray-600',  chip: 'bg-gray-200 text-gray-700' },
            LOW:    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', chip: 'bg-green-600 text-white' },
            MEDIUM: { bg: 'bg-yellow-50',border: 'border-yellow-200',text: 'text-yellow-800',chip: 'bg-yellow-500 text-white' },
            HIGH:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-800',   chip: 'bg-red-600 text-white' },
          };
          const s = tierStyle[tier];
          const Icon = tier === 'HIGH' ? AlertTriangle : tier === 'MEDIUM' ? Clock : CheckCircle;
          const scoredAt = claim.fraudScoredAt ? new Date(claim.fraudScoredAt).toLocaleString() : null;
          return (
            <div className={`mb-5 rounded-xl border ${s.border} ${s.bg} p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${s.chip}`}>{tier}</span>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${s.text}`} />
                    <span className={`text-sm font-semibold ${s.text}`}>
                      {scored ? `Fraud risk: ${score}/100` : 'Not yet scored'}
                    </span>
                  </div>
                  {scoredAt && <span className="text-xs text-gray-500 hidden sm:inline">scored {scoredAt}</span>}
                </div>
                <button
                  onClick={handleRescore}
                  disabled={scoring}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${scoring ? 'animate-spin' : ''}`} />
                  {scoring ? 'Scoring...' : scored ? 'Re-score' : 'Score now'}
                </button>
              </div>
              {scoreError && <p className="text-xs text-red-600 mt-2">{scoreError}</p>}
              {flags.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setFraudExpanded((v) => !v)}
                    className={`text-xs font-medium ${s.text} hover:underline`}
                  >
                    {fraudExpanded ? 'Hide' : 'Show'} {flags.length} flag{flags.length === 1 ? '' : 's'}
                  </button>
                  {fraudExpanded && (
                    <ul className="mt-2 space-y-1">
                      {flags.map((f, i) => (
                        <li key={i} className={`text-xs ${s.text} flex items-start gap-2`}>
                          <span className="shrink-0 mt-0.5 font-semibold bg-white/60 rounded px-1.5 py-0.5">+{f.points}</span>
                          <span>{f.detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        <p className="text-sm text-gray-600 mb-5">{claim.incidentDescription}</p>

        {/* Claim Actions — one blue dropdown instead of a row of colored buttons */}
        <div className="relative mb-4">
          <button
            onClick={() => setActionsOpen((v) => !v)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition shadow-sm"
          >
            <Shield className="h-4 w-4" /> Claim Actions
            <ChevronDown className={`h-4 w-4 transition-transform ${actionsOpen ? 'rotate-180' : ''}`} />
          </button>
          {actionsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
              <div className="absolute left-0 z-20 mt-2 w-64 rounded-xl border border-primary-100 bg-white py-1.5 shadow-lg shadow-primary-600/10">
                {actionItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setActionsOpen(false); item.action(); }}
                    disabled={item.disabled}
                    title={item.title}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${item.icon === RefreshCw && analyzing ? 'animate-spin' : ''}`} />
                    {item.label}
                  </button>
                ))}
                {/* Destructive action — same blue theme, separated by a divider */}
                <div className="my-1.5 border-t border-primary-100" />
                <button
                  onClick={() => {
                    setActionsOpen(false);
                    if (window.confirm('Delete this claim and all its data permanently?')) handleDeleteClaim();
                  }}
                  disabled={deleting}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  {deleting ? 'Deleting...' : 'Delete Claim'}
                </button>
              </div>
            </>
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
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Wrench className="h-4 w-4" />
                </div>
                AI Repair Estimate
              </h2>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Parts</p>
                  <p className="text-sm font-bold text-blue-900">Rs. {claim.repairEstimate.totalPartsCost.toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-purple-500 font-medium uppercase tracking-wide">Labor</p>
                  <p className="text-sm font-bold text-purple-900">Rs. {claim.repairEstimate.totalLaborCost.toLocaleString()}</p>
                </div>
                <div className="bg-primary-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-primary-500 font-medium uppercase tracking-wide">Total</p>
                  <p className="text-sm font-bold text-primary-900">Rs. {claim.repairEstimate.totalCost.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-green-500 font-medium uppercase tracking-wide">Days</p>
                  <p className="text-sm font-bold text-green-900">{claim.repairEstimate.estimatedDays}</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left font-medium">Damage</th>
                      <th className="px-3 py-2 text-left font-medium">Part</th>
                      <th className="px-3 py-2 text-right font-medium">Parts</th>
                      <th className="px-3 py-2 text-right font-medium">Labor</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(claim.repairEstimate.items as any[]).map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition">
                        <td className="px-3 py-2.5 capitalize text-gray-600">{item.damageType?.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2.5 text-gray-800 font-medium">{item.partName}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">Rs. {item.partCost?.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{item.laborHours}h × Rs. {item.laborRate?.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-900">Rs. {item.subtotal?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50/60 font-semibold">
                      <td className="px-3 py-2.5 text-blue-800" colSpan={4}>Total</td>
                      <td className="px-3 py-2.5 text-right text-blue-900">Rs. {claim.repairEstimate.totalCost.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
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
          {/* Final Claimable Value — the insurer's confirmed amount; overrides the computed estimate */}
          <div className="bg-white rounded-xl shadow-sm border border-green-300 p-5">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2 flex-wrap">
              <CircleDollarSign className="h-4 w-4 text-green-600" /> Final Claimable Value
              {claim.finalClaimableValue != null && (
                <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-600 text-white">Confirmed</span>
              )}
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              The final amount the insurer pays for this claim. Once saved it overrides the computed estimate and is shown to the customer as the confirmed payout.
            </p>
            {claim.finalClaimableValue != null && (
              <div className="flex items-center justify-between p-3 bg-green-600 rounded-lg mb-3">
                <p className="text-xs text-green-50 font-semibold uppercase tracking-wide">
                  Final value{claim.finalValueSetAt ? ` · set ${new Date(claim.finalValueSetAt).toLocaleDateString()}` : ''}
                </p>
                <p className="text-xl font-bold text-white">Rs. {claim.finalClaimableValue.toLocaleString()}</p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">Rs.</span>
                <input type="number" min={0} value={finalValueDraft} onChange={(e) => setFinalValueDraft(e.target.value)}
                  placeholder={claim.insurancePayout ? String(claim.insurancePayout.estimatedPayout) : '0'}
                  className="w-40 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <button onClick={() => handleSetFinalValue(false)} disabled={finalValueSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition">
                {finalValueSaving ? 'Saving...' : claim.finalClaimableValue != null ? 'Update Final Value' : 'Set Final Value'}
              </button>
              {claim.finalClaimableValue != null && (
                <button onClick={() => handleSetFinalValue(true)} disabled={finalValueSaving}
                  className="px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition">
                  Clear
                </button>
              )}
            </div>
            {finalValueError && <p className="text-xs text-red-600 mt-2">{finalValueError}</p>}
          </div>
        </div>
      </div>

      {/* Garage Estimate Section */}
      {claim.garage && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Wrench className="h-4 w-4" />
            </div>
            Garage: {claim.garage.name}
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
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Estimate Submitted</span>
                <span className="text-xs text-gray-500">{new Date(claim.garageEstimate.estimateDate ?? claim.garageEstimate.submittedAt).toLocaleDateString()}</span>
              </div>
              {claim.repairEstimate && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">AI Estimate</p>
                    <p className="text-sm font-bold text-blue-900">Rs. {claim.repairEstimate.totalCost.toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-orange-500 font-medium uppercase tracking-wide">Garage</p>
                    <p className="text-sm font-bold text-orange-900">Rs. {claim.garageEstimate.totalCost.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 text-center ${claim.garageEstimate.totalCost > claim.repairEstimate.totalCost ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className={`text-[10px] font-medium uppercase tracking-wide ${claim.garageEstimate.totalCost > claim.repairEstimate.totalCost ? 'text-red-500' : 'text-green-500'}`}>Difference</p>
                    <p className={`text-sm font-bold ${claim.garageEstimate.totalCost > claim.repairEstimate.totalCost ? 'text-red-700' : 'text-green-700'}`}>
                      Rs. {(claim.garageEstimate.totalCost - claim.repairEstimate.totalCost).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Days</p>
                    <p className="text-sm font-bold text-gray-900">{claim.garageEstimate.estimatedDays}</p>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Part</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {gItems.parts.map((part, i) => (
                      <tr key={i} className={`transition ${part.addedByGarage ? 'bg-orange-50/50' : 'hover:bg-gray-50/50'}`}>
                        <td className="px-3 py-2.5 capitalize text-gray-600">
                          {part.damageType?.replace(/_/g, ' ')}
                          {part.addedByGarage && <span className="ml-1.5 text-[10px] font-medium text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">added</span>}
                        </td>
                        <td className="px-3 py-2.5 text-gray-800 font-medium">{part.partName}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-gray-900">Rs. {part.partCost?.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-purple-50/60">
                      <td className="px-3 py-2.5 font-medium text-purple-800">Labor</td>
                      <td className="px-3 py-2.5 text-purple-600">{gItems.laborHours}h × Rs. {gItems.laborRate.toLocaleString()}/h</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-purple-900">Rs. {gTotals.laborCost.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-sky-50/60">
                      <td className="px-3 py-2.5 font-medium text-sky-800">Paint & Materials</td>
                      <td className="px-3 py-2.5 text-sky-600">—</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-sky-900">Rs. {gItems.paintMaterials.toLocaleString()}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-orange-50/60 font-semibold">
                      <td className="px-3 py-2.5 text-orange-800" colSpan={2}>Total</td>
                      <td className="px-3 py-2.5 text-right text-orange-900">Rs. {gTotals.totalCost.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {claim.garageEstimate.notes && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <StickyNote className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">{claim.garageEstimate.notes}</p>
                </div>
              )}
            </>
            ) : (
              <p className="text-sm text-gray-400">Garage has not submitted an estimate yet.</p>
            );
          })()}
        </div>
      )}

      {/* Garage vs AI Estimate Reconciliation */}
      {claim.garageEstimate && claim.repairEstimate && (() => {
        const scored = claim.reconciledAt != null;
        const score = claim.reconciliationScore ?? 0;
        const flags: Array<{ type: string; severity: string; detail: string; aiAmount: number | null; garageAmount: number | null }> =
          Array.isArray(claim.reconciliationResult) ? (claim.reconciliationResult as any).flags ?? [] :
          (claim.reconciliationResult as any)?.flags ?? [];
        const aiTotal = claim.repairEstimate.totalCost;
        const garageTotal = claim.garageEstimate.totalCost;
        const diff = garageTotal - aiTotal;
        const diffPct = aiTotal > 0 ? Math.round((diff / aiTotal) * 100) : 0;

        const tierStyle: Record<string, { bg: string; border: string; text: string; chip: string }> = {
          NONE:   { bg: 'bg-gray-50',  border: 'border-gray-200',  text: 'text-gray-600',  chip: 'bg-gray-200 text-gray-700' },
          LOW:    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', chip: 'bg-green-600 text-white' },
          MEDIUM: { bg: 'bg-yellow-50',border: 'border-yellow-200',text: 'text-yellow-800',chip: 'bg-yellow-500 text-white' },
          HIGH:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-800',   chip: 'bg-red-600 text-white' },
        };
        const tier = !scored ? 'NONE' : score <= 30 ? 'LOW' : score <= 60 ? 'MEDIUM' : 'HIGH';
        const s = tierStyle[tier];
        const Icon = tier === 'HIGH' ? AlertTriangle : tier === 'MEDIUM' ? Clock : CheckCircle;
        const reconciledAt = claim.reconciledAt ? new Date(claim.reconciledAt).toLocaleString() : null;

        const flagTypeLabel: Record<string, string> = {
          OVERCHARGE: 'Overcharge',
          MISSED_DAMAGE: 'Missed Damage',
          PRICE_OUTLIER: 'Price Outlier',
          EXTRA_ITEM: 'Extra Item',
          LABOR_DISCREPANCY: 'Labor Mismatch',
        };
        const flagTypeColor: Record<string, string> = {
          OVERCHARGE: 'bg-red-100 text-red-700',
          MISSED_DAMAGE: 'bg-amber-100 text-amber-700',
          PRICE_OUTLIER: 'bg-orange-100 text-orange-700',
          EXTRA_ITEM: 'bg-blue-100 text-blue-700',
          LABOR_DISCREPANCY: 'bg-purple-100 text-purple-700',
        };

        return (
          <div className={`rounded-xl border ${s.border} ${s.bg} p-5 mb-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${s.text}`} />
                <h2 className={`font-semibold ${s.text}`}>Estimate Reconciliation</h2>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${s.chip}`}>{tier}</span>
              </div>
              <button
                onClick={handleReconcile}
                disabled={reconciling}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reconciling ? 'animate-spin' : ''}`} />
                {reconciling ? 'Analyzing...' : scored ? 'Re-analyze' : 'Analyze now'}
              </button>
            </div>

            {reconcileError && <p className="text-xs text-red-600 mb-2">{reconcileError}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/60 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-blue-600 font-medium">AI Estimate</p>
                <p className="text-sm font-bold text-blue-900">Rs. {aiTotal.toLocaleString()}</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-orange-600 font-medium">Garage Estimate</p>
                <p className="text-sm font-bold text-orange-900">Rs. {garageTotal.toLocaleString()}</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-gray-600 font-medium">Difference</p>
                <p className={`text-sm font-bold ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {diff > 0 ? '+' : ''}Rs. {diff.toLocaleString()} ({diffPct > 0 ? '+' : ''}{diffPct}%)
                </p>
              </div>
              <div className="bg-white/60 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-gray-600 font-medium">Divergence Score</p>
                <p className={`text-sm font-bold ${s.text}`}>{scored ? `${score}/100` : 'Not scored'}</p>
              </div>
            </div>

            {scored && reconciledAt && (
              <p className="text-xs text-gray-500 mb-3">Analyzed {reconciledAt}</p>
            )}

            {claim.reconciliationSummary && (
              <p className={`text-sm ${s.text} mb-3 p-3 bg-white/50 rounded-lg`}>{claim.reconciliationSummary}</p>
            )}

            {flags.length > 0 && (
              <div>
                <button
                  onClick={() => setReconcileExpanded((v) => !v)}
                  className={`text-xs font-medium ${s.text} hover:underline`}
                >
                  {reconcileExpanded ? 'Hide' : 'Show'} {flags.length} flag{flags.length === 1 ? '' : 's'}
                </button>
                {reconcileExpanded && (
                  <ul className="mt-2 space-y-2">
                    {flags.map((f, i) => (
                      <li key={i} className="p-3 bg-white/70 rounded-lg border border-white">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${flagTypeColor[f.type] ?? 'bg-gray-200 text-gray-700'}`}>
                            {flagTypeLabel[f.type] ?? f.type}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            f.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                            f.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{f.severity}</span>
                        </div>
                        <p className={`text-sm ${s.text}`}>{f.detail}</p>
                        {(f.aiAmount != null || f.garageAmount != null) && (
                          <div className="mt-1.5 flex gap-3 text-xs text-gray-500">
                            {f.aiAmount != null && <span>AI: Rs. {f.aiAmount.toLocaleString()}</span>}
                            {f.garageAmount != null && <span>Garage: Rs. {f.garageAmount.toLocaleString()}</span>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })()}

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

      {/* Send Message to Policyholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary-600" /> Message Policyholder
          </h2>
          <button
            onClick={() => setMsgOpen((v) => !v)}
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            {msgOpen ? 'Close' : 'Compose'}
          </button>
        </div>
        {msgOpen && (
          <div className="mt-4 space-y-3">
            <div className="text-xs text-gray-500">
              To: <span className="font-medium text-gray-700">{claim.user?.firstName} {claim.user?.lastName}</span>
              {' · '}Re: <span className="font-medium text-gray-700">{claim.vehicle?.make} {claim.vehicle?.model} {claim.vehicle?.year}</span>
            </div>
            <input
              value={msgTitle}
              onChange={(e) => setMsgTitle(e.target.value)}
              placeholder="Subject (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Write your message to the policyholder..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-y"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleSendMessage}
                disabled={msgSending || !msgBody.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition"
              >
                <Send className="h-4 w-4" /> {msgSending ? 'Sending...' : 'Send Message'}
              </button>
              {msgSent && <span className="text-xs font-medium text-green-600">Message sent</span>}
              {msgError && <span className="text-xs font-medium text-red-600">{msgError}</span>}
            </div>
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
