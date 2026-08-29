import { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import type { PolicyTemplate } from '../../types';
import { Banknote, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';

const emptyForm = {
  name: '',
  coverageType: 'Comprehensive',
  description: '',
  deductible: '',
  coveragePercent: '100',
  annualFee: '',
  isActive: true,
};

// Common insurance types — admins can also type a custom one
const INSURANCE_TYPES = ['Comprehensive', 'Third Party', 'Third Party, Fire & Theft'];

export function AdminPoliciesPage() {
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create / edit modal
  const [editing, setEditing] = useState<PolicyTemplate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    adminApi.get('/policy-templates')
      .then((r) => setTemplates(r.data))
      .catch(() => setError('Failed to load policy plans.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (t: PolicyTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      coverageType: t.coverageType,
      description: t.description || '',
      deductible: String(t.deductible),
      coveragePercent: String(t.coveragePercent),
      annualFee: String(t.annualFee),
      isActive: t.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.coverageType.trim() || form.deductible === '' || form.coveragePercent === '' || form.annualFee === '') {
      setError('Name, insurance type, deductible, coverage %, and annual fee are required.');
      return;
    }
    const ded = Number(form.deductible);
    const pct = Number(form.coveragePercent);
    const fee = Number(form.annualFee);
    if (Number.isNaN(ded) || ded < 0) { setError('Deductible must be a non-negative number.'); return; }
    if (Number.isNaN(pct) || pct <= 0 || pct > 100) { setError('Coverage % must be between 1 and 100.'); return; }
    if (Number.isNaN(fee) || fee < 0) { setError('Annual fee must be a non-negative number.'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        coverageType: form.coverageType.trim(),
        description: form.description.trim() || null,
        deductible: ded,
        coveragePercent: pct,
        annualFee: fee,
      };
      if (editing) {
        await adminApi.patch(`/policy-templates/${editing.id}`, payload);
      } else {
        await adminApi.post('/policy-templates', { ...payload, isActive: form.isActive });
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save policy plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: PolicyTemplate) => {
    try {
      await adminApi.patch(`/policy-templates/${t.id}`, { isActive: !t.isActive });
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, isActive: !t.isActive } : x)));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update plan.');
    }
  };

  const handleDelete = async (t: PolicyTemplate) => {
    const usage = t._count?.policies ? `\n\n${t._count.policies} active policy(ies) were created from this plan — they keep their copied values.` : '';
    if (!window.confirm(`Delete the "${t.name}" plan?${usage}`)) return;
    try {
      await adminApi.delete(`/policy-templates/${t.id}`);
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete policy plan.');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400"></div></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policy Plans</h1>
          <p className="text-gray-500 mt-1">Built-in insurance plans per insurance type — claims are deducted from these policies.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
          <Plus className="h-4 w-4" /> Add Plan
        </button>
      </div>

      {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Insurance Type</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Coverage</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Deductible</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Annual Fee</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Active Policies</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map((t) => (
                <tr key={t.id} className={`hover:bg-gray-50 transition ${!t.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    {t.description && <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{t.description}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{t.coverageType}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">{t.coveragePercent}%</td>
                  <td className="px-5 py-3 text-right text-gray-600">Rs. {t.deductible.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                      <Banknote className="h-3.5 w-3.5 text-green-600" /> Rs. {t.annualFee.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-gray-600">{t._count?.policies ?? 0}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => handleToggleActive(t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${t.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(t)} title="Edit plan"
                      className="p-1.5 text-gray-400 hover:text-primary-600 transition"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(t)} title="Delete plan"
                      className="p-1.5 text-gray-400 hover:text-red-600 transition"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {templates.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No policy plans yet — add one so users can activate it.</p>
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !saving && setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Plan' : 'Add Policy Plan'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Plan Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="e.g. Full Comprehensive"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Insurance Type *</label>
                <input list="insurance-types" value={form.coverageType} onChange={set('coverageType')} placeholder="e.g. Comprehensive"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                <datalist id="insurance-types">
                  {INSURANCE_TYPES.map((type) => <option key={type} value={type} />)}
                </datalist>
                <p className="mt-1 text-xs text-gray-400">Plans are grouped by insurance type — users pick one when activating.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Description</label>
                <textarea value={form.description} onChange={set('description')} rows={2} placeholder="What the plan covers (shown to users)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Coverage % *</label>
                  <input type="number" min="1" max="100" value={form.coveragePercent} onChange={set('coveragePercent')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Deductible (Rs.) *</label>
                  <input type="number" min="0" value={form.deductible} onChange={set('deductible')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Annual Fee (Rs.) *</label>
                  <input type="number" min="0" value={form.annualFee} onChange={set('annualFee')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Payout = (repair estimate − deductible) × coverage %. Example: Rs. 200,000 estimate, Rs. 25,000 deductible, 80% cover → Rs. 140,000.
              </p>

              {!editing && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  Offer this plan to users immediately
                </label>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-xl">
              <button onClick={() => setModalOpen(false)} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
