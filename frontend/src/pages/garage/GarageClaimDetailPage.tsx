import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import garageApi from '../../services/garageApi';
import { ArrowLeft, Save, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { uploadUrl } from '../../utils/uploadUrl';

interface EstimateItem {
  damageType: string;
  partName: string;
  partCost: number;
  laborHours: number;
  laborRate: number;
  laborCost: number;
  paintMaterials: number;
  subtotal: number;
  addedByGarage?: boolean;
}

export function GarageClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const fetchClaim = () =>
    garageApi.get(`/claims/${id}`).then((r) => {
      setClaim(r.data);
      // Pre-populate from AI estimate or existing garage estimate
      const existing = r.data.garageEstimate;
      const ai = r.data.repairEstimate;
      if (existing) {
        setItems(existing.items as EstimateItem[]);
        setNotes(existing.notes || '');
      } else if (ai) {
        setItems((ai.items as EstimateItem[]).map((item: EstimateItem) => ({ ...item })));
      }
    }).finally(() => setLoading(false));

  useEffect(() => { fetchClaim(); }, [id]);

  const totals = useMemo(() => {
    const totalPartsCost = items.reduce((s, i) => s + i.partCost, 0);
    const totalLaborCost = items.reduce((s, i) => s + i.laborCost + i.paintMaterials, 0);
    const totalCost = totalPartsCost + totalLaborCost;
    const totalHours = items.reduce((s, i) => s + i.laborHours, 0);
    const estimatedDays = Math.max(1, Math.ceil(totalHours / 8));
    return { totalPartsCost, totalLaborCost, totalCost, estimatedDays };
  }, [items]);

  const updateItem = (idx: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx] };
      const num = parseFloat(value) || 0;
      (item as any)[field] = num;
      item.laborCost = Math.round(item.laborHours * item.laborRate);
      item.subtotal = item.partCost + item.laborCost + item.paintMaterials;
      updated[idx] = item;
      return updated;
    });
  };

  const updateItemText = (idx: number, field: string, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, {
      damageType: 'other', partName: '', partCost: 0,
      laborHours: 1, laborRate: 3500, laborCost: 3500,
      paintMaterials: 0, subtotal: 3500, addedByGarage: true,
    }]);
    setEditMode(true);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      await garageApi.post(`/claims/${id}/estimate`, {
        items, ...totals, notes: notes || null,
      });
      await fetchClaim();
      setEditMode(false);
    } catch { alert('Failed to submit estimate'); }
    finally { setSaving(false); }
  };

  const severityBg: Record<string, string> = {
    MINOR: 'bg-green-100 text-green-700', MODERATE: 'bg-yellow-100 text-yellow-700', SEVERE: 'bg-red-100 text-red-700',
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div>;
  if (!claim) return null;

  const hasAiAssessment = !!claim.damageAssessment;
  const hasAiEstimate = !!claim.repairEstimate;
  const hasGarageEstimate = !!claim.garageEstimate;

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => navigate('/garage/dashboard')}
        className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 mb-5 font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{claim.vehicle?.make} {claim.vehicle?.model} {claim.vehicle?.year}</h1>
            <p className="text-sm text-gray-500">Customer: {claim.user?.firstName} {claim.user?.lastName} &bull; {claim.user?.phone || claim.user?.email}</p>
            <p className="text-sm text-gray-500 mt-1">{claim.incidentLocation} — {new Date(claim.incidentDate).toLocaleDateString()}</p>
            <p className="text-sm text-gray-500">License Plate: {claim.vehicle?.licensePlate}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            claim.status === 'GARAGE_REVIEW' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
          }`}>{claim.status.replace(/_/g, ' ')}</span>
        </div>
        <p className="text-sm text-gray-600 mt-3">{claim.incidentDescription}</p>
      </div>

      {/* Images */}
      {claim.images?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-3">Vehicle Images ({claim.images.length})</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {claim.images.map((img: any) => (
              <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                <img src={uploadUrl(img.filePath)} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {img.type === 'FULL_VEHICLE' ? 'Full' : 'Dmg'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Assessment */}
      {hasAiAssessment && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-3">AI Damage Assessment</h2>
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
                <p className="text-gray-500">{d.location} — {d.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estimate Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            {hasGarageEstimate ? 'Your Submitted Estimate' : 'Garage Repair Estimate'}
          </h2>
          {!editMode && !hasGarageEstimate && (
            <button onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
              Edit Estimate
            </button>
          )}
          {hasGarageEstimate && !editMode && (
            <button onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200">
              Revise Estimate
            </button>
          )}
        </div>

        {/* AI vs Garage comparison (when both exist) */}
        {hasAiEstimate && (hasGarageEstimate || editMode) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-center">
              <p className="text-[10px] text-blue-600 font-medium">AI Estimate</p>
              <p className="text-sm font-bold text-blue-900">Rs. {claim.repairEstimate.totalCost.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-orange-600 font-medium">Garage Estimate</p>
              <p className="text-sm font-bold text-orange-900">Rs. {totals.totalCost.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-600 font-medium">Difference</p>
              <p className={`text-sm font-bold ${totals.totalCost > claim.repairEstimate.totalCost ? 'text-red-600' : 'text-green-600'}`}>
                Rs. {(totals.totalCost - claim.repairEstimate.totalCost).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-600 font-medium">Est. Days</p>
              <p className="text-sm font-bold text-gray-900">{totals.estimatedDays} days</p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-2 text-center"><p className="text-xs text-blue-600">Parts</p><p className="font-bold text-blue-900">Rs. {totals.totalPartsCost.toLocaleString()}</p></div>
          <div className="bg-purple-50 rounded-lg p-2 text-center"><p className="text-xs text-purple-600">Labor</p><p className="font-bold text-purple-900">Rs. {totals.totalLaborCost.toLocaleString()}</p></div>
          <div className="bg-orange-50 rounded-lg p-2 text-center"><p className="text-xs text-orange-600">Total</p><p className="font-bold text-orange-900">Rs. {totals.totalCost.toLocaleString()}</p></div>
          <div className="bg-green-50 rounded-lg p-2 text-center"><p className="text-xs text-green-600">Days</p><p className="font-bold text-green-900">{totals.estimatedDays}</p></div>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                <th className="pb-2">Damage Type</th>
                <th className="pb-2">Part Name</th>
                <th className="pb-2">Parts (Rs.)</th>
                <th className="pb-2">Labor Hours</th>
                <th className="pb-2">Rate (Rs.)</th>
                <th className="pb-2">Paint (Rs.)</th>
                <th className="pb-2 text-right">Subtotal</th>
                {editMode && <th className="pb-2" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className={`border-b border-gray-100 ${item.addedByGarage ? 'bg-orange-50' : ''}`}>
                  <td className="py-2">
                    {editMode ? (
                      <select value={item.damageType} onChange={(e) => updateItemText(idx, 'damageType', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs w-full">
                        {['dent','scratch','crack','broken_light','bumper_damage','glass_damage','panel_deformation','wheel_damage','structural_damage','other'].map((t) =>
                          <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                        )}
                      </select>
                    ) : <span className="capitalize">{item.damageType.replace(/_/g, ' ')}</span>}
                  </td>
                  <td className="py-2">
                    {editMode ? (
                      <input value={item.partName} onChange={(e) => updateItemText(idx, 'partName', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs w-full" />
                    ) : item.partName}
                  </td>
                  <td className="py-2">
                    {editMode ? (
                      <input type="number" value={item.partCost} onChange={(e) => updateItem(idx, 'partCost', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="px-2 py-1 border border-gray-300 rounded text-xs w-24" />
                    ) : `Rs. ${item.partCost.toLocaleString()}`}
                  </td>
                  <td className="py-2">
                    {editMode ? (
                      <input type="number" step="0.5" value={item.laborHours} onChange={(e) => updateItem(idx, 'laborHours', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="px-2 py-1 border border-gray-300 rounded text-xs w-20" />
                    ) : item.laborHours}
                  </td>
                  <td className="py-2">
                    {editMode ? (
                      <input type="number" value={item.laborRate} onChange={(e) => updateItem(idx, 'laborRate', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="px-2 py-1 border border-gray-300 rounded text-xs w-24" />
                    ) : `Rs. ${item.laborRate.toLocaleString()}`}
                  </td>
                  <td className="py-2">
                    {editMode ? (
                      <input type="number" value={item.paintMaterials} onChange={(e) => updateItem(idx, 'paintMaterials', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="px-2 py-1 border border-gray-300 rounded text-xs w-24" />
                    ) : `Rs. ${item.paintMaterials.toLocaleString()}`}
                  </td>
                  <td className="py-2 text-right font-medium">Rs. {item.subtotal.toLocaleString()}</td>
                  {editMode && (
                    <td className="py-2">
                      <button onClick={() => removeItem(idx)} className="p-1 text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editMode && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={addItem}
              className="flex items-center gap-1 px-3 py-2 border border-orange-300 text-orange-700 rounded-lg text-sm hover:bg-orange-50">
              <Plus className="h-4 w-4" /> Add Repair Item
            </button>
          </div>
        )}

        {/* Notes */}
        {(editMode || notes) && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            {editMode ? (
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Additional notes about the repair estimate..." />
            ) : notes ? (
              <p className="text-sm text-gray-600 p-2 bg-gray-50 rounded">{notes}</p>
            ) : null}
          </div>
        )}

        {/* Submit button */}
        {editMode && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <button onClick={handleSubmit} disabled={saving || items.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Submitting...' : hasGarageEstimate ? 'Update Estimate' : 'Submit Estimate'}
            </button>
          </div>
        )}
      </div>

      {/* Warning if no AI assessment */}
      {!hasAiAssessment && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">AI Assessment Pending</p>
            <p className="text-sm text-yellow-700">The AI damage analysis has not been completed yet. You can still create your estimate manually.</p>
          </div>
        </div>
      )}
    </div>
  );
}
