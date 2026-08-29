import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { Vehicle, PolicyTemplate } from '../types';
import { Car, Trash2, ShieldCheck, BadgeCheck, Sparkles, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export function PoliciesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null); // `${vehicleId}:${templateId}`
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState<Record<string, string>>({});

  // Vehicles include their insurance policy — insurance is per vehicle now
  const load = () => {
    Promise.all([api.get('/vehicles'), api.get('/policies/templates')])
      .then(([vRes, tRes]) => {
        setVehicles(vRes.data);
        setTemplates(tRes.data);
      })
      .catch(() => setError('Failed to load policies.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleActivate = async (vehicle: Vehicle, template: PolicyTemplate) => {
    if (!window.confirm(`Activate the "${template.name}" plan for your ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})?\n\nAnnual fee: Rs. ${template.annualFee.toLocaleString()}\nDeductible: Rs. ${template.deductible.toLocaleString()}\nCoverage: ${template.coveragePercent}% after deductible`)) return;
    setActivating(`${vehicle.id}:${template.id}`);
    setError('');
    try {
      await api.post('/policies/activate', { templateId: template.id, vehicleId: vehicle.id });
      setSelection((prev) => ({ ...prev, [vehicle.id]: '' }));
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate plan.');
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!vehicle.insurancePolicy) return;
    if (!window.confirm(`Delete the policy for ${vehicle.year} ${vehicle.make} ${vehicle.model}? The vehicle will need a new policy (and re-verification) before claims unlock.`)) return;
    setDeletingId(vehicle.insurancePolicy.id);
    setError('');
    try {
      await api.delete(`/policies/${vehicle.insurancePolicy.id}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete policy.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;

  // Group built-in plans by insurance type
  const byType = templates.reduce<Record<string, PolicyTemplate[]>>((acc, t) => {
    (acc[t.coverageType] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Insurance Policies</h1>
      <p className="text-gray-500 mb-6">Each vehicle has its own policy — activate a plan for a vehicle below.</p>

      {error && <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {/* My Vehicles — one policy card per vehicle */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-green-600" /> My Vehicles
      </h2>
      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center mb-8">
          <Car className="h-14 w-14 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No vehicles yet</h3>
          <p className="text-gray-500 mb-4">Register a vehicle first — insurance is attached to each vehicle.</p>
          <Link to="/vehicles/new" className="text-primary-600 font-medium hover:text-primary-700">Add a vehicle</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {vehicles.map((v: Vehicle) => {
            const policy = v.insurancePolicy;
            const active = policy ? new Date(policy.endDate) >= new Date() : false;
            const selectedTemplate = templates.find((t) => t.id === selection[v.id]);
            return (
              <div key={v.id} className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col ${active ? 'border-green-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-2 rounded-lg ${active ? 'bg-green-100' : 'bg-primary-100'}`}>
                      {active ? <BadgeCheck className="h-5 w-5 text-green-600" /> : <Car className="h-5 w-5 text-primary-600" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{v.year} {v.make} {v.model}</h3>
                      <p className="text-xs text-gray-500">{v.licensePlate}</p>
                    </div>
                  </div>
                  {v.verificationStatus === 'VERIFIED' ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium shrink-0">
                      <CheckCircle className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : v.verificationStatus === 'REJECTED' ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium shrink-0">
                      <XCircle className="h-3.5 w-3.5" /> Rejected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium shrink-0">
                      <AlertCircle className="h-3.5 w-3.5" /> Pending verification
                    </span>
                  )}
                </div>

                {policy ? (
                  <>
                    <h4 className="font-medium text-gray-900">{policy.template?.name || policy.providerName}</h4>
                    <p className="text-sm text-gray-500">{policy.coverageType} · Policy #{policy.policyNumber}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Coverage:</span> <span className="font-medium">{policy.coveragePercent}%</span></div>
                      <div><span className="text-gray-500">Deductible:</span> <span className="font-medium">Rs. {policy.deductible.toLocaleString()}</span></div>
                      <div><span className="text-gray-500">Annual Fee:</span> <span className="font-medium">Rs. {policy.premiumAmount.toLocaleString()}</span></div>
                      <div><span className="text-gray-500">Valid Until:</span> <span className="font-medium">{new Date(policy.endDate).toLocaleDateString()}</span></div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>{active ? 'Active' : 'Expired'}</span>
                      <button onClick={() => handleDelete(v)} disabled={deletingId === policy.id} className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-50" title="Delete policy">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <p className="text-sm text-gray-500 mb-2">No policy yet — pick a plan to activate for this vehicle.</p>
                    <select value={selection[v.id] || ''} onChange={(e) => setSelection((prev) => ({ ...prev, [v.id]: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
                      <option value="">Select an insurance plan</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} — Rs. {t.annualFee.toLocaleString()}/yr</option>
                      ))}
                    </select>
                    {selectedTemplate && (
                      <p className="mt-2 text-xs text-gray-500">
                        {selectedTemplate.coverageType} · {selectedTemplate.coveragePercent}% coverage after Rs. {selectedTemplate.deductible.toLocaleString()} deductible · Rs. {selectedTemplate.annualFee.toLocaleString()} annual fee
                      </p>
                    )}
                    <button onClick={() => selectedTemplate && handleActivate(v, selectedTemplate)}
                      disabled={!selectedTemplate || activating === `${v.id}:${selectedTemplate.id}`}
                      className="mt-3 w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                      {activating === `${v.id}:${selectedTemplate?.id}` ? 'Activating...' : 'Activate Plan'}
                    </button>
                    <p className="mt-2 text-xs text-amber-600">The insurance company verifies the vehicle and policy before claims unlock.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Built-in plans — informational only; activation happens per vehicle above */}
      <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary-600" /> Available Plans
      </h2>
      <p className="text-sm text-gray-500 mb-3">Built-in insurance plans offered by Flash Claim Insurance — activate them for a vehicle above.</p>
      {Object.keys(byType).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <p className="text-gray-500">No plans available right now. Please check back later.</p>
        </div>
      ) : (
        Object.entries(byType).map(([type, plans]) => (
          <div key={type} className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{type} Insurance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((t) => (
                <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
                  <h4 className="font-semibold text-gray-900">{t.name}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-3 flex-1">{t.description || `${t.coveragePercent}% coverage after deductible.`}</p>
                  <div className="mt-4 space-y-1.5 text-sm">
                    <p className="text-2xl font-bold text-primary-600">Rs. {t.annualFee.toLocaleString()}<span className="text-xs text-gray-400 font-normal">/yr</span></p>
                    <p className="text-gray-600">Covers <span className="font-semibold">{t.coveragePercent}%</span> after deductible</p>
                    <p className="text-gray-600">Deductible <span className="font-semibold">Rs. {t.deductible.toLocaleString()}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
