import { useState, useEffect, type FormEvent } from 'react';
import api from '../services/api';
import type { InsurancePolicy } from '../types';
import { FileText, Plus, Trash2 } from 'lucide-react';

export function PoliciesPage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ providerName: '', policyNumber: '', coverageType: 'Comprehensive', deductible: '', premiumAmount: '', startDate: '', endDate: '' });
  const [error, setError] = useState('');

  const fetchPolicies = () => api.get('/policies').then((res) => { setPolicies(res.data); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { fetchPolicies(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/policies', form);
      setShowForm(false);
      setForm({ providerName: '', policyNumber: '', coverageType: 'Comprehensive', deductible: '', premiumAmount: '', startDate: '', endDate: '' });
      fetchPolicies();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to add policy'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this policy?')) return;
    await api.delete(`/policies/${id}`);
    fetchPolicies();
  };

  const update = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [f]: e.target.value }));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Insurance Policies</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2">
          <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'Add Policy'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Insurance Policy</h2>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Provider Name *</label><input type="text" value={form.providerName} onChange={update('providerName')} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="State Farm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Policy Number *</label><input type="text" value={form.policyNumber} onChange={update('policyNumber')} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="POL-123456" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Coverage Type *</label>
                <select value={form.coverageType} onChange={update('coverageType')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  <option>Comprehensive</option><option>Collision</option><option>Liability</option><option>Full Coverage</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Deductible ($) *</label><input type="number" value={form.deductible} onChange={update('deductible')} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Premium ($) *</label><input type="number" value={form.premiumAmount} onChange={update('premiumAmount')} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="1200" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label><input type="date" value={form.startDate} onChange={update('startDate')} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label><input type="date" value={form.endDate} onChange={update('endDate')} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" /></div>
            </div>
            <button type="submit" className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700">Add Policy</button>
          </form>
        </div>
      )}

      {policies.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No policies added</h3>
          <p className="text-gray-500">Add your insurance policy to link it with claims</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {policies.map((p: InsurancePolicy) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-green-100 rounded-lg"><FileText className="h-5 w-5 text-green-600" /></div>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              <h3 className="font-semibold text-gray-900">{p.providerName}</h3>
              <p className="text-sm text-gray-500">Policy #{p.policyNumber}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Coverage:</span> <span className="font-medium">{p.coverageType}</span></div>
                <div><span className="text-gray-500">Deductible:</span> <span className="font-medium">${p.deductible}</span></div>
                <div><span className="text-gray-500">Premium:</span> <span className="font-medium">${p.premiumAmount}</span></div>
                <div><span className="text-gray-500">Expires:</span> <span className="font-medium">{new Date(p.endDate).toLocaleDateString()}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
