import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import garageApi from '../../services/garageApi';
import { Wrench, ClipboardList, Clock, CheckCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', GARAGE_REVIEW: 'bg-orange-100 text-orange-700',
  GARAGE_ESTIMATED: 'bg-purple-100 text-purple-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-green-100 text-green-700',
};

export function GarageDashboardPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    garageApi.get('/claims').then((r) => setClaims(r.data)).finally(() => setLoading(false));
  }, []);

  const garageName = (() => {
    try { const g = JSON.parse(localStorage.getItem('garageUser') || '{}'); return g.name || 'Garage'; } catch { return 'Garage'; }
  })();

  const pendingReview = claims.filter((c) => c.status === 'GARAGE_REVIEW');
  const estimated = claims.filter((c) => ['GARAGE_ESTIMATED', 'UNDER_REVIEW', 'APPROVED'].includes(c.status));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{garageName}</h1>
      <p className="text-gray-500 mb-6">Garage Dashboard</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg"><Wrench className="h-5 w-5 text-orange-600" /></div>
            <span className="text-sm font-medium text-gray-600">Total Claims</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{claims.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div>
            <span className="text-sm font-medium text-gray-600">Pending Review</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">{pendingReview.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
            <span className="text-sm font-medium text-gray-600">Estimated / Processed</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{estimated.length}</p>
        </div>
      </div>

      {/* Claims needing review */}
      {pendingReview.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 mb-6">
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" /> Claims Awaiting Your Review
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingReview.map((claim) => (
              <Link key={claim.id} to={`/garage/claims/${claim.id}`}
                className="flex items-center justify-between p-4 hover:bg-orange-50 transition">
                <div>
                  <p className="font-medium text-gray-900">{claim.vehicle?.make} {claim.vehicle?.model} {claim.vehicle?.year}</p>
                  <p className="text-sm text-gray-500">{claim.user?.firstName} {claim.user?.lastName} &bull; {claim.vehicle?.licensePlate}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[claim.status]}`}>
                  {claim.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All claims */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-gray-600" /> All Assigned Claims
          </h2>
        </div>
        {claims.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No claims assigned yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {claims.map((claim) => (
              <Link key={claim.id} to={`/garage/claims/${claim.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                <div>
                  <p className="font-medium text-gray-900">{claim.vehicle?.make} {claim.vehicle?.model} {claim.vehicle?.year}</p>
                  <p className="text-sm text-gray-500">{claim.user?.firstName} {claim.user?.lastName} &bull; {claim.vehicle?.licensePlate}</p>
                </div>
                <div className="flex items-center gap-3">
                  {claim.garageEstimate && <span className="text-[10px] text-green-600 font-medium">Estimate submitted</span>}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[claim.status]}`}>
                    {claim.status.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
