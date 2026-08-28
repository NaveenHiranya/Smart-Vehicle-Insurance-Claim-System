import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Wrench, Shield, User, AlertCircle, Clock } from 'lucide-react';
import garageApi from '../../services/garageApi';

export function GarageLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsPending(false);
    try {
      const res = await garageApi.post('/auth/login', { email, password });
      const { garage, token } = res.data;
      localStorage.setItem('garageToken', token);
      localStorage.setItem('garageUser', JSON.stringify(garage));
      navigate('/garage/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed.';
      const pending = msg.toLowerCase().includes('pending') || msg.toLowerCase().includes('approval');
      setIsPending(pending);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-orange-600 rounded-2xl">
              <Wrench className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Flash Claim</h1>
          <p className="text-gray-400 mt-1">Garage Portal</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to Garage</h2>
          {error && (
            isPending ? (
              <div className="mb-4 p-3 bg-yellow-900/40 border border-yellow-600 rounded-lg flex items-start gap-2">
                <Clock className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-300">Account Pending Approval</p>
                  <p className="text-xs text-yellow-400 mt-0.5">{error}</p>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder="garage@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-sm text-gray-400 mt-4 text-center">
            Don't have an account?{' '}
            <Link to="/garage/register" className="text-orange-400 hover:text-orange-300 font-medium">Register</Link>
          </p>
          <div className="mt-6 pt-5 border-t border-gray-700 space-y-2">
            <Link to="/admin/login"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border border-gray-600 text-sm font-medium text-primary-400 hover:bg-gray-700 hover:text-primary-300 transition">
              <Shield className="h-4 w-4" />
              Admin Portal
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border border-gray-600 text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition">
              <User className="h-4 w-4" />
              User Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
