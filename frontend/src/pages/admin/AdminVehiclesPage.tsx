import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import type { PolicyTemplate } from '../../types';
import { Banknote, Car, ClipboardList, Plus, Search, X, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface AdminVehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  vin?: string | null;
  licensePlate: string;
  color: string;
  mileage?: number | null;
  valuation?: number | null;
  // Verification + per-vehicle insurance — claims require a VERIFIED vehicle with a policy
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: string | null;
  verificationNotes?: string | null;
  insurancePolicy?: {
    id: string;
    providerName: string;
    policyNumber: string;
    coverageType: string;
    deductible: number;
    premiumAmount: number;
    coveragePercent: number;
    startDate: string;
    endDate: string;
    template?: { name: string } | null;
  } | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  _count?: { claims: number };
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const emptyForm = { userId: '', make: '', model: '', year: '', vin: '', licensePlate: '', color: '', mileage: '' };

export function AdminVehiclesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userFilter = searchParams.get('user');
  const verificationFilter = searchParams.get('verification') || '';

  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add-vehicle modal — ?add=1 (typically arriving from a user row) opens it pre-selected
  const [addOpen, setAddOpen] = useState(searchParams.get('add') === '1');
  const [form, setForm] = useState({ ...emptyForm, userId: userFilter || '' });
  const [saving, setSaving] = useState(false);

  // Vehicle valuation editor — the insurance company sets the value that caps claim payouts
  const [valuationVehicle, setValuationVehicle] = useState<AdminVehicle | null>(null);
  const [valuationInput, setValuationInput] = useState('');
  const [valuationSaving, setValuationSaving] = useState(false);

  // Vehicle verification — VERIFIED requires an attached policy
  const [verifying, setVerifying] = useState(false);

  // Add/Edit policy modal — built-in plan or custom entry; saving resets the vehicle to PENDING
  const [policyVehicle, setPolicyVehicle] = useState<AdminVehicle | null>(null);
  const [policySaving, setPolicySaving] = useState(false);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [policyMode, setPolicyMode] = useState<'template' | 'custom'>('template');
  const [policyForm, setPolicyForm] = useState({
    templateId: '',
    providerName: '',
    policyNumber: '',
    coverageType: '',
    deductible: '',
    premiumAmount: '',
    coveragePercent: '',
    startDate: '',
    endDate: '',
  });

  const load = () => {
    const params = new URLSearchParams();
    if (userFilter) params.set('user', userFilter);
    if (search.trim()) params.set('search', search.trim());
    if (verificationFilter) params.set('verification', verificationFilter);
    adminApi.get(`/vehicles?${params}`).then((r) => setVehicles(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [userFilter, verificationFilter]);

  // Users list powers the owner filter chip and the add-vehicle owner dropdown
  useEffect(() => {
    adminApi.get('/users').then((r) => setUsers(r.data)).catch(() => {});
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleAdd = async () => {
    if (!form.userId || !form.make.trim() || !form.model.trim() || !form.year || !form.licensePlate.trim() || !form.color.trim()) {
      alert('Owner, make, model, year, license plate, and color are required.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.post('/vehicles', form);
      setAddOpen(false);
      setForm({ ...emptyForm, userId: userFilter || '' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add vehicle.');
    } finally {
      setSaving(false);
    }
  };

  const clearUserFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('user');
    setSearchParams(next, { replace: true });
  };

  const openValuation = (v: AdminVehicle) => {
    setValuationVehicle(v);
    setValuationInput(v.valuation != null ? String(v.valuation) : '');
  };

  const handleSaveValuation = async () => {
    if (!valuationVehicle) return;
    const value = valuationInput.trim() === '' ? null : Number(valuationInput);
    if (value != null && (Number.isNaN(value) || value < 0)) {
      alert('Valuation must be a non-negative number.');
      return;
    }
    setValuationSaving(true);
    try {
      const res = await adminApi.patch(`/vehicles/${valuationVehicle.id}/valuation`, { valuation: value });
      setVehicles((prev) => prev.map((v) => (v.id === valuationVehicle.id ? { ...v, valuation: res.data.valuation } : v)));
      setValuationVehicle(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save valuation.');
    } finally {
      setValuationSaving(false);
    }
  };

  const setVerificationFilter = (s: string) => {
    const next = new URLSearchParams(searchParams);
    if (s) next.set('verification', s); else next.delete('verification');
    setSearchParams(next, { replace: true });
  };

  // Verify / reject the vehicle and its insurance — notes are optional and shown to the owner
  const handleVerify = async (v: AdminVehicle, status: 'VERIFIED' | 'REJECTED') => {
    const notes = window.prompt(
      status === 'VERIFIED'
        ? `Verify ${v.year} ${v.make} ${v.model} (${v.licensePlate})?\nOptional notes for the owner:`
        : `Reject verification for ${v.year} ${v.make} ${v.model} (${v.licensePlate})?\nReason (optional):`
    );
    if (notes === null) return; // cancelled
    setVerifying(true);
    try {
      const res = await adminApi.patch(`/vehicles/${v.id}/verify`, { status, notes: notes.trim() || undefined });
      setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, ...res.data } : x)));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update verification.');
    } finally {
      setVerifying(false);
    }
  };

  const openPolicyModal = (v: AdminVehicle) => {
    setPolicyVehicle(v);
    setPolicyMode('template');
    const p = v.insurancePolicy;
    const yearFromNow = new Date();
    yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
    setPolicyForm({
      templateId: '',
      providerName: p?.providerName || '',
      policyNumber: p?.policyNumber || '',
      coverageType: p?.coverageType || '',
      deductible: p != null ? String(p.deductible) : '',
      premiumAmount: p != null ? String(p.premiumAmount) : '',
      coveragePercent: p != null ? String(p.coveragePercent) : '',
      startDate: (p ? p.startDate : new Date().toISOString()).slice(0, 10),
      endDate: (p ? p.endDate : yearFromNow.toISOString()).slice(0, 10),
    });
    // Built-in plans pre-fill the form; fetched once and reused
    if (templates.length === 0) {
      adminApi.get('/policy-templates').then((r) => setTemplates((r.data as PolicyTemplate[]).filter((t) => t.isActive))).catch(() => {});
    }
  };

  const pickTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    setPolicyForm((f) => ({
      ...f,
      templateId,
      providerName: t ? 'Flash Claim Insurance' : f.providerName,
      coverageType: t?.coverageType || f.coverageType,
      deductible: t != null ? String(t.deductible) : f.deductible,
      premiumAmount: t != null ? String(t.annualFee) : f.premiumAmount,
      coveragePercent: t != null ? String(t.coveragePercent) : f.coveragePercent,
    }));
  };

  const handleSavePolicy = async () => {
    if (!policyVehicle) return;
    const payload: Record<string, unknown> = {};
    if (policyMode === 'template') {
      if (!policyForm.templateId) {
        alert('Select a built-in plan or switch to custom entry.');
        return;
      }
      payload.templateId = policyForm.templateId;
      if (policyForm.startDate) payload.startDate = policyForm.startDate;
      if (policyForm.endDate) payload.endDate = policyForm.endDate;
    } else {
      if (!policyForm.providerName.trim() || !policyForm.policyNumber.trim() || !policyForm.coverageType.trim()
        || policyForm.deductible === '' || policyForm.premiumAmount === '' || !policyForm.startDate || !policyForm.endDate) {
        alert('Fill in all custom policy fields.');
        return;
      }
      payload.providerName = policyForm.providerName.trim();
      payload.policyNumber = policyForm.policyNumber.trim();
      payload.coverageType = policyForm.coverageType.trim();
      payload.deductible = Number(policyForm.deductible);
      payload.premiumAmount = Number(policyForm.premiumAmount);
      payload.coveragePercent = policyForm.coveragePercent === '' ? 100 : Number(policyForm.coveragePercent);
      payload.startDate = policyForm.startDate;
      payload.endDate = policyForm.endDate;
    }
    setPolicySaving(true);
    try {
      await adminApi.post(`/vehicles/${policyVehicle.id}/policy`, payload);
      setPolicyVehicle(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save policy.');
    } finally {
      setPolicySaving(false);
    }
  };

  const filteredUser = users.find((u) => u.id === userFilter);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400"></div></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
        <p className="text-gray-500 mt-1">
          {userFilter && filteredUser
            ? `Vehicles of ${filteredUser.firstName} ${filteredUser.lastName}`
            : `${vehicles.length} registered vehicles`}
        </p>
      </div>

      {/* Owner filter chip — arrived here from a user row */}
      {userFilter && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700 font-medium">
            <Car className="h-3 w-3" />
            Owner: {filteredUser ? `${filteredUser.firstName} ${filteredUser.lastName}` : 'selected user'}
            <button onClick={clearUserFilter} className="hover:text-blue-900" title="Show all vehicles">
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5 flex flex-wrap gap-3 items-center">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vehicle or owner..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">Search</button>
        </form>
        {/* Verification filter chips */}
        <div className="flex items-center gap-1.5">
          {[
            { value: '', label: 'All' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'VERIFIED', label: 'Verified' },
            { value: 'REJECTED', label: 'Rejected' },
          ].map((f) => (
            <button key={f.value} onClick={() => setVerificationFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                verificationFilter === f.value
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Owner</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Vehicle</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Insurance</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Verification</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Plate</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Color</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Valuation</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Claims</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                        {v.user.firstName[0]}{v.user.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{v.user.firstName} {v.user.lastName}</p>
                        <p className="text-xs text-gray-500">{v.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-900 font-medium">{v.year} {v.make} {v.model}</p>
                    {v.vin && <p className="text-xs text-gray-500">VIN {v.vin}</p>}
                  </td>
                  <td className="px-5 py-3">
                    {v.insurancePolicy ? (
                      <button onClick={() => openPolicyModal(v)} className="text-left group" title="Edit this policy">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600">{v.insurancePolicy.template?.name || v.insurancePolicy.providerName}</p>
                        <p className="text-xs text-gray-500">#{v.insurancePolicy.policyNumber} · {v.insurancePolicy.coveragePercent}% · Rs. {v.insurancePolicy.deductible.toLocaleString()} ded.</p>
                      </button>
                    ) : (
                      <button onClick={() => openPolicyModal(v)} className="text-xs text-gray-400 hover:text-primary-600 font-medium" title="Add a policy for this vehicle">
                        No policy — add one
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {v.verificationStatus === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : v.verificationStatus === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium" title={v.verificationNotes || undefined}>
                        <XCircle className="h-3.5 w-3.5" /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium" title={v.verificationNotes || undefined}>
                        <AlertCircle className="h-3.5 w-3.5" /> Pending
                      </span>
                    )}
                    {v.verifiedAt && <p className="text-[10px] text-gray-400 mt-1">{new Date(v.verifiedAt).toLocaleDateString()}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{v.licensePlate}</td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{v.color}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => openValuation(v)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${v.valuation != null ? 'text-green-700' : 'text-gray-400 hover:text-primary-600'}`}
                      title="Set the vehicle's insured value — caps claim payouts">
                      <Banknote className="h-3.5 w-3.5" />
                      {v.valuation != null ? `Rs. ${v.valuation.toLocaleString()}` : 'Set value'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <ClipboardList className="h-3.5 w-3.5" />{v._count?.claims ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button onClick={() => openPolicyModal(v)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium whitespace-nowrap">
                        {v.insurancePolicy ? 'Edit Policy' : 'Add Policy'}
                      </button>
                      {v.verificationStatus !== 'VERIFIED' && (
                        <button onClick={() => handleVerify(v, 'VERIFIED')} disabled={verifying}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium whitespace-nowrap disabled:opacity-50">
                          Verify
                        </button>
                      )}
                      {v.verificationStatus !== 'REJECTED' && (
                        <button onClick={() => handleVerify(v, 'REJECTED')} disabled={verifying}
                          className="text-xs px-2 py-1 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium whitespace-nowrap disabled:opacity-50">
                          Reject
                        </button>
                      )}
                      <Link to={`/admin/claims?vehicle=${v.id}`}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap">
                        Claims →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {vehicles.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No vehicles found</p>
          </div>
        )}
      </div>

      {/* Add vehicle modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !saving && setAddOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Add Vehicle</h3>
              <button onClick={() => setAddOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Owner *</label>
                <select value={form.userId} onChange={set('userId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="">— Select user —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Make *</label>
                  <input value={form.make} onChange={set('make')} placeholder="e.g. Toyota"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Model *</label>
                  <input value={form.model} onChange={set('model')} placeholder="e.g. Camry"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Year *</label>
                  <input type="number" min="1900" max="2100" value={form.year} onChange={set('year')} placeholder="e.g. 2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">License Plate *</label>
                  <input value={form.licensePlate} onChange={set('licensePlate')} placeholder="e.g. ABC 1234"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Color *</label>
                  <input value={form.color} onChange={set('color')} placeholder="e.g. Silver"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Mileage (km)</label>
                  <input type="number" min="0" value={form.mileage} onChange={set('mileage')} placeholder="optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">VIN</label>
                <input value={form.vin} onChange={set('vin')} placeholder="optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-xl">
              <button onClick={() => setAddOpen(false)} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleAdd} disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add/Edit policy modal — template or custom entry; saving resets the vehicle to PENDING */}
      {policyVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !policySaving && setPolicyVehicle(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{policyVehicle.insurancePolicy ? 'Edit Insurance Policy' : 'Add Insurance Policy'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {policyVehicle.year} {policyVehicle.make} {policyVehicle.model} · {policyVehicle.user.firstName} {policyVehicle.user.lastName}
                </p>
              </div>
              <button onClick={() => setPolicyVehicle(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <button type="button" onClick={() => setPolicyMode('template')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${policyMode === 'template' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  Built-in Plan
                </button>
                <button type="button" onClick={() => setPolicyMode('custom')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${policyMode === 'custom' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  Custom Entry
                </button>
              </div>

              {policyMode === 'template' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Plan *</label>
                  <select value={policyForm.templateId} onChange={(e) => pickTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="">— Select a plan —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.coverageType} · {t.coveragePercent}% · Rs. {t.annualFee.toLocaleString()}/yr · Rs. {t.deductible.toLocaleString()} deductible)</option>
                    ))}
                  </select>
                  {templates.length === 0 && <p className="mt-1 text-xs text-gray-400">No active plans — switch to custom entry.</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Provider *</label>
                      <input value={policyForm.providerName} onChange={(e) => setPolicyForm((f) => ({ ...f, providerName: e.target.value }))} placeholder="e.g. Flash Claim Insurance"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Policy Number *</label>
                      <input value={policyForm.policyNumber} onChange={(e) => setPolicyForm((f) => ({ ...f, policyNumber: e.target.value }))} placeholder="e.g. FC-XXXXXX"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Coverage Type *</label>
                      <input value={policyForm.coverageType} onChange={(e) => setPolicyForm((f) => ({ ...f, coverageType: e.target.value }))} placeholder="e.g. Comprehensive"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Coverage %</label>
                      <input type="number" min="1" max="100" value={policyForm.coveragePercent} onChange={(e) => setPolicyForm((f) => ({ ...f, coveragePercent: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Deductible (Rs.) *</label>
                      <input type="number" min="0" value={policyForm.deductible} onChange={(e) => setPolicyForm((f) => ({ ...f, deductible: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Premium (Rs.) *</label>
                      <input type="number" min="0" value={policyForm.premiumAmount} onChange={(e) => setPolicyForm((f) => ({ ...f, premiumAmount: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Start Date</label>
                  <input type="date" value={policyForm.startDate} onChange={(e) => setPolicyForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">End Date</label>
                  <input type="date" value={policyForm.endDate} onChange={(e) => setPolicyForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Saving replaces this vehicle's policy and resets its verification to pending so the new insurance info can be reviewed. Payouts for this vehicle's claims are recalculated.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-xl">
              <button onClick={() => setPolicyVehicle(null)} disabled={policySaving}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleSavePolicy} disabled={policySaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {policySaving ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Valuation modal — insurance company sets the vehicle's insured value */}
      {valuationVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !valuationSaving && setValuationVehicle(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Vehicle Valuation</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {valuationVehicle.year} {valuationVehicle.make} {valuationVehicle.model} · {valuationVehicle.user.firstName} {valuationVehicle.user.lastName}
                </p>
              </div>
              <button onClick={() => setValuationVehicle(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4">
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Insured Value (Rs.)</label>
              <input type="number" min="0" value={valuationInput} onChange={(e) => setValuationInput(e.target.value)} placeholder="e.g. 4500000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              <p className="mt-2 text-xs text-gray-400">
                Claim payouts are capped at this value. Leave empty to remove the cap.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setValuationVehicle(null)} disabled={valuationSaving}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleSaveValuation} disabled={valuationSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {valuationSaving ? 'Saving...' : 'Save Valuation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
