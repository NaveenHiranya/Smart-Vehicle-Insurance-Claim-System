import { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import { Users, Car, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';

export function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    adminApi.get('/users').then((r) => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400"></div></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 mt-1">{users.length} registered users</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
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
            {users.map((u: any) => (
              <>
                <tr key={u.id} className="hover:bg-gray-50 transition">
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
                  <td className="px-5 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                      className="p-1 text-gray-400 hover:text-gray-700 transition">
                      {expanded === u.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
                {expanded === u.id && (
                  <tr key={`${u.id}-detail`} className="bg-gray-50">
                    <td colSpan={6} className="px-5 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><p className="text-xs text-gray-400 uppercase font-medium">Phone</p><p className="text-gray-700">{u.phone || '—'}</p></div>
                        <div><p className="text-xs text-gray-400 uppercase font-medium">Address</p><p className="text-gray-700">{u.address || '—'}</p></div>
                        <div><p className="text-xs text-gray-400 uppercase font-medium">Vehicles</p><p className="text-gray-700">{u._count?.vehicles ?? 0}</p></div>
                        <div><p className="text-xs text-gray-400 uppercase font-medium">Total Claims</p><p className="text-gray-700">{u._count?.claims ?? 0}</p></div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="p-12 text-center text-gray-400"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No users found</p></div>}
      </div>
    </div>
  );
}
