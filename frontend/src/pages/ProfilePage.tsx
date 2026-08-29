import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { InsurancePolicy } from '../types';
import { Save, Shield, BadgeCheck, IdCard, Wallet, CalendarDays } from 'lucide-react';

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [policy, setPolicy] = useState<InsurancePolicy | null>(null);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Latest policy provides the insurance type shown in the details card
  useEffect(() => {
    api.get('/policies').then((r) => setPolicy(r.data[0] || null)).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateProfile(form);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const update = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      {/* Insurance details — records managed by the insurance company */}
      <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" /> Insurance Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <IdCard className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">NIC</p>
              <p className="text-sm text-gray-900 font-medium">{user?.nic || 'Not provided yet'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Wallet className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Annual Fee</p>
              <p className="text-sm text-gray-900 font-medium">
                {user?.annualFee != null ? `Rs. ${user.annualFee.toLocaleString()}` : 'Not set yet'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Insurance Type</p>
              <p className="text-sm text-gray-900 font-medium">
                {policy ? policy.coverageType : 'No active policy'}
                {policy && <span className="text-xs text-gray-400 font-normal ml-1">({policy.coveragePercent}% cover)</span>}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CalendarDays className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Joined</p>
              <p className="text-sm text-gray-900 font-medium">
                {user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </div>
        {policy && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
            <BadgeCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <span>
              {policy.template?.name || policy.providerName} · Policy #{policy.policyNumber} ·
              Rs. {policy.deductible.toLocaleString()} deductible · valid until {new Date(policy.endDate).toLocaleDateString()}
            </span>
          </div>
        )}
        <p className="mt-4 text-xs text-gray-400">
          These details are managed by your insurance company. Contact them to update your NIC, annual fee, or insurance plan.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
          <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-xl font-bold text-primary-700">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" value={form.firstName} onChange={update('firstName')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" value={form.lastName} onChange={update('lastName')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={user?.email} disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={update('phone')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="+94 77 123 4567" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea value={form.address} onChange={update('address')} rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none" placeholder="Your address" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
