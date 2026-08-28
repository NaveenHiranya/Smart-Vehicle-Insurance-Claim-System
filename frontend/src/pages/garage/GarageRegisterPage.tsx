import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, CheckCircle } from 'lucide-react';
import garageApi from '../../services/garageApi';

export function GarageRegisterPage() {
  const [form, setForm] = useState({
    name: '', ownerName: '', email: '', password: '',
    phone: '', address: '', city: '', licenseNumber: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [f]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await garageApi.post('/auth/register', form);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-orange-600 rounded-2xl">
              <Wrench className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Flash Claim</h1>
          <p className="text-gray-400 mt-1">Register Your Garage</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
          {success ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-3">Registration Successful!</h2>
              <p className="text-gray-400 mb-2">
                Your garage registration has been submitted successfully.
              </p>
              <p className="text-yellow-400 font-medium mb-6">
                Your account is pending admin approval. You will be able to log in once approved.
              </p>
              <Link to="/garage/login"
                className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition">
                Go to Login
              </Link>
            </div>
          ) : (
            <>
          <h2 className="text-lg font-semibold text-white mb-6">Garage Registration</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-300">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Garage Name *</label>
                <input type="text" value={form.name} onChange={update('name')} required
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="AutoFix Garage" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Owner Name *</label>
                <input type="text" value={form.ownerName} onChange={update('ownerName')} required
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="John Doe" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={update('email')} required
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="garage@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={update('password')} required minLength={6}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Min 6 characters" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone *</label>
                <input type="tel" value={form.phone} onChange={update('phone')} required
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="+94 77 123 4567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">City *</label>
                <input type="text" value={form.city} onChange={update('city')} required
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Colombo" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Address *</label>
              <input type="text" value={form.address} onChange={update('address')} required
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="123 Main Street" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Business License Number *</label>
              <input type="text" value={form.licenseNumber} onChange={update('licenseNumber')} required
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="BL-12345" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition mt-2">
              {loading ? 'Registering...' : 'Register Garage'}
            </button>
          </form>
          <p className="text-sm text-gray-400 mt-4 text-center">
            Already have an account?{' '}
            <Link to="/garage/login" className="text-orange-400 hover:text-orange-300 font-medium">Sign In</Link>
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
