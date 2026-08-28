import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { Claim } from '../types';
import { ClipboardList, Plus } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const severityColors: Record<string, string> = {
  MINOR: 'text-green-600',
  MODERATE: 'text-yellow-600',
  SEVERE: 'text-red-600',
};

export function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? `?status=${filter}` : '';
    api.get(`/claims${params}`).then((res) => { setClaims(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Claims</h1>
        <div className="flex items-center gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <Link to="/claims/new" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Claim
          </Link>
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No claims found</h3>
          <p className="text-gray-500 mb-4">File your first claim to get started</p>
          <Link to="/claims/new" className="text-primary-600 font-medium hover:text-primary-700">Start a new claim</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim: Claim) => (
            <Link key={claim.id} to={`/claims/${claim.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {claim.vehicle?.make} {claim.vehicle?.model} {claim.vehicle?.year}
                    </h3>
                    {claim.damageAssessment && (
                      <span className={`text-xs font-medium ${severityColors[claim.damageAssessment.overallSeverity] || ''}`}>
                        {claim.damageAssessment.overallSeverity}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{claim.incidentLocation} - {new Date(claim.incidentDate).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-1">{claim.incidentDescription}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[claim.status] || ''}`}>
                    {claim.status.replace('_', ' ')}
                  </span>
                  <div className="text-xs text-gray-400">
                    {claim._count?.images || 0} images
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
