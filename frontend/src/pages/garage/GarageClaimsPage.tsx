import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import garageApi from '../../services/garageApi';
import { ClipboardList, Clock, Wrench, CheckCircle, ChevronRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', GARAGE_REVIEW: 'bg-orange-100 text-orange-700',
  GARAGE_ESTIMATED: 'bg-purple-100 text-purple-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-green-100 text-green-700',
};

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'GARAGE_REVIEW', label: 'Awaiting Review' },
  { key: 'GARAGE_ESTIMATED', label: 'Estimated' },
  { key: 'COMPLETED', label: 'Completed' },
];

export function GarageClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    garageApi.get('/claims')
      .then((r) => setClaims(r.data))
      .catch(() => setError('Failed to load claims. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? claims : claims.filter((c) => c.status === filter);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Claims</h1>
      <p className="text-gray-500 mb-5 text-sm">All claims assigned to your garage</p>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => {
          const count = f.key === 'ALL' ? claims.length : claims.filter((c) => c.status === f.key).length;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f.key ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50'
              }`}>
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-12 text-center">
          <ClipboardList className="h-12 w-12 text-red-300 mx-auto mb-3" />
          <p className="text-red-600 mb-3">{error}</p>
          <button onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {claims.length === 0 ? 'No claims assigned yet' : 'No claims match this filter'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
          {filtered.map((claim) => (
            <Link key={claim.id} to={`/garage/claims/${claim.id}`}
              className="flex items-center justify-between p-4 hover:bg-orange-50/50 transition">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">
                    {claim.vehicle?.make} {claim.vehicle?.model} {claim.vehicle?.year}
                  </p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[claim.status] || 'bg-gray-100 text-gray-700'}`}>
                    {claim.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {claim.user?.firstName} {claim.user?.lastName} &bull; {claim.vehicle?.licensePlate} &bull; {new Date(claim.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {claim._count?.images != null && (
                    <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> {claim._count.images} images</span>
                  )}
                  {claim.damageAssessment ? (
                    <span className="flex items-center gap-1 text-blue-500"><CheckCircle className="h-3 w-3" /> AI assessed</span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-600"><Clock className="h-3 w-3" /> AI pending</span>
                  )}
                  {claim.garageEstimate && (
                    <span className="text-green-600 font-medium">Estimate submitted</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 shrink-0 ml-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
