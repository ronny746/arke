"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield, Lock, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);

    try {
      // The old LMS login endpoint might be different depending on which backend we hit. 
      // The meetonline backend has /api/auth/login. We'll use that for now since we mapped it in server.js.
      // Wait, lms-back uses /api/v1/auth/login.
      // Let's assume we use lms-back /api/v1/auth/login for now.
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed! Please check credentials.');
      }

      const payload = data.data || data;
      const { tokens, user, token } = payload;
      
      if (tokens && tokens.access) {
        localStorage.setItem('token', tokens.access.token);
      } else if (token) {
        localStorage.setItem('token', token);
      } else if (data.token) {
        localStorage.setItem('token', data.token); // meetonline structure fallback
      }

      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      toast.success(`Welcome back!`);
      // Redirect based on role
      if (user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'institute_admin' || user.role === 'admin_acadops' || user.role === 'admin_operations')) {
        router.push('/admin/dashboard');
      } else if (user && (user.role === 'teacher' || user.role === 'TEACHER')) {
        router.push('/teacher/dashboard');
      } else if (user && (user.role === 'parent' || user.role === 'PARENT')) {
        router.push('/parent/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mx-auto mb-4 shadow-glow-primary">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-surface-800 dark:text-white font-display">LMS Portal</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Sign in to your account</p>
        </div>

        <div className="card p-8">
          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Email or Username</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="form-input pl-9"
                  required
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0">Password</label>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="form-input pl-9 pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`btn-gradient w-full justify-center py-3 text-base mt-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
