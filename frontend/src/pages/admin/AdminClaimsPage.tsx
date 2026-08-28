import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { Search, Filter, ThumbsUp } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', GARAGE_REVIEW: 'bg-orange-100 text-orange-700',
  GARAGE_ESTIMATED: 'bg-purple-100 text-purple-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-green-100 text-green-700',
};
const severityColors: Record<string, string> = {
  MINOR: 'bg-green-100 text-green-700', MODERATE: 'bg-yellow-100 text-yellow-700', SEVERE: 'bg-red-100 text-red-700',
};
const statuses = ['ALL', 'DRAFT', 'SUBMITTED', 'GARAGE_REVIEW', 'GARAGE_ESTIMATED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];

export function AdminClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    adminApi.get(`/claims?${params}`).then((r) => setClaims(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

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
    <div className="max-w-7xl mx-auto">
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
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
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
        {claims.length === 0 && <div className="p-12 text-center text-gray-400"><p>No claims found</p></div>}
      </div>
    </div>
  );
}
