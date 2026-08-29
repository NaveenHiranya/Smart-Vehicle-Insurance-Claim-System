import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertCircle } from 'lucide-react';

export function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', nic: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(form);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Shield className="h-10 w-10 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">Flash Claim</h1>
          </div>
          <p className="text-gray-600">Create your account to get started</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Account</h2>

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-danger-600 shrink-0 mt-0.5" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" value={form.firstName} onChange={update('firstName')} required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" value={form.lastName} onChange={update('lastName')} required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={update('email')} required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                placeholder="you@example.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={form.password} onChange={update('password')} required minLength={6}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                placeholder="At least 6 characters" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIC</label>
              <input type="text" value={form.nic} onChange={update('nic')} required
                pattern="^\d{9}[vVxX]$|^\d{12}$"
                title="9 digits followed by V/X, or 12 digits (e.g. 852345678V or 199852345678)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                placeholder="852345678V or 199852345678" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input type="tel" value={form.phone} onChange={update('phone')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                placeholder="+94 77 123 4567" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
