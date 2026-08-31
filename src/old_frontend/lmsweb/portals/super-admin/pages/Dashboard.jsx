import { useState, useEffect } from 'react';
import { 
  Building2, GraduationCap, Users, TrendingUp, 
  Activity, ShieldCheck, CreditCard, ChevronRight, MapPin
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { axiosInstance } from '../../../api/index.js';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

// Dummy data for charts to make it look premium until actual APIs provide historical data
const growthData = [
  { name: 'Jan', students: 400, revenue: 2400 },
  { name: 'Feb', students: 300, revenue: 1398 },
  { name: 'Mar', students: 200, revenue: 9800 },
  { name: 'Apr', students: 278, revenue: 3908 },
  { name: 'May', students: 189, revenue: 4800 },
  { name: 'Jun', students: 239, revenue: 3800 },
  { name: 'Jul', students: 349, revenue: 4300 },
];

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axiosInstance.get('/dashboard');
        setData(res.data?.data || res.data || {});
      } catch (error) {
        console.error("Dashboard fetch error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full border-4 border-t-indigo-600 border-indigo-200 animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading Master Dashboard...</p>
        </div>
      </div>
    );
  }

  const overview = data?.overview || {};
  const recentInstitutes = data?.recentInstitutes || [];
  const revenue = data?.platformRevenuePlaceholder || 0;

  const statCards = [
    { 
      title: 'Total Institutes', 
      value: overview.totalInstitutes || 0, 
      subtitle: `${overview.activeInstitutes || 0} active now`,
      icon: Building2, 
      color: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-900'
    },
    { 
      title: 'Platform Students', 
      value: overview.totalStudentsPlatformWide || 0, 
      subtitle: 'Across all institutes',
      icon: GraduationCap, 
      color: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-900'
    },
    { 
      title: 'Platform Teachers', 
      value: overview.totalTeachersPlatformWide || 0, 
      subtitle: 'Active educators',
      icon: Users, 
      color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-900'
    },
    { 
      title: 'Total Revenue', 
      value: `₹${(revenue).toLocaleString('en-IN')}`, 
      subtitle: 'Estimated platform gross',
      icon: CreditCard, 
      color: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-900'
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Master Overview
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Global metrics and platform health
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">System Healthy</span>
        </div>
      </div>

      {/* Stats Grid - Glassmorphism style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div 
            key={i} 
            className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 border ${stat.border} shadow-sm hover:shadow-md transition-all duration-300 group`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex items-center text-emerald-500 text-sm font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12%
              </div>
            </div>
            <div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{stat.subtitle}</p>
            </div>
            {/* Decorative background blur */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${stat.color} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Platform Growth</h3>
                <p className="text-sm text-gray-500">Student enrollments over time</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Analytics</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} dy={10} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Institutes Sidebar */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              Recent Institutes
            </h3>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View All</button>
          </div>
          
          <div className="space-y-4 flex-1">
            {recentInstitutes.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No institutes onboarded yet.</p>
              </div>
            ) : (
              recentInstitutes.map((institute) => (
                <div key={institute._id} className="flex items-center p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-600 cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg flex-shrink-0">
                    {institute.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3 flex-1 overflow-hidden">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{institute.name}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3" /> {institute.address || 'Location N/A'}
                    </p>
                  </div>
                  <div className="ml-2 flex flex-col items-end">
                    {institute.isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Inactive
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Onboarding Pending?</h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 mb-3">Add a new institute to the platform directly from the master controls.</p>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
                  + Add Institute
                </button>
              </div>
              <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-500/10 rotate-12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
