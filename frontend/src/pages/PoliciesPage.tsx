import { useState, useEffect } from 'react';
import api from '../services/api';
import type { InsurancePolicy, PolicyTemplate } from '../types';
import { FileText, Trash2, ShieldCheck, BadgeCheck, Sparkles } from 'lucide-react';

export function PoliciesPage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([api.get('/policies'), api.get('/policies/templates')])
      .then(([pRes, tRes]) => {
        setPolicies(pRes.data);
        setTemplates(tRes.data);
      })
      .catch(() => setError('Failed to load policies.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleActivate = async (template: PolicyTemplate) => {
    if (!window.confirm(`Activate the "${template.name}" plan?\n\nAnnual fee: Rs. ${template.annualFee.toLocaleString()}\nDeductible: Rs. ${template.deductible.toLocaleString()}\nCoverage: ${template.coveragePercent}% after deductible`)) return;
    setActivatingId(template.id);
    setError('');
    try {
      await api.post('/policies/activate', { templateId: template.id });
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate plan.');
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this policy?')) return;
    await api.delete(`/policies/${id}`);
    load();
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
      <p className="text-gray-500 mb-6">Activate a built-in plan — claims are deducted from your active policy.</p>

      {error && <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {/* My policies */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-green-600" /> My Policies
      </h2>
      {policies.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center mb-8">
          <FileText className="h-14 w-14 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No active policy</h3>
          <p className="text-gray-500">Activate one of the built-in plans below to cover your claims.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {policies.map((p: InsurancePolicy) => {
            const active = new Date(p.endDate) >= new Date();
            return (
              <div key={p.id} className={`bg-white rounded-xl shadow-sm border p-5 ${active ? 'border-green-200' : 'border-gray-200 opacity-75'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <BadgeCheck className={`h-5 w-5 ${active ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
                <h3 className="font-semibold text-gray-900">{p.template?.name || p.providerName}</h3>
                <p className="text-sm text-gray-500">{p.coverageType} · Policy #{p.policyNumber}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Coverage:</span> <span className="font-medium">{p.coveragePercent}%</span></div>
                  <div><span className="text-gray-500">Deductible:</span> <span className="font-medium">Rs. {p.deductible.toLocaleString()}</span></div>
                  <div><span className="text-gray-500">Annual Fee:</span> <span className="font-medium">Rs. {p.premiumAmount.toLocaleString()}</span></div>
                  <div><span className="text-gray-500">Valid Until:</span> <span className="font-medium">{new Date(p.endDate).toLocaleDateString()}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Built-in plans */}
      <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary-600" /> Available Plans
      </h2>
      <p className="text-sm text-gray-500 mb-3">Built-in insurance plans offered by Flash Claim Insurance.</p>
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
                  <button onClick={() => handleActivate(t)} disabled={activatingId === t.id}
                    className="mt-4 w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition">
                    {activatingId === t.id ? 'Activating...' : 'Activate Plan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
