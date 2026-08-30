import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { Users, ClipboardList, FileText, Clock, ArrowRight, Car, MessageCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', GARAGE_REVIEW: 'bg-orange-100 text-orange-700',
  GARAGE_ESTIMATED: 'bg-purple-100 text-purple-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-green-100 text-green-700',
};

export function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentClaims, setRecentClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.get('/stats'), adminApi.get('/claims')])
      .then(([sRes, cRes]) => {
        setStats(sRes.data);
        setRecentClaims(cRes.data.slice(0, 8));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400"></div></div>;

  const totalClaims = (Object.values(stats?.claimsByStatus || {}) as number[]).reduce((a, b) => a + b, 0);
  const pendingClaims = (stats?.claimsByStatus?.SUBMITTED || 0) + (stats?.claimsByStatus?.UNDER_REVIEW || 0) + (stats?.claimsByStatus?.GARAGE_REVIEW || 0) + (stats?.claimsByStatus?.GARAGE_ESTIMATED || 0);

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">System overview and recent activity</p>
      </div>

      {/* Stats — each card navigates to its section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Link to="/admin/users" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
            <span className="text-sm text-gray-500 font-medium">Total Users</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-900">{stats?.userCount ?? 0}</p>
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              Manage users <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
        <Link to="/admin/claims" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-primary-300 hover:shadow-md transition group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-100 rounded-lg"><ClipboardList className="h-5 w-5 text-primary-600" /></div>
            <span className="text-sm text-gray-500 font-medium">Total Claims</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-900">{totalClaims}</p>
            <span className="text-xs text-primary-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              View claims <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
        <Link to="/admin/claims?status=PENDING" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-yellow-300 hover:shadow-md transition group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="h-5 w-5 text-yellow-600" /></div>
            <span className="text-sm text-gray-500 font-medium">Pending Claims</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-900">{pendingClaims}</p>
            <span className="text-xs text-yellow-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              Review now <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
        <Link to="/admin/vehicles?verification=PENDING" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-amber-300 hover:shadow-md transition group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg"><Car className="h-5 w-5 text-amber-600" /></div>
            <span className="text-sm text-gray-500 font-medium">Pending Vehicles</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-900">{stats?.pendingVehicles ?? 0}</p>
            <span className="text-xs text-amber-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              Verify now <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
        <Link to="/admin/documents" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-orange-300 hover:shadow-md transition group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg"><FileText className="h-5 w-5 text-orange-600" /></div>
            <span className="text-sm text-gray-500 font-medium">Docs Awaiting</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-900">{stats?.pendingDocs ?? 0}</p>
            <span className="text-xs text-orange-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              Approve docs <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
        <Link to="/admin/support" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-red-300 hover:shadow-md transition group">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${(stats?.openTickets ?? 0) > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <MessageCircle className={`h-5 w-5 ${(stats?.openTickets ?? 0) > 0 ? 'text-red-600' : 'text-gray-500'}`} />
            </div>
            <span className="text-sm text-gray-500 font-medium">Support Tickets</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-900">{stats?.openTickets ?? 0}</p>
            <span className="text-xs text-red-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              View tickets <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* Claim status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Claims by Status</h2>
          <div className="space-y-2">
            {Object.entries(stats?.claimsByStatus || {}).map(([status, count]) => (
              <Link key={status} to={`/admin/claims?status=${status}`}
                className="flex items-center justify-between px-2 -mx-2 py-1 rounded-lg hover:bg-gray-50 transition">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
                  {status.replace('_', ' ')}
                </span>
                <span className="font-bold text-gray-900">{count as number}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Claims</h2>
            <Link to="/admin/claims" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentClaims.map((c: any) => (
              <Link key={c.id} to={`/admin/claims/${c.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {c.user?.firstName} {c.user?.lastName} — {c.vehicle?.year} {c.vehicle?.make} {c.vehicle?.model}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(c.incidentDate).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[c.status] || 'bg-gray-100'}`}>
                  {c.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
