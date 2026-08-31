import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, GraduationCap, BookOpen, Lock, Mail, ArrowRight, Building } from 'lucide-react';
import { useAuthStore, useThemeStore } from '../../store/index.js';
import { cn } from '../../utils/helpers.js';
import toast from 'react-hot-toast';
import { authAPI } from '../../api/index.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password });
      
      const responseData = response.data.data || response.data; // Handle slight variation in backend response if any
      
      if (!responseData || !responseData.token) {
        throw new Error('Invalid response from server');
      }

      const { token, user } = responseData;
      localStorage.setItem('token', token);

      // Determine portal route based on user.role
      let portalRoute = '/login';
      let portalId = 'admin';
      
      if (user.role === 'super_super_admin') {
        portalRoute = '/super-admin/dashboard';
        portalId = 'super-admin';
      } else if (user.role === 'super_admin' || user.role === 'admin_operations' || user.role === 'admin_acadops' || user.role === 'admin-ops' || user.role === 'admin-acadops') {
        portalRoute = '/admin/dashboard';
        portalId = 'admin';
      } else if (user.role === 'teacher') {
        portalRoute = '/teacher/dashboard';
        portalId = 'teacher';
      } else if (user.role === 'student') {
        portalRoute = '/student/dashboard'; 
        portalId = 'student';
      } else if (user.role === 'parent') {
        portalRoute = '/parent/dashboard';
        portalId = 'parent';
      } else if (user.role === 'staff') {
        portalRoute = '/staff/dashboard';
        portalId = 'staff';
      }

      login(user, portalId);
      toast.success(`Welcome back!`);
      navigate(portalRoute);
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed! Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Dark mode toggle */}
      <button onClick={toggleTheme} className="absolute top-4 right-4 p-2.5 rounded-xl bg-white dark:bg-surface-800 shadow-card text-surface-500 hover:text-primary transition-colors">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-glow-primary">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-surface-800 dark:text-white font-display">LMS Portal</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Sign in to your account</p>
        </div>

        <div className="card p-8">
          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Email or Roll No</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email or roll no"
                  className="form-input pl-9"
                  required
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0">Password</label>
                <a href="/forgot-password" className="text-xs text-primary hover:text-primary-700 font-medium">Forgot Password?</a>
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
              className={cn('btn-gradient w-full justify-center py-3 text-base mt-2', loading && 'opacity-70 cursor-not-allowed')}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <ArrowRight size={18} />
              )}
              {loading ? 'Signing in...' : `Sign in`}
            </button>
          </form>

          <div className="mt-6 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
            <p className="text-xs text-surface-400 text-center mb-2">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center">
                <p className="text-surface-500 dark:text-surface-400">Email: <span className="font-medium text-surface-700 dark:text-surface-200">admin@lms.com</span></p>
              </div>
              <div className="text-center">
                <p className="text-surface-500 dark:text-surface-400">Password: <span className="font-medium text-surface-700 dark:text-surface-200">any value</span></p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-surface-400 mt-6">© 2025 LMS Platform. All rights reserved.</p>
      </div>
    </div>
  );
}
