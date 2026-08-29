import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { Claim, DamageItem } from '../types';
import { ArrowLeft, AlertTriangle, RefreshCw, Upload, Send, Shield, MessageSquare, ListTodo, CheckCircle2, Circle, Clock, XCircle, BadgeCheck, StickyNote, Camera, Wrench, X, MapPin, Info, Check, FolderOpen, Trash2 } from 'lucide-react';
import { uploadUrl } from '../utils/uploadUrl';
import { normalizeGarageItems, estimateTotals } from '../utils/garageEstimate';

export function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [docUploading, setDocUploading] = useState('');
  const [garageModal, setGarageModal] = useState(false);
  const [garageList, setGarageList] = useState<any[]>([]);
  const [garagePick, setGaragePick] = useState('');
  const [garageSaving, setGarageSaving] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [newImageType, setNewImageType] = useState<'FULL_VEHICLE' | 'DAMAGE_CLOSEUP'>('FULL_VEHICLE');
  const [reanalyzeAt, setReanalyzeAt] = useState(0);
  const [analyzeError, setAnalyzeError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [retryIn, setRetryIn] = useState(0);
  const pollStartRef = useRef<number>(0);
  const retryCountRef = useRef(0);

  const fetchClaim = async () => {
    try {
      const res = await api.get(`/claims/${id}`);
      setClaim(res.data);
    } catch { navigate('/claims'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    retryCountRef.current = 0;
    setAnalyzeError(null);
    setRetryIn(0);
    fetchClaim();
  }, [id]);

  // Background AI analysis runs right after claim submission — poll until the result appears
  const analysisPending = !!claim && claim.status !== 'DRAFT' && (claim.images?.length || 0) > 0 && !claim.damageAssessment && !analyzeError;

  useEffect(() => {
    if (!analysisPending) { pollStartRef.current = 0; return; }
    if (pollStartRef.current === 0) pollStartRef.current = Date.now();
    if (Date.now() - pollStartRef.current > 120000) {
      // The submit-time analysis never landed — say so instead of spinning forever
      setAnalyzeError({ message: 'AI analysis did not complete — the AI service may be unavailable right now.', retryable: true });
      return;
    }
    const timer = setTimeout(() => { fetchClaim(); }, 5000);
    return () => clearTimeout(timer);
  }, [claim, analysisPending]);

  // Re-analysis triggered after image edits — poll until a newer assessment lands
  const reanalyzing = reanalyzeAt > 0
    && Date.now() - reanalyzeAt <= 180000
    && !!claim?.damageAssessment
    && new Date(claim.damageAssessment.assessedAt).getTime() <= reanalyzeAt;

  useEffect(() => {
    if (!reanalyzing) return;
    const timer = setTimeout(() => { fetchClaim(); }, 5000);
    return () => clearTimeout(timer);
  }, [reanalyzing, claim]);

  const openGarageModal = () => {
    setGaragePick(claim?.garage?.id || '');
    setGarageModal(true);
    if (garageList.length === 0) {
      api.get('/claims/garages').then((r) => setGarageList(r.data)).catch(() => alert('Failed to load garages.'));
    }
  };

  const handleGarageSave = async () => {
    if (!garagePick || !id) return;
    setGarageSaving(true);
    try {
      await api.patch(`/claims/${id}/garage`, { garageId: garagePick });
      setGarageModal(false);
      await fetchClaim();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update garage.');
    } finally {
      setGarageSaving(false);
    }
  };

  const handleAnalyze = async (auto = false) => {
    if (!id) return;
    if (!auto) retryCountRef.current = 0; // a manual retry earns a fresh auto-retry budget
    setAnalyzeError(null);
    setAnalyzing(true);
    // Fresh windows for the pending spinner and the re-analysis poll
    pollStartRef.current = Date.now();
    if (claim?.damageAssessment) setReanalyzeAt(Date.now());
    try {
      await api.post(`/claims/${id}/analyze`);
      retryCountRef.current = 0;
      await fetchClaim();
    } catch (err: any) {
      setReanalyzeAt(0);
      const detail = err.response?.data?.error;
      setAnalyzeError({
        message: detail || 'AI analysis failed — the AI service may be unavailable right now.',
        // 400s are precondition problems (e.g. no readable images) — retrying won't help
        retryable: err.response?.status !== 400,
      });
    } finally { setAnalyzing(false); }
  };

  // "Reanalyze soon": after a failed analysis, retry automatically (max twice),
  // then keep the banner with a manual Retry button.
  useEffect(() => {
    if (!analyzeError?.retryable) { setRetryIn(0); return; }
    if (retryCountRef.current >= 2) return;
    setRetryIn(30);
    const tick = setInterval(() => setRetryIn((s) => Math.max(0, s - 1)), 1000);
    const timer = setTimeout(() => {
      retryCountRef.current += 1;
      handleAnalyze(true);
    }, 30000);
    return () => { clearInterval(tick); clearTimeout(timer); };
  }, [analyzeError]);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploading(docType);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', docType);
    try {
      await api.post(`/claims/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchClaim();
    } catch { alert('Upload failed'); }
    finally { setDocUploading(''); }
  };

  const handleVerify = async (docId: string) => {
    try {
      await api.post(`/claims/${id}/documents/${docId}/verify`);
      await fetchClaim();
    } catch { alert('Verification failed'); }
  };

  // After images change, re-run the AI assessment in the background so the damage report
  // (and the estimate derived from it) stays in sync — visible to the user, admin and garage.
  const triggerReanalysis = () => {
    setAnalyzeError(null);
    pollStartRef.current = Date.now();
    setReanalyzeAt(Date.now());
    api.post(`/claims/${id}/analyze`).catch(() => {
      setReanalyzeAt(0);
      setAnalyzeError({ message: 'AI re-analysis failed — the previous assessment is still shown.', retryable: true });
    });
  };

  const shouldReanalyze = !!(claim && (claim.status !== 'DRAFT' || claim.damageAssessment));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setImgUploading(true);
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    formData.append('imageType', newImageType);
    try {
      await api.post(`/claims/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchClaim();
      if (shouldReanalyze) triggerReanalysis();
    } catch { alert('Upload failed'); }
    finally { setImgUploading(false); }
  };

  const handleImageDelete = async (imageId: string) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await api.delete(`/claims/${id}/images/${imageId}`);
      await fetchClaim();
      if (shouldReanalyze) triggerReanalysis();
    } catch { alert('Failed to delete image'); }
  };

  const handleChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatLoading(true);
    try {
      await api.post(`/claims/${id}/chat`, { message: chatInput });
      setChatInput('');
      await fetchClaim();
    } catch { alert('Chat failed'); }
    finally { setChatLoading(false); }
  };

  const quickMessages = ["What's my claim status?", "Explain the estimate", "What documents do I need?"];

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', GARAGE_REVIEW: 'bg-orange-100 text-orange-700',
    GARAGE_ESTIMATED: 'bg-purple-100 text-purple-700', APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-green-100 text-green-700',
  };

  const severityBg: Record<string, string> = { MINOR: 'bg-green-100 text-green-700', MODERATE: 'bg-yellow-100 text-yellow-700', SEVERE: 'bg-red-100 text-red-700' };

  // --- Claim progress todo steps ---
  const todoSteps = useMemo(() => {
    if (!claim) return [];
    const docs = claim.documents || [];
    const hasImages = (claim.images?.length || 0) > 0;
    const hasDamage = !!claim.damageAssessment;
    const hasEstimate = !!claim.repairEstimate;
    const allDocsVerified = docs.length > 0 && docs.every((d) => d.verificationStatus === 'VERIFIED');
    const anyDocIssue = docs.some((d) => ['ISSUES_FOUND', 'UNREADABLE'].includes(d.verificationStatus));
    const hasGarage = !!claim.garage;
    const hasGarageEstimate = !!claim.garageEstimate;
    const submitted = !['DRAFT'].includes(claim.status);
    const approved = ['APPROVED', 'COMPLETED'].includes(claim.status);
    const completed = claim.status === 'COMPLETED';

    return [
      { label: 'Claim created', done: true, issue: false },
      { label: 'Vehicle photos uploaded', done: hasImages, issue: false },
      { label: 'Claim submitted for review', done: submitted, issue: false },
      { label: 'AI damage assessment complete', done: hasDamage, issue: false },
      { label: 'Repair estimate generated', done: hasEstimate, issue: false },
      { label: 'Garage selected', done: hasGarage, issue: false },
      { label: 'Garage assessment', done: hasGarageEstimate, issue: false },
      { label: 'Documents uploaded', done: docs.length > 0, issue: false },
      { label: 'Documents approved by insurance', done: allDocsVerified, issue: anyDocIssue },
      { label: 'Claim approved', done: approved, issue: claim.status === 'REJECTED' },
      { label: 'Claim completed & payout issued', done: completed, issue: false },
    ];
  }, [claim]);


  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;
  if (!claim) return null;

  // Garage can be selected/changed until the garage submits its estimate (or the claim is finalized)
  const canChangeGarage = !claim.garageEstimate && !['APPROVED', 'COMPLETED', 'REJECTED'].includes(claim.status);

  const garageItems = claim.garageEstimate ? normalizeGarageItems(claim.garageEstimate.items) : null;
  const garageTotals = garageItems ? estimateTotals(garageItems) : null;
  const aiItems = claim.repairEstimate ? normalizeGarageItems(claim.repairEstimate.items) : null;
  const aiTotals = aiItems ? estimateTotals(aiItems) : null;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <button onClick={() => navigate('/claims')} className="text-sm text-primary-600 hover:text-primary-700 mb-4 font-medium flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to Claims
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{claim.vehicle?.make} {claim.vehicle?.model} {claim.vehicle?.year}</h1>
            <p className="text-sm text-gray-500 mt-1">{claim.incidentLocation} - {new Date(claim.incidentDate).toLocaleDateString()}</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium self-start ${statusColors[claim.status]}`}>{claim.status.replace('_', ' ')}</span>
        </div>
        <p className="text-sm text-gray-600 mt-3">{claim.incidentDescription}</p>

        {/* Drivability Warning */}
        {claim.damageAssessment && claim.damageAssessment.overallSeverity === 'SEVERE' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Safety Warning</p>
              <p className="text-sm text-red-700">{claim.damageAssessment.drivabilityAssessment}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Claim Progress Checklist */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary-600" /> Claim Progress
            </h2>
            <ol className="space-y-2">
              {todoSteps.map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  {step.issue ? (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  ) : step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${
                    step.issue ? 'text-red-600 font-medium' :
                    step.done ? 'text-gray-600' :
                    'text-gray-700'
                  }`}>
                    {step.label}
                  </span>
                  {!step.done && !step.issue && (
                    <Clock className="h-3.5 w-3.5 text-gray-300 ml-auto flex-shrink-0" />
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Garage Selection & Garage Estimate */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600" /> {claim.garage ? `Garage: ${claim.garage.name}` : 'Garage'}
              </h2>
              {canChangeGarage && (
                <button onClick={openGarageModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 transition shrink-0">
                  <RefreshCw className="h-3.5 w-3.5" /> {claim.garage ? 'Change Garage' : 'Select Garage'}
                </button>
              )}
            </div>
            {claim.garage ? (
              <>
                <div className="p-3 bg-orange-50 rounded-lg mb-4">
                  <p className="text-sm text-gray-700">{claim.garage.address}, {claim.garage.city}</p>
                  <p className="text-sm text-gray-700">{claim.garage.phone}</p>
                </div>
                {claim.garageEstimate && garageItems && garageTotals ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Garage Estimate Submitted</span>
                      <span className="text-xs text-gray-500">{new Date(claim.garageEstimate.submittedAt).toLocaleString()}</span>
                    </div>
                    {claim.repairEstimate && (
                      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
                        <div className="text-center">
                          <p className="text-[10px] text-blue-600 font-medium">AI Estimate</p>
                          <p className="text-sm font-bold text-blue-900">Rs. {claim.repairEstimate.totalCost.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-orange-600 font-medium">Garage Estimate</p>
                          <p className="text-sm font-bold text-orange-900">Rs. {claim.garageEstimate.totalCost.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center"><p className="text-xs text-blue-600 font-medium">Parts</p><p className="text-lg font-bold text-blue-900">Rs. {claim.garageEstimate.totalPartsCost.toLocaleString()}</p></div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center"><p className="text-xs text-purple-600 font-medium">Labor</p><p className="text-lg font-bold text-purple-900">Rs. {garageTotals.laborCost.toLocaleString()}</p></div>
                      <div className="bg-sky-50 rounded-lg p-3 text-center"><p className="text-xs text-sky-600 font-medium">Paint</p><p className="text-lg font-bold text-sky-900">Rs. {garageItems.paintMaterials.toLocaleString()}</p></div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center"><p className="text-xs text-orange-600 font-medium">Total</p><p className="text-lg font-bold text-orange-900">Rs. {claim.garageEstimate.totalCost.toLocaleString()}</p></div>
                      <div className="bg-green-50 rounded-lg p-3 text-center"><p className="text-xs text-green-600 font-medium">Est. Days</p><p className="text-lg font-bold text-green-900">{claim.garageEstimate.estimatedDays}</p></div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                          <th className="pb-2">Damage Type</th><th className="pb-2">Part Name</th><th className="pb-2 text-right">Amount</th>
                        </tr></thead>
                        <tbody>
                          {garageItems.parts.map((part, i) => (
                            <tr key={i} className={`border-b border-gray-100 ${part.addedByGarage ? 'bg-orange-50' : ''}`}>
                              <td className="py-2 capitalize">{part.damageType.replace(/_/g, ' ')}{part.addedByGarage && <span className="text-[10px] text-orange-600 ml-1">(new)</span>}</td>
                              <td className="py-2">{part.partName}</td>
                              <td className="py-2 text-right font-medium">Rs. {part.partCost.toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="border-b border-gray-100 bg-purple-50">
                            <td className="py-2 font-medium text-purple-900">Labor</td>
                            <td className="py-2 text-gray-600">{garageItems.laborHours}h @ Rs. {garageItems.laborRate.toLocaleString()}/h</td>
                            <td className="py-2 text-right font-medium">Rs. {garageTotals.laborCost.toLocaleString()}</td>
                          </tr>
                          <tr className="border-b border-gray-100 bg-sky-50">
                            <td className="py-2 font-medium text-sky-900">Paint & Materials</td>
                            <td></td>
                            <td className="py-2 text-right font-medium">Rs. {garageItems.paintMaterials.toLocaleString()}</td>
                          </tr>
                          <tr className="font-semibold">
                            <td className="py-2" colSpan={2}>Total</td>
                            <td className="py-2 text-right">Rs. {garageTotals.totalCost.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {claim.garageEstimate.notes && <p className="text-sm text-gray-600 mt-3 p-2 bg-gray-50 rounded">{claim.garageEstimate.notes}</p>}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Garage is reviewing the AI assessment. Their estimate will appear here once submitted.</p>
                )}
              </>
            ) : (
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                <p className="text-sm font-medium text-gray-800">No garage selected yet</p>
                <p className="text-sm text-gray-600 mt-1">
                  Select a registered garage to inspect your vehicle and provide a repair estimate. You can select or change the garage at any time before the garage submits its estimate.
                </p>
                {canChangeGarage && (
                  <button onClick={openGarageModal}
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition">
                    <Wrench className="h-4 w-4" /> Select a Garage
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Damage Assessment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Damage Assessment</h2>
              <button onClick={() => handleAnalyze()} disabled={analyzing || analysisPending || reanalyzing || (claim.images?.length || 0) === 0}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                <RefreshCw className={`h-3.5 w-3.5 ${(analyzing || analysisPending || reanalyzing) ? 'animate-spin' : ''}`} /> {(analyzing || analysisPending || reanalyzing) ? 'Analyzing...' : claim.damageAssessment ? 'Re-analyze' : 'Analyze'}
              </button>
            </div>
            {reanalyzing && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                <p className="text-sm text-blue-700">Photos changed — AI is re-analyzing and updating the estimate. Results will appear here automatically.</p>
              </div>
            )}
            {analyzeError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800">AI is not working correctly right now</p>
                  <p className="text-xs text-red-600 mt-0.5">{analyzeError.message}</p>
                  {analyzeError.retryable && retryCountRef.current < 2 && retryIn > 0 && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Re-analyzing automatically in {retryIn}s…
                    </p>
                  )}
                </div>
                <button onClick={() => handleAnalyze()} disabled={analyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                  <RefreshCw className={`h-3.5 w-3.5 ${analyzing ? 'animate-spin' : ''}`} /> Retry now
                </button>
              </div>
            )}
            {claim.damageAssessment ? (
              <>
                <p className="text-xs text-gray-500 mb-4 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                  This damage assessment is AI-generated from your photos. It is a preliminary indication only — the final damage will be confirmed by the garage during inspection.
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${severityBg[claim.damageAssessment.overallSeverity]}`}>
                    Overall: {claim.damageAssessment.overallSeverity}
                  </span>
                  <span className="text-xs text-gray-500">Assessed: {new Date(claim.damageAssessment.assessedAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">{claim.damageAssessment.drivabilityAssessment}</p>
                <div className="space-y-2">
                  {(claim.damageAssessment.damages as DamageItem[]).map((d, i) => (
                    <div key={i} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 capitalize">{d.type.replace(/_/g, ' ')}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${severityBg[d.severity]}`}>{d.severity}</span>
                      </div>
                      <p className="text-xs text-gray-500">{d.location}</p>
                      <p className="text-sm text-gray-600 mt-1">{d.description}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : analysisPending ? (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                <p className="text-sm text-blue-700">AI is analyzing your photos. This may take a minute — results will appear here automatically.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No damage assessment yet. Click "Analyze" to run AI damage analysis.</p>
            )}
          </div>

          {/* Repair Estimate */}
          {claim.repairEstimate && aiItems && aiTotals && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Repair Estimate</h2>
              <p className="text-xs text-gray-500 mb-4 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                These values are preliminary AI estimates and are not final yet. The total may change after the garage inspects your vehicle.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center"><p className="text-xs text-blue-600 font-medium">Parts</p><p className="text-lg font-bold text-blue-900">Rs. {aiTotals.totalPartsCost.toLocaleString()}</p></div>
                <div className="bg-purple-50 rounded-lg p-3 text-center"><p className="text-xs text-purple-600 font-medium">Labor</p><p className="text-lg font-bold text-purple-900">Rs. {aiTotals.laborCost.toLocaleString()}</p></div>
                <div className="bg-sky-50 rounded-lg p-3 text-center"><p className="text-xs text-sky-600 font-medium">Paint</p><p className="text-lg font-bold text-sky-900">Rs. {aiItems.paintMaterials.toLocaleString()}</p></div>
                <div className="bg-primary-50 rounded-lg p-3 text-center"><p className="text-xs text-primary-600 font-medium">Total</p><p className="text-lg font-bold text-primary-900">Rs. {aiTotals.totalCost.toLocaleString()}</p></div>
                <div className="bg-green-50 rounded-lg p-3 text-center"><p className="text-xs text-green-600 font-medium">Est. Days</p><p className="text-lg font-bold text-green-900">{claim.repairEstimate.estimatedDays}</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                    <th className="pb-2">Damage Type</th><th className="pb-2">Part Name</th><th className="pb-2 text-right">Amount</th>
                  </tr></thead>
                  <tbody>
                    {aiItems.parts.map((part, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 capitalize">{part.damageType.replace(/_/g, ' ')}</td>
                        <td className="py-2">{part.partName}</td>
                        <td className="py-2 text-right font-medium">Rs. {part.partCost.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-gray-100 bg-purple-50">
                      <td className="py-2 font-medium text-purple-900">Labor</td>
                      <td className="py-2 text-gray-600">{aiItems.laborHours}h @ Rs. {aiItems.laborRate.toLocaleString()}/h</td>
                      <td className="py-2 text-right font-medium">Rs. {aiTotals.laborCost.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-sky-50">
                      <td className="py-2 font-medium text-sky-900">Paint & Materials</td>
                      <td></td>
                      <td className="py-2 text-right font-medium">Rs. {aiItems.paintMaterials.toLocaleString()}</td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="py-2" colSpan={2}>Total</td>
                      <td className="py-2 text-right">Rs. {aiTotals.totalCost.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['LICENSE', 'REGISTRATION', 'ACCIDENT_REPORT', 'REPAIR_ESTIMATE'].map((docType) => {
                const doc = claim.documents?.find((d) => d.type === docType);
                return (
                  <div key={docType} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">{docType.replace('_', ' ')}</span>
                      {doc && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          doc.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                          doc.verificationStatus === 'ISSUES_FOUND' ? 'bg-red-100 text-red-700' :
                          doc.verificationStatus === 'UNREADABLE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>{doc.verificationStatus}</span>
                      )}
                    </div>
                    {!doc ? (
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-primary-600 cursor-pointer hover:text-primary-700">
                          <Upload className="h-4 w-4" />
                          <span>Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDocUpload(e, docType)} disabled={docUploading === docType} />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-primary-600 cursor-pointer hover:text-primary-700">
                          <Camera className="h-4 w-4" />
                          <span>Camera</span>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleDocUpload(e, docType)} disabled={docUploading === docType} />
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <img src={uploadUrl(doc.filePath)} alt="" className="h-8 w-8 object-cover rounded" />
                        {doc.verificationStatus === 'PENDING' && (
                          <button onClick={() => handleVerify(doc.id)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Verify</button>
                        )}
                      </div>
                    )}
                    {doc && doc.verificationResult?.issues?.length > 0 && (
                      <div className="mt-2 text-[10px] text-red-600">{doc.verificationResult.issues[0]}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim Images ({claim.images?.length || 0})</h2>
            {claim.images?.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {claim.images.map((img) => (
                  <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                    <img src={uploadUrl(img.filePath)} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-full">{img.type === 'FULL_VEHICLE' ? 'Full' : 'Damage'}</span>
                    <button onClick={() => handleImageDelete(img.id)} title="Delete image"
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-red-600 transition">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No images uploaded</p>}

            {/* Add photos */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-2">
              <select value={newImageType} onChange={(e) => setNewImageType(e.target.value as 'FULL_VEHICLE' | 'DAMAGE_CLOSEUP')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                <option value="FULL_VEHICLE">Full vehicle</option>
                <option value="DAMAGE_CLOSEUP">Damage close-up</option>
              </select>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${imgUploading ? 'bg-primary-400 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                <Camera className="h-4 w-4" /> {imgUploading ? 'Uploading...' : 'Take Photo'}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={imgUploading} />
              </label>
              <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer transition">
                <FolderOpen className="h-4 w-4" /> Browse
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={imgUploading} />
              </label>
            </div>
          </div>

          {/* Insurance Payout — claim deducted from the policy */}
          {claim.insurancePayout && (() => {
            const payout = claim.insurancePayout!;
            // The garage estimate is the deduction basis once submitted; until then the AI estimate applies
            const baseTotal = claim.garageEstimate?.totalCost ?? claim.repairEstimate?.totalCost ?? 0;
            const basisLabel = claim.garageEstimate ? 'Garage estimate total' : 'Repair estimate total';
            const coveragePercent = claim.policy?.coveragePercent ?? 100;
            const afterDeductible = Math.max(0, baseTotal - payout.deductible);
            const valuation = claim.vehicle?.valuation ?? null;
            const capped = valuation != null && valuation > 0 && payout.coveredAmount >= valuation;
            return (
              <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" /> Insurance Payout Estimate
                  {claim.policy && (
                    <span className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                      {claim.policy.coverageType} · {coveragePercent}% cover
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 mb-4 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                  Your claim is deducted from this policy: the deductible is subtracted from the current estimate (garage estimate once submitted), then the plan's coverage percentage is applied. The final payout is confirmed by the insurance company after review.
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{basisLabel}</span>
                    <span className="font-medium text-gray-900">Rs. {baseTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Deductible</span>
                    <span className="font-medium text-red-600">− Rs. {payout.deductible.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">After deductible</span>
                    <span className="font-medium text-gray-900">Rs. {afterDeductible.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Policy coverage</span>
                    <span className="font-medium text-gray-900">× {coveragePercent}%</span>
                  </div>
                  {capped && valuation != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Vehicle valuation cap</span>
                      <span className="font-medium text-amber-600">max Rs. {valuation.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                  <div>
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Estimated Payout</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {coveragePercent}% of Rs. {afterDeductible.toLocaleString()} after deductible
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-green-700 shrink-0">Rs. {payout.estimatedPayout.toLocaleString()}</p>
                </div>
                {payout.notes && <p className="text-xs text-gray-500 mt-3">{payout.notes}</p>}
              </div>
            );
          })()}

          {/* Review Notes from Insurance */}
          {claim.adminNotes && claim.adminNotes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-blue-600" /> Review Notes from Insurance
              </h2>
              <div className="space-y-2">
                {claim.adminNotes.map((note) => (
                  <div key={note.id} className="p-3 border border-blue-100 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                        note.category === 'vehicle' ? 'bg-blue-200 text-blue-800' :
                        note.category === 'document' ? 'bg-purple-200 text-purple-800' :
                        'bg-gray-200 text-gray-700'
                      }`}>{note.category}</span>
                      <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Approved by Insurance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary-600" /> Documents Approved by Insurance
            </h2>
            {(!claim.documents || claim.documents.length === 0) ? (
              <p className="text-sm text-gray-500">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {['LICENSE', 'REGISTRATION', 'ACCIDENT_REPORT', 'REPAIR_ESTIMATE'].map((docType) => {
                  const doc = claim.documents?.find((d) => d.type === docType);
                  const statusIcon = !doc
                    ? <Circle className="h-4 w-4 text-gray-300" />
                    : doc.verificationStatus === 'VERIFIED'
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : doc.verificationStatus === 'ISSUES_FOUND' || doc.verificationStatus === 'UNREADABLE'
                    ? <XCircle className="h-4 w-4 text-red-500" />
                    : <Clock className="h-4 w-4 text-yellow-500" />;
                  const statusLabel = !doc ? 'Not uploaded'
                    : doc.verificationStatus === 'VERIFIED' ? 'Approved'
                    : doc.verificationStatus === 'ISSUES_FOUND' ? 'Issues found'
                    : doc.verificationStatus === 'UNREADABLE' ? 'Unreadable'
                    : 'Pending review';
                  const labelColor = !doc ? 'text-gray-400'
                    : doc.verificationStatus === 'VERIFIED' ? 'text-green-600'
                    : doc.verificationStatus === 'PENDING' ? 'text-yellow-600'
                    : 'text-red-600';
                  return (
                    <div key={docType} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        {statusIcon}
                        <span className="text-sm text-gray-700">{docType.replace(/_/g, ' ')}</span>
                      </div>
                      <span className={`text-xs font-medium ${labelColor}`}>{statusLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-4">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary-600" /> AI Assistant</h2>
            </div>
            <div className="h-80 overflow-y-auto p-4 space-y-3">
              {(!claim.chatMessages || claim.chatMessages.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-8">Ask me anything about your claim</p>
              )}
              {claim.chatMessages?.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
                    msg.role === 'USER' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {quickMessages.map((q) => (
                  <button key={q} onClick={() => { setChatInput(q); }} className="text-[10px] px-2 py-1 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">{q}</button>
                ))}
              </div>
              <form onSubmit={handleChat} className="flex gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask about your claim..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                <button type="submit" disabled={chatLoading || !chatInput.trim()}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Garage Selection Modal */}
      {garageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !garageSaving && setGarageModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{claim.garage ? 'Change Garage' : 'Select a Garage'}</h3>
              <button onClick={() => setGarageModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {garageList.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">Loading garages...</p>
              )}
              {garageList.map((g) => (
                <label key={g.id}
                  className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                    garagePick === g.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <input type="radio" name="garagePick" checked={garagePick === g.id} onChange={() => setGaragePick(g.id)} className="sr-only" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{g.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{g.address}, {g.city}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{g.phone}</p>
                  </div>
                  {garagePick === g.id && <Check className="h-5 w-5 text-orange-600 shrink-0" />}
                </label>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setGarageModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleGarageSave} disabled={!garagePick || garageSaving}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {garageSaving ? 'Saving...' : claim.garage ? 'Change Garage' : 'Select Garage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
