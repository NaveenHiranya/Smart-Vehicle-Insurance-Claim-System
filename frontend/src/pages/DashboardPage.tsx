import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Claim, Vehicle } from '../types';
import { Car, ClipboardList, FileText, Plus, ArrowRight, ShieldCheck, AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Vehicles include their insurance policy — insurance is per vehicle now
        const [vRes, cRes] = await Promise.all([api.get('/vehicles'), api.get('/claims')]);
        setVehicles(vRes.data);
        setClaims(cRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
    GARAGE_REVIEW: 'bg-orange-100 text-orange-700',
    GARAGE_ESTIMATED: 'bg-purple-100 text-purple-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-green-100 text-green-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Here's your insurance claim overview</p>
      </div>

      {/* My Vehicles — one insurance card per vehicle */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">My Vehicles</h2>
          <Link to="/vehicles/new" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            <Plus className="h-4 w-4" /> Add Vehicle
          </Link>
        </div>
        {vehicles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Car className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-2">No vehicles registered yet — add one and choose its insurance policy.</p>
            <Link to="/vehicles/new" className="text-primary-600 text-sm font-medium hover:text-primary-700">Add a vehicle</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vehicles.map((v: Vehicle) => {
              const policy = v.insurancePolicy;
              const active = policy ? new Date(policy.endDate) >= new Date() : false;
              return (
                <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 bg-primary-100 rounded-lg shrink-0"><Car className="h-5 w-5 text-primary-600" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{v.year} {v.make} {v.model}</p>
                        <p className="text-xs text-gray-500">{v.licensePlate}</p>
                      </div>
                    </div>
                    {v.verificationStatus === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium shrink-0">
                        <CheckCircle className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : v.verificationStatus === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium shrink-0">
                        <XCircle className="h-3.5 w-3.5" /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium shrink-0">
                        <AlertCircle className="h-3.5 w-3.5" /> Verification
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Insurance</p>
                      <p className="font-medium text-gray-900 flex items-center gap-1">
                        {policy
                          ? (active
                            ? <><ShieldCheck className="h-4 w-4 text-green-600" /> Active</>
                            : <><AlertTriangle className="h-4 w-4 text-amber-500" /> Expired</>)
                          : <><AlertTriangle className="h-4 w-4 text-gray-400" /> None</>}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Policy #</p>
                      <p className="font-medium text-gray-900 truncate">{policy ? policy.policyNumber : '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link to={`/vehicles/${v.id}`}
                      className="flex-1 text-center px-3 py-2 bg-primary-50 text-primary-700 border border-primary-100 rounded-lg text-sm font-medium hover:bg-primary-100 transition">
                      View Vehicle
                    </Link>
                    {v.verificationStatus === 'VERIFIED' ? (
                      <Link to={`/claims/new?vehicleId=${v.id}`}
                        className="flex-1 text-center px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                        New Claim
                      </Link>
                    ) : (
                      <span className="flex-1 text-center px-3 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
                        title="Claims unlock once the vehicle and its insurance policy are verified">
                        Claim Unavailable
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-primary-100 rounded-lg"><Car className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" /></div>
            <span className="text-xs sm:text-sm font-medium text-gray-600">Vehicles</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{vehicles.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg"><ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" /></div>
            <span className="text-xs sm:text-sm font-medium text-gray-600">Active</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {claims.filter((c: Claim) => !['COMPLETED', 'REJECTED'].includes(c.status)).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" /></div>
            <span className="text-xs sm:text-sm font-medium text-gray-600">Total</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{claims.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
        <Link to="/claims/new"
          className="flex items-center gap-4 bg-primary-600 text-white rounded-xl p-4 sm:p-5 hover:bg-primary-700 transition shadow-sm">
          <Plus className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
          <div>
            <p className="font-semibold text-base sm:text-lg">File New Claim</p>
            <p className="text-primary-100 text-xs sm:text-sm">Start a new damage claim</p>
          </div>
        </Link>
        <Link to="/vehicles/new"
          className="flex items-center gap-4 bg-white text-gray-900 rounded-xl p-4 sm:p-5 hover:bg-gray-50 transition shadow-sm border border-gray-200">
          <Car className="h-7 w-7 sm:h-8 sm:w-8 text-gray-600 shrink-0" />
          <div>
            <p className="font-semibold text-base sm:text-lg">Add Vehicle</p>
            <p className="text-gray-500 text-xs sm:text-sm">Register a new vehicle</p>
          </div>
        </Link>
      </div>

      {/* Recent Claims */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Claims</h2>
          <Link to="/claims" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {claims.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No claims yet</p>
            <Link to="/claims/new" className="text-primary-600 text-sm font-medium hover:text-primary-700 mt-2 inline-block">
              File your first claim
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {claims.slice(0, 5).map((claim: Claim) => (
              <Link key={claim.id} to={`/claims/${claim.id}`}
                className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                    {claim.vehicle?.make} {claim.vehicle?.model} {claim.vehicle?.year}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {new Date(claim.incidentDate).toLocaleDateString()} · {claim.incidentLocation}
                  </p>
                </div>
                <span className={`shrink-0 px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${statusColors[claim.status] || 'bg-gray-100'}`}>
                  {claim.status.replace(/_/g, ' ')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
