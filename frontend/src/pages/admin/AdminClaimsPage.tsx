import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { Search, Filter, ThumbsUp, Users, Car, X } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', GARAGE_REVIEW: 'bg-orange-100 text-orange-700',
  GARAGE_ESTIMATED: 'bg-purple-100 text-purple-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-green-100 text-green-700',
};
const severityColors: Record<string, string> = {
  MINOR: 'bg-green-100 text-green-700', MODERATE: 'bg-yellow-100 text-yellow-700', SEVERE: 'bg-red-100 text-red-700',
};
const statuses = ['ALL', 'PENDING', 'DRAFT', 'SUBMITTED', 'GARAGE_REVIEW', 'GARAGE_ESTIMATED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];
// PENDING is a virtual filter combining every in-progress status
const PENDING_STATUSES = 'SUBMITTED,UNDER_REVIEW,GARAGE_REVIEW,GARAGE_ESTIMATED';

export function AdminClaimsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const s = searchParams.get('status');
    return s && statuses.includes(s) ? s : 'ALL';
  });
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Scope filters arriving from the Users/Vehicles tabs (?user= / ?vehicle=)
  const userFilter = searchParams.get('user');
  const vehicleFilter = searchParams.get('vehicle');

  const load = () => {
    const params = new URLSearchParams();
    if (statusFilter === 'PENDING') params.set('status', PENDING_STATUSES);
    else if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    if (userFilter) params.set('user', userFilter);
    if (vehicleFilter) params.set('vehicle', vehicleFilter);
    adminApi.get(`/claims?${params}`).then((r) => setClaims(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, userFilter, vehicleFilter]);

  // Keep the URL in sync so dashboard links (?status=...) land on the right filter and are shareable
  const applyStatusFilter = (s: string) => {
    setStatusFilter(s);
    const next = new URLSearchParams(searchParams);
    if (s === 'ALL') next.delete('status');
    else next.set('status', s);
    setSearchParams(next, { replace: true });
  };

  const clearScopeFilter = (key: 'user' | 'vehicle') => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const handleApproveClaim = async (claimId: string) => {
    setApprovingId(claimId);
    try {
      await adminApi.patch(`/claims/${claimId}/status`, { status: 'APPROVED' });
      load();
    } catch { alert('Failed to approve claim'); }
    finally { setApprovingId(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400"></div></div>;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Claims</h1>
        <p className="text-gray-500 mt-1">{claims.length} claims</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5 flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user or vehicle..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">Search</button>
        </form>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex flex-wrap gap-1">
            {statuses.map((s) => (
              <button key={s} onClick={() => applyStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  statusFilter === s
                    ? s === 'PENDING' ? 'bg-yellow-500 text-white' : 'bg-primary-600 text-white'
                    : s === 'PENDING' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s === 'PENDING' ? 'Pending' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scope filter chips — arrived from Users/Vehicles tabs */}
      {(userFilter || vehicleFilter) && (
        <div className="flex flex-wrap gap-2 mb-5">
          {userFilter && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700 font-medium">
              <Users className="h-3 w-3" />
              User: {claims[0]?.user ? `${claims[0].user.firstName} ${claims[0].user.lastName}` : 'selected user'}
              <button onClick={() => clearScopeFilter('user')} className="hover:text-blue-900" title="Clear user filter">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {vehicleFilter && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 rounded-full text-xs text-purple-700 font-medium">
              <Car className="h-3 w-3" />
              Vehicle: {claims[0]?.vehicle ? `${claims[0].vehicle.year} ${claims[0].vehicle.make} ${claims[0].vehicle.model}` : 'selected vehicle'}
              <button onClick={() => clearScopeFilter('vehicle')} className="hover:text-purple-900" title="Clear vehicle filter">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Vehicle</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Severity</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Imgs</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Docs</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {claims.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50 transition">
                <td className="px-5 py-3 font-medium text-gray-900">{c.user?.firstName} {c.user?.lastName}</td>
                <td className="px-5 py-3 text-gray-600">{c.vehicle?.year} {c.vehicle?.make} {c.vehicle?.model}</td>
                <td className="px-5 py-3 text-gray-500">{new Date(c.incidentDate).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[c.status]}`}>{c.status.replace('_', ' ')}</span>
                </td>
                <td className="px-5 py-3 text-center">
                  {c.damageAssessment?.overallSeverity
                    ? <span className={`text-xs px-2 py-1 rounded-full font-medium ${severityColors[c.damageAssessment.overallSeverity]}`}>{c.damageAssessment.overallSeverity}</span>
                    : <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-5 py-3 text-center text-gray-600">{c._count?.images ?? 0}</td>
                <td className="px-5 py-3 text-center text-gray-600">{c._count?.documents ?? 0}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveClaim(c.id)}
                      disabled={approvingId === c.id || c.status === 'APPROVED'}
                      title={c.status === 'APPROVED' ? 'Already approved' : 'Approve this claim'}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 transition"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {approvingId === c.id ? '...' : c.status === 'APPROVED' ? 'Approved' : 'Approve'}
                    </button>
                    <Link to={`/admin/claims/${c.id}`} className="text-xs text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap">Review →</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {claims.length === 0 && <div className="p-12 text-center text-gray-400"><p>No claims found</p></div>}
      </div>
    </div>
  );
}
