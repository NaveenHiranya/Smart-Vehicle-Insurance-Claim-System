import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { Car, ClipboardList, Plus, Search, X } from 'lucide-react';

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

  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add-vehicle modal — ?add=1 (typically arriving from a user row) opens it pre-selected
  const [addOpen, setAddOpen] = useState(searchParams.get('add') === '1');
  const [form, setForm] = useState({ ...emptyForm, userId: userFilter || '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    const params = new URLSearchParams();
    if (userFilter) params.set('user', userFilter);
    if (search.trim()) params.set('search', search.trim());
    adminApi.get(`/vehicles?${params}`).then((r) => setVehicles(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [userFilter]);

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
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Owner</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Vehicle</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Plate</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Color</th>
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
                  <td className="px-5 py-3 text-gray-600">{v.licensePlate}</td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{v.color}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <ClipboardList className="h-3.5 w-3.5" />{v._count?.claims ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/admin/claims?vehicle=${v.id}`}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap">
                      View Claims →
                    </Link>
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
    </div>
  );
}
