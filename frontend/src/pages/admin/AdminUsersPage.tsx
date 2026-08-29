import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import type { AdminUser, PolicyTemplate } from '../../types';
import { Users, Car, ClipboardList, ChevronDown, ChevronUp, Pencil, X, BadgeCheck, Trash2, Plus, ShieldCheck } from 'lucide-react';

// Sri Lankan driving license classes
const LICENSE_TYPES = ['', 'A', 'A1', 'B', 'B1', 'C', 'C1', 'D', 'DE', 'G1', 'G2', 'J'];

const emptyPolicyForm = { templateId: '', coverageType: '', deductible: '', coveragePercent: '', annualFee: '' };

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Edit modal state — insurance company records for a user
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({
    phone: '', address: '', nic: '', licenseType: '', annualFee: '', joinedAt: '',
  });
  const [saving, setSaving] = useState(false);

  // Add-policy modal — the insurance company assigns a plan to a user
  const [policyUser, setPolicyUser] = useState<AdminUser | null>(null);
  const [policyForm, setPolicyForm] = useState(emptyPolicyForm);
  const [policySaving, setPolicySaving] = useState(false);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);

  const load = () => {
    adminApi.get('/users').then((r) => setUsers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openPolicyModal = (u: AdminUser) => {
    setPolicyUser(u);
    setPolicyForm(emptyPolicyForm);
    // Built-in plans pre-fill the form; fetched once and reused
    if (templates.length === 0) {
      adminApi.get('/policy-templates')
        .then((r) => setTemplates((r.data as PolicyTemplate[]).filter((t) => t.isActive)))
        .catch(() => {});
    }
  };

  const pickTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    setPolicyForm({
      templateId,
      coverageType: t?.coverageType || '',
      deductible: t != null ? String(t.deductible) : '',
      coveragePercent: t != null ? String(t.coveragePercent) : '',
      annualFee: t != null ? String(t.annualFee) : '',
    });
  };

  const handleAddPolicy = async () => {
    if (!policyUser) return;
    const payload: Record<string, unknown> = {};
    if (policyForm.templateId) payload.templateId = policyForm.templateId;
    if (policyForm.coverageType.trim()) payload.coverageType = policyForm.coverageType.trim();
    if (policyForm.deductible !== '') payload.deductible = Number(policyForm.deductible);
    if (policyForm.coveragePercent !== '') payload.coveragePercent = Number(policyForm.coveragePercent);
    if (policyForm.annualFee !== '') payload.annualFee = Number(policyForm.annualFee);
    if (!policyForm.templateId && (!payload.coverageType || payload.deductible === undefined || payload.coveragePercent === undefined || payload.annualFee === undefined)) {
      alert('Select a built-in plan or fill in all policy fields.');
      return;
    }
    setPolicySaving(true);
    try {
      await adminApi.post(`/users/${policyUser.id}/policies`, payload);
      setPolicyUser(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add policy.');
    } finally {
      setPolicySaving(false);
    }
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setForm({
      phone: u.phone || '',
      address: u.address || '',
      nic: u.nic || '',
      licenseType: u.licenseType || '',
      annualFee: u.annualFee != null ? String(u.annualFee) : '',
      joinedAt: u.joinedAt ? new Date(u.joinedAt).toISOString().slice(0, 10) : '',
    });
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await adminApi.patch(`/users/${editUser.id}`, form);
      setEditUser(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleDeleteUser = async (u: AdminUser) => {
    const parts = [
      u._count?.vehicles ? `${u._count.vehicles} vehicle(s)` : '',
      u._count?.claims ? `${u._count.claims} claim(s)` : '',
    ].filter(Boolean).join(' and ');
    const msg = `Delete ${u.firstName} ${u.lastName}?\n\nThis permanently removes the user${parts ? ` together with ${parts} and all related records` : ' and all their records'}.`;
    if (!window.confirm(msg)) return;
    try {
      await adminApi.delete(`/users/${u.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      if (expanded === u.id) setExpanded(null);
      if (editUser?.id === u.id) setEditUser(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400"></div></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 mt-1">{users.length} registered users</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Vehicles</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Claims</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <>
                  <tr key={u.id} className={`transition ${expanded === u.id ? 'bg-primary-50/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-gray-700"><Car className="h-3.5 w-3.5" />{u._count?.vehicles ?? 0}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-gray-700"><ClipboardList className="h-3.5 w-3.5" />{u._count?.claims ?? 0}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(u.joinedAt || u.createdAt).toLocaleDateString()}
                      {!u.joinedAt && <span className="text-[10px] text-gray-400 ml-1">(registered)</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} title="Edit user details"
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteUser(u)} title="Delete user"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                          {expanded === u.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === u.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-5 py-4">
                        {/* Insurance records */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm mb-4">
                          <div><p className="text-xs text-gray-400 uppercase font-medium">Phone</p><p className="text-gray-700">{u.phone || '—'}</p></div>
                          <div><p className="text-xs text-gray-400 uppercase font-medium">NIC</p><p className="text-gray-700">{u.nic || '—'}</p></div>
                          <div><p className="text-xs text-gray-400 uppercase font-medium">License Type</p><p className="text-gray-700">{u.licenseType || '—'}</p></div>
                          <div><p className="text-xs text-gray-400 uppercase font-medium">Annual Fee</p><p className="text-gray-700">{u.annualFee != null ? `Rs. ${u.annualFee.toLocaleString()}` : '—'}</p></div>
                          <div><p className="text-xs text-gray-400 uppercase font-medium">Joined</p><p className="text-gray-700">{u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '—'}</p></div>
                          <div><p className="text-xs text-gray-400 uppercase font-medium">Address</p><p className="text-gray-700">{u.address || '—'}</p></div>
                        </div>

                        {/* Current policy — claims are deducted from it */}
                        <div className="border-t border-gray-200 pt-3 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5" /> Policy
                            </p>
                            <button onClick={() => openPolicyModal(u)}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                              <Plus className="h-3 w-3" /> Add Policy
                            </button>
                          </div>
                          {u.policies?.length ? (() => {
                            const p = u.policies[0];
                            const active = new Date(p.endDate) >= new Date();
                            return (
                              <>
                                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white border border-green-200 rounded-lg">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {active ? 'Active' : 'Expired'}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">{p.template?.name || p.coverageType}</span>
                                  <span className="text-xs text-gray-500">
                                    {p.coverageType} · {p.coveragePercent}% cover · Rs. {p.deductible.toLocaleString()} deductible ·
                                    Rs. {p.premiumAmount.toLocaleString()}/yr · until {new Date(p.endDate).toLocaleDateString()}
                                  </span>
                                </div>
                                {u.policies.length > 1 && (
                                  <p className="text-[10px] text-gray-400 mt-1">+{u.policies.length - 1} earlier policy{u.policies.length > 2 ? 'ies' : ''}</p>
                                )}
                              </>
                            );
                          })() : (
                            <p className="text-sm text-gray-400">No policy yet — claims are not covered by a plan.</p>
                          )}
                        </div>

                        {/* Vehicles under this user — clicking one opens the Vehicles tab scoped to the owner */}
                        <div className="border-t border-gray-200 pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                              <Car className="h-3.5 w-3.5" /> Vehicles ({u.vehicles?.length ?? 0})
                            </p>
                            <Link to={`/admin/vehicles?user=${u.id}&add=1`}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                              <Plus className="h-3 w-3" /> Add Vehicle
                            </Link>
                          </div>
                          {u.vehicles?.length ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {u.vehicles.map((v) => (
                                <div key={v.id} className="flex items-center justify-between gap-3 p-2.5 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition">
                                  <Link to={`/admin/vehicles?user=${u.id}`} className="min-w-0 flex-1" title="Open in Vehicles tab">
                                    <p className="text-sm font-medium text-gray-900 truncate">{v.year} {v.make} {v.model}</p>
                                    <p className="text-xs text-gray-500">
                                      {v.licensePlate} · <span className="capitalize">{v.color}</span>
                                      {v.vin ? ` · VIN ${v.vin}` : ''}
                                    </p>
                                  </Link>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                      <ClipboardList className="h-3 w-3" /> {v._count?.claims ?? 0}
                                    </span>
                                    <Link to={`/admin/claims?vehicle=${v.id}`}
                                      className="text-xs text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap">
                                      Claims →
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No vehicles registered.</p>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button onClick={() => openEdit(u)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition">
                            <Pencil className="h-3.5 w-3.5" /> Edit Details
                          </button>
                          <Link to={`/admin/claims?user=${u.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition">
                            <ClipboardList className="h-3.5 w-3.5" /> View Claims
                          </Link>
                          <Link to={`/admin/vehicles?user=${u.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition">
                            <Car className="h-3.5 w-3.5" /> All Vehicles
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && <div className="p-12 text-center text-gray-400"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No users found</p></div>}
      </div>

      {/* Edit user details modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !saving && setEditUser(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
                <p className="text-xs text-gray-500">{editUser.firstName} {editUser.lastName} · {editUser.email}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Phone</label>
                  <input value={form.phone} onChange={set('phone')} placeholder="07X XXX XXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">NIC</label>
                  <input value={form.nic} onChange={set('nic')} placeholder="e.g. 9XXXXXXXXX or 20XXXXXXXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">License Type</label>
                  <select value={form.licenseType} onChange={set('licenseType')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                    {LICENSE_TYPES.map((t) => (
                      <option key={t} value={t}>{t === '' ? '— Select —' : t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Annual Fee (Rs.)</label>
                  <input type="number" min="0" value={form.annualFee} onChange={set('annualFee')} placeholder="e.g. 45000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Joined Date</label>
                  <input type="date" value={form.joinedAt} onChange={set('joinedAt')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Registered</label>
                  <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    {new Date(editUser.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Address</label>
                <textarea value={form.address} onChange={set('address')} rows={2} placeholder="Street, City"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-xl">
              <button onClick={() => setEditUser(null)} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add policy modal — insurance company assigns a plan to the user */}
      {policyUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !policySaving && setPolicyUser(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add Policy</h3>
                <p className="text-xs text-gray-500">{policyUser.firstName} {policyUser.lastName} · {policyUser.email}</p>
              </div>
              <button onClick={() => setPolicyUser(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Built-in Plan</label>
                <select value={policyForm.templateId} onChange={(e) => pickTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="">— Custom policy —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.coverageType} · {t.coveragePercent}% · Rs. {t.annualFee.toLocaleString()}/yr)</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">Selecting a plan pre-fills the fields below — adjust them for this user if needed.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Insurance Type</label>
                <input value={policyForm.coverageType} onChange={(e) => setPolicyForm((f) => ({ ...f, coverageType: e.target.value }))} placeholder="e.g. Comprehensive"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Coverage %</label>
                  <input type="number" min="1" max="100" value={policyForm.coveragePercent} onChange={(e) => setPolicyForm((f) => ({ ...f, coveragePercent: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Deductible (Rs.)</label>
                  <input type="number" min="0" value={policyForm.deductible} onChange={(e) => setPolicyForm((f) => ({ ...f, deductible: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Annual Fee (Rs.)</label>
                  <input type="number" min="0" value={policyForm.annualFee} onChange={(e) => setPolicyForm((f) => ({ ...f, annualFee: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Payout = (estimate − deductible) × coverage %. The policy runs for one year, the user's annual fee is synced, and existing uncovered claims are linked to it.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-xl">
              <button onClick={() => setPolicyUser(null)} disabled={policySaving}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleAddPolicy} disabled={policySaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {policySaving ? 'Adding...' : 'Add Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
