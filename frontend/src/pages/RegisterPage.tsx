import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Mail, Lock, User, Contact, Phone, ArrowRight } from 'lucide-react';
import { AuthBrandPanel, AuthMobileBrand } from '../components/AuthBrandPanel';

export function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', nic: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Insurance is chosen per vehicle after signup — no plan selection here
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

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-gray-50/80 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10';

  return (
    <div className="grid min-h-dvh bg-white lg:h-dvh lg:grid-cols-2">
      <AuthBrandPanel />

      {/* Form side — scrolls internally on short screens so the page always fits the display */}
      <div className="flex flex-col px-4 py-10 sm:px-8 lg:h-dvh lg:overflow-y-auto">
        <div className="m-auto w-full max-w-lg">
          <AuthMobileBrand />

          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Create your account</h2>
          <p className="mt-1 text-sm text-gray-500">Register in minutes and insure your vehicles</p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-danger-500/20 bg-danger-50 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-gray-700">First Name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input id="firstName" type="text" value={form.firstName} onChange={update('firstName')} required
                    className={`${inputClass} pl-11 pr-4`} placeholder="Kamal" />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-gray-700">Last Name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input id="lastName" type="text" value={form.lastName} onChange={update('lastName')} required
                    className={`${inputClass} pl-11 pr-4`} placeholder="Perera" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input id="reg-email" type="email" value={form.email} onChange={update('email')} required
                  className={`${inputClass} pl-11 pr-4`} placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input id="reg-password" type="password" value={form.password} onChange={update('password')} required minLength={6}
                  className={`${inputClass} pl-11 pr-4`} placeholder="At least 6 characters" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nic" className="mb-1.5 block text-sm font-medium text-gray-700">NIC</label>
                <div className="relative">
                  <Contact className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input id="nic" type="text" value={form.nic} onChange={update('nic')} required
                    pattern="^\d{9}[vVxX]$|^\d{12}$"
                    title="9 digits followed by V/X, or 12 digits (e.g. 852345678V or 199852345678)"
                    className={`${inputClass} pl-11 pr-4`} placeholder="852345678V" />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">Phone <span className="font-normal text-gray-400">(optional)</span></label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input id="phone" type="tel" value={form.phone} onChange={update('phone')}
                    className={`${inputClass} pl-11 pr-4`} placeholder="+94 77 123 4567" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition hover:from-primary-700 hover:to-primary-800 hover:shadow-primary-700/30 focus:ring-4 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
              {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>

            <p className="text-center text-xs text-gray-400">
              After signing in, register your vehicles and choose an insurance plan for each one.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
