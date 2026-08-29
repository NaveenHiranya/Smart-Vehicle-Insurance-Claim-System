import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Claim, Vehicle } from '../types';
import { Car, ClipboardList, Plus, ArrowRight, ShieldCheck, AlertTriangle, CheckCircle, AlertCircle, XCircle, ChevronRight, Zap } from 'lucide-react';
import { CarIllustration } from '../components/CarIllustration';

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

  const activeClaims = claims.filter((c: Claim) => !['COMPLETED', 'REJECTED'].includes(c.status)).length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero banner — greeting, quick actions and the key stats in one place */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-800 via-primary-600 to-primary-400 p-6 text-white shadow-xl shadow-primary-600/20 sm:p-8">
        {/* decorative layers */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden="true">
          <defs>
            <pattern id="dash-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dash-dots)" />
        </svg>
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-10 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-200">{greeting}</p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Welcome back, {user?.firstName}</h1>
            <p className="mt-2 text-sm text-primary-100">Here's your insurance claim overview at a glance.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/claims/new"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-sky-50">
                <Plus className="h-4 w-4" /> File New Claim
              </Link>
              <Link to="/vehicles/new"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                <Car className="h-4 w-4" /> Add Vehicle
              </Link>
            </div>
          </div>

          <div className="hidden w-52 shrink-0 animate-float opacity-95 xl:block">
            <CarIllustration className="w-full" />
          </div>

          {/* Key stats — hidden on phones to keep the mobile hero compact */}
          <div className="hidden grid-cols-3 gap-3 sm:grid sm:gap-4 lg:shrink-0">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
              <Car className="h-5 w-5 text-sky-200" />
              <p className="mt-2 text-2xl font-bold leading-none sm:text-3xl">{vehicles.length}</p>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-primary-100 sm:text-xs">Vehicles</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
              <ClipboardList className="h-5 w-5 text-sky-200" />
              <p className="mt-2 text-2xl font-bold leading-none sm:text-3xl">{activeClaims}</p>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-primary-100 sm:text-xs">Active Claims</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
              <Zap className="h-5 w-5 text-sky-200" />
              <p className="mt-2 text-2xl font-bold leading-none sm:text-3xl">{claims.length}</p>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-primary-100 sm:text-xs">Total Claims</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Vehicles — one insurance card per vehicle */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
            <Car className="h-5 w-5 text-primary-600" /> My Vehicles
          </h2>
          <Link to="/vehicles/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 transition hover:border-primary-300 hover:bg-primary-50">
            <Plus className="h-4 w-4" /> Add Vehicle
          </Link>
        </div>
        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
              <Car className="h-7 w-7 text-primary-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No vehicles registered yet</p>
            <p className="mt-0.5 text-sm text-gray-500">Add a vehicle and choose its insurance policy to enable claims.</p>
            <Link to="/vehicles/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-600/25 transition hover:from-primary-700 hover:to-primary-800">
              <Plus className="h-4 w-4" /> Add your first vehicle
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {vehicles.map((v: Vehicle) => {
              const policy = v.insurancePolicy;
              const active = policy ? new Date(policy.endDate) >= new Date() : false;
              return (
                <div key={v.id}
                  className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-100 hover:shadow-lg hover:shadow-primary-600/10">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-600/25">
                        <Car className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{v.year} {v.make} {v.model}</p>
                        <p className="text-xs font-medium tracking-wide text-gray-400">{v.licensePlate}</p>
                      </div>
                    </div>
                    {v.verificationStatus === 'VERIFIED' ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : v.verificationStatus === 'REJECTED' ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                        <XCircle className="h-3.5 w-3.5" /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5" /> Verification
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Insurance</p>
                      <p className="flex items-center gap-1 font-medium text-gray-900">
                        {policy
                          ? (active
                            ? <><ShieldCheck className="h-4 w-4 text-green-600" /> Active</>
                            : <><AlertTriangle className="h-4 w-4 text-amber-500" /> Expired</>)
                          : <><AlertTriangle className="h-4 w-4 text-gray-400" /> None</>}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Policy #</p>
                      <p className="truncate font-medium text-gray-900">{policy ? policy.policyNumber : '—'}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link to={`/vehicles/${v.id}`}
                      className="flex-1 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-center text-sm font-medium text-primary-700 transition hover:bg-primary-100">
                      View Vehicle
                    </Link>
                    {v.verificationStatus === 'VERIFIED' ? (
                      <Link to={`/claims/new?vehicleId=${v.id}`}
                        className="flex-1 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-3 py-2 text-center text-sm font-medium text-white shadow-sm shadow-primary-600/25 transition hover:from-primary-700 hover:to-primary-800">
                        New Claim
                      </Link>
                    ) : (
                      <span className="flex-1 cursor-not-allowed rounded-xl bg-gray-100 px-3 py-2 text-center text-sm font-medium text-gray-400"
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

      {/* Recent Claims */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
            <ClipboardList className="h-5 w-5 text-primary-600" /> Recent Claims
          </h2>
          <Link to="/claims" className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {claims.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
              <ClipboardList className="h-7 w-7 text-primary-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No claims yet</p>
            <p className="mt-0.5 text-sm text-gray-500">When you file a claim it will appear here.</p>
            <Link to="/claims/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-600/25 transition hover:from-primary-700 hover:to-primary-800">
              <Plus className="h-4 w-4" /> File your first claim
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {claims.slice(0, 5).map((claim: Claim) => (
              <Link key={claim.id} to={`/claims/${claim.id}`}
                className="group flex items-center gap-3 p-4 transition hover:bg-primary-50/40 sm:gap-4 sm:px-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Car className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                    {claim.vehicle?.make} {claim.vehicle?.model} {claim.vehicle?.year}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">
                    {new Date(claim.incidentDate).toLocaleDateString()} · {claim.incidentLocation}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 ${statusColors[claim.status] || 'bg-gray-100 text-gray-600'}`}>
                  {claim.status.replace(/_/g, ' ')}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary-600" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
