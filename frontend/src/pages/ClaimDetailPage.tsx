import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { Claim, DamageItem } from '../types';
import { ArrowLeft, AlertTriangle, RefreshCw, Upload, Send, Shield, MessageSquare, ListTodo, Lightbulb, CheckCircle2, Circle, Clock, XCircle, BadgeCheck, StickyNote } from 'lucide-react';
import { uploadUrl } from '../utils/uploadUrl';

export function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [docUploading, setDocUploading] = useState('');

  const fetchClaim = async () => {
    try {
      const res = await api.get(`/claims/${id}`);
      setClaim(res.data);
    } catch { navigate('/claims'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClaim(); }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await api.post(`/claims/${id}/analyze`);
      await fetchClaim();
    } catch (err) { alert('Analysis failed'); }
    finally { setAnalyzing(false); }
  };

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
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700',
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
    const submitted = !['DRAFT'].includes(claim.status);
    const approved = ['APPROVED', 'COMPLETED'].includes(claim.status);
    const completed = claim.status === 'COMPLETED';

    return [
      { label: 'Claim created', done: true, issue: false },
      { label: 'Vehicle photos uploaded', done: hasImages, issue: false },
      { label: 'Claim submitted for review', done: submitted, issue: false },
      { label: 'AI damage assessment complete', done: hasDamage, issue: false },
      { label: 'Repair estimate generated', done: hasEstimate, issue: false },
      { label: 'Documents uploaded', done: docs.length > 0, issue: false },
      { label: 'Documents approved by insurance', done: allDocsVerified, issue: anyDocIssue },
      { label: 'Claim approved', done: approved, issue: claim.status === 'REJECTED' },
      { label: 'Claim completed & payout issued', done: completed, issue: false },
    ];
  }, [claim]);

  // --- AI Suggestions based on claim state ---
  const suggestions = useMemo(() => {
    if (!claim) return [];
    const tips: { icon: string; text: string }[] = [];
    const docs = claim.documents || [];
    const docTypes = docs.map((d) => d.type);

    if (!claim.images || claim.images.length === 0)
      tips.push({ icon: '📷', text: 'Upload full-vehicle and close-up damage photos for a more accurate AI assessment.' });
    if (claim.images && claim.images.length > 0 && !claim.damageAssessment)
      tips.push({ icon: '🤖', text: 'Run AI damage analysis to get an automated repair estimate.' });
    if (!docTypes.includes('LICENSE'))
      tips.push({ icon: '🪪', text: "Upload your driver's license to speed up the insurance review." });
    if (!docTypes.includes('REGISTRATION'))
      tips.push({ icon: '📄', text: 'Upload your vehicle registration document.' });
    if (!docTypes.includes('ACCIDENT_REPORT') && claim.hasPoliceReport)
      tips.push({ icon: '🚔', text: 'You marked a police report was filed — upload it to strengthen your claim.' });
    if (docs.some((d) => d.verificationStatus === 'ISSUES_FOUND'))
      tips.push({ icon: '⚠️', text: 'One or more documents have issues. Replace them with clearer photos.' });
    if (docs.some((d) => d.verificationStatus === 'UNREADABLE'))
      tips.push({ icon: '🔍', text: 'Some documents are unreadable. Re-upload with better lighting and focus.' });
    if (claim.damageAssessment?.overallSeverity === 'SEVERE')
      tips.push({ icon: '🚗', text: 'Severe damage detected. Avoid driving the vehicle until it has been inspected by a mechanic.' });
    if (claim.status === 'DRAFT')
      tips.push({ icon: '📨', text: 'Your claim is still a draft. Submit it when you have added all photos and documents.' });
    if (claim.status === 'UNDER_REVIEW')
      tips.push({ icon: '⏳', text: 'Your claim is under review. Ensure all documents are verified to avoid delays.' });
    if (tips.length === 0)
      tips.push({ icon: '✅', text: 'Everything looks good! Your claim is progressing well.' });

    return tips;
  }, [claim]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;
  if (!claim) return null;

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
          {/* Images */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim Images ({claim.images?.length || 0})</h2>
            {claim.images?.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {claim.images.map((img) => (
                  <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                    <img src={uploadUrl(img.filePath)} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-full">{img.type === 'FULL_VEHICLE' ? 'Full' : 'Damage'}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No images uploaded</p>}
          </div>

          {/* Damage Assessment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Damage Assessment</h2>
              <button onClick={handleAnalyze} disabled={analyzing || claim.images?.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${analyzing ? 'animate-spin' : ''}`} /> {analyzing ? 'Analyzing...' : claim.damageAssessment ? 'Re-analyze' : 'Analyze'}
              </button>
            </div>
            {claim.damageAssessment ? (
              <>
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
            ) : (
              <p className="text-sm text-gray-500">No damage assessment yet. Click "Analyze" to run AI damage analysis.</p>
            )}
          </div>

          {/* Repair Estimate */}
          {claim.repairEstimate && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Repair Estimate</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center"><p className="text-xs text-blue-600 font-medium">Parts</p><p className="text-lg font-bold text-blue-900">${claim.repairEstimate.totalPartsCost.toLocaleString()}</p></div>
                <div className="bg-purple-50 rounded-lg p-3 text-center"><p className="text-xs text-purple-600 font-medium">Labor</p><p className="text-lg font-bold text-purple-900">${claim.repairEstimate.totalLaborCost.toLocaleString()}</p></div>
                <div className="bg-primary-50 rounded-lg p-3 text-center"><p className="text-xs text-primary-600 font-medium">Total</p><p className="text-lg font-bold text-primary-900">${claim.repairEstimate.totalCost.toLocaleString()}</p></div>
                <div className="bg-green-50 rounded-lg p-3 text-center"><p className="text-xs text-green-600 font-medium">Est. Days</p><p className="text-lg font-bold text-green-900">{claim.repairEstimate.estimatedDays}</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                    <th className="pb-2">Damage Type</th><th className="pb-2">Parts</th><th className="pb-2">Labor</th><th className="pb-2 text-right">Subtotal</th>
                  </tr></thead>
                  <tbody>
                    {claim.repairEstimate.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 capitalize">{item.damageType.replace(/_/g, ' ')}</td>
                        <td className="py-2">${item.partCost}</td>
                        <td className="py-2">{item.laborHours}h @ ${item.laborRate}/h</td>
                        <td className="py-2 text-right font-medium">${item.subtotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Insurance Payout */}
          {claim.insurancePayout && (
            <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-green-600" /> Insurance Payout Estimate</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center"><p className="text-xs text-gray-500">Deductible</p><p className="text-xl font-bold text-gray-900">${claim.insurancePayout.deductible.toLocaleString()}</p></div>
                <div className="text-center"><p className="text-xs text-gray-500">Covered</p><p className="text-xl font-bold text-gray-900">${claim.insurancePayout.coveredAmount.toLocaleString()}</p></div>
                <div className="text-center"><p className="text-xs text-gray-500">Est. Payout</p><p className="text-xl font-bold text-green-600">${claim.insurancePayout.estimatedPayout.toLocaleString()}</p></div>
              </div>
              {claim.insurancePayout.notes && <p className="text-xs text-gray-500 mt-3">{claim.insurancePayout.notes}</p>}
            </div>
          )}

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
                      <label className="flex items-center gap-2 text-sm text-primary-600 cursor-pointer hover:text-primary-700">
                        <Upload className="h-4 w-4" />
                        <span>Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDocUpload(e, docType)} disabled={docUploading === docType} />
                      </label>
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
                  <span className={`text-sm ${step.issue ? 'text-red-600 font-medium' : step.done ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                    {step.label}
                  </span>
                  {!step.done && !step.issue && (
                    <Clock className="h-3.5 w-3.5 text-gray-300 ml-auto flex-shrink-0" />
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Suggestions */}
          <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" /> Suggestions
            </h2>
            <ul className="space-y-2.5">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="text-base leading-none mt-0.5">{s.icon}</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ul>
          </div>

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
    </div>
  );
}
