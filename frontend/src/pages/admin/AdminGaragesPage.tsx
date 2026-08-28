import { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import { Wrench, ToggleLeft, ToggleRight, ThumbsUp } from 'lucide-react';

export function AdminGaragesPage() {
  const [garages, setGarages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGarages = () =>
    adminApi.get('/garages').then((r) => setGarages(r.data)).finally(() => setLoading(false));

  useEffect(() => { fetchGarages(); }, []);

  const handleToggle = async (id: string) => {
    try {
      await adminApi.patch(`/garages/${id}/toggle`);
      await fetchGarages();
    } catch { alert('Failed to toggle garage'); }
  };

  const handleApprove = async (id: string) => {
    try {
      await adminApi.patch(`/garages/${id}/approve`);
      await fetchGarages();
    } catch { alert('Failed to approve garage'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="h-7 w-7 text-orange-600" /> Registered Garages
        </h1>
        <p className="text-gray-500 mt-1">Manage registered garages in the system</p>
      </div>

      {garages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No garages registered yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase bg-gray-50">
                <th className="p-4">Garage</th>
                <th className="p-4">Contact</th>
                <th className="p-4">City</th>
                <th className="p-4">License</th>
                <th className="p-4 text-center">Claims</th>
                <th className="p-4 text-center">Estimates</th>
                <th className="p-4 text-center">Approval</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {garages.map((g) => (
                <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium text-gray-900">{g.name}</p>
                    <p className="text-xs text-gray-500">{g.ownerName}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-gray-700">{g.email}</p>
                    <p className="text-xs text-gray-500">{g.phone}</p>
                  </td>
                  <td className="p-4 text-gray-700">{g.city}</td>
                  <td className="p-4 text-xs text-gray-500">{g.licenseNumber}</td>
                  <td className="p-4 text-center font-medium">{g._count?.claims || 0}</td>
                  <td className="p-4 text-center font-medium">{g._count?.garageEstimates || 0}</td>
                  <td className="p-4 text-center">
                    {g.isApproved ? (
                      <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Approved</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700">Pending</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${g.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {g.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {!g.isApproved && (
                        <button onClick={() => handleApprove(g.id)}
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition"
                          title="Approve garage"
                        >
                          <ThumbsUp className="h-5 w-5" />
                        </button>
                      )}
                      <button onClick={() => handleToggle(g.id)}
                        className={`p-1.5 rounded-lg transition ${g.isActive ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}
                        title={g.isActive ? 'Deactivate garage' : 'Activate garage'}
                      >
                        {g.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
