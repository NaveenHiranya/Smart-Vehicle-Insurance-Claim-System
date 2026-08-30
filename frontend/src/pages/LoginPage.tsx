import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Lock, Wrench, Mail, ArrowRight } from 'lucide-react';
import { AuthBrandPanel, AuthMobileBrand } from '../components/AuthBrandPanel';
import { GoogleLoginButton } from '../components/GoogleLoginButton';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Google Identity Services hands us a signed ID token (credential);
  // the backend verifies it and issues the app session
  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(credential);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh bg-white lg:h-dvh lg:grid-cols-2">
      <AuthBrandPanel />

      {/* Form side — scrolls internally on short screens so the page always fits the display */}
      <div className="flex flex-col px-4 py-10 sm:px-8 lg:h-dvh lg:overflow-y-auto">
        <div className="m-auto w-full max-w-md">
          <AuthMobileBrand />

          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h2>
          <p className="mt-1 text-sm text-gray-500">Sign in to manage your insurance claims</p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-danger-500/20 bg-danger-50 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition hover:from-primary-700 hover:to-primary-800 hover:shadow-primary-700/30 focus:ring-4 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          {/* Google sign-in — hidden entirely until VITE_GOOGLE_CLIENT_ID is set */}
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={(message) => setError(message)}
          />

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
              Create account
            </Link>
          </p>

          {/* Other portals */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Other portals</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                to="/admin/login"
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
              >
                <Lock className="h-4 w-4" /> Admin Portal
              </Link>
              <Link
                to="/garage/login"
                className="flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50/60 py-2.5 text-sm font-medium text-orange-700 transition hover:border-orange-300 hover:bg-orange-50"
              >
                <Wrench className="h-4 w-4" /> Garage Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
