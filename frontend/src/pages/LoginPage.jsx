import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '../api/auth';
import AuthLayout from '../components/AuthLayout';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem('brecos_token', data.token);
      localStorage.setItem('brecos_user', JSON.stringify(data.user));
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/');
    },
    onError: (err) => {
      const msg = err.response?.data?.message ?? 'Login failed. Please try again.';
      setError(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ email, password });
  };

  const inputCls = (hasError) =>
    `w-full pl-9 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
      hasError
        ? 'border-red-400 bg-red-50 focus:ring-red-400'
        : 'border-slate-200 focus:ring-blue-500'
    }`;

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your business records.">
      {/* Card */}
      <div className="auth-card">

        {/* Inline error banner */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-5 text-sm font-medium"
            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
            <div className="relative">
              <Mail size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : 'text-slate-400'}`} />
              <input id="email" name="email" autoComplete="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls(!!error)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <Lock size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : 'text-slate-400'}`} />
              <input id="password" name="password" autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls(!!error)}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
            }}
          >
            {loginMutation.isPending ? 'Signing in…' : <><LogIn size={18} /> Sign In</>}
          </button>
        </form>

        {/* Register link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
