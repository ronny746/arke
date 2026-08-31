import { useAuthStore } from '../../store/index.js';
import { PageHeader } from '../layout/index.jsx';
import { Card, Avatar } from '../ui/index.jsx';
import { User, Mail, Phone, Shield, Building, Edit2, Lock } from 'lucide-react';

export default function ProfileViewer() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <PageHeader 
        title="My Profile" 
        subtitle="Manage your personal information and account settings" 
        breadcrumbs={['Home', 'Profile']} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 flex flex-col items-center text-center p-6 sm:p-8">
          <Avatar 
            name={`${user.firstName} ${user.lastName}`} 
            size="xl" 
            className="w-24 h-24 mb-4 text-2xl bg-primary/10 text-primary" 
          />
          <h2 className="text-xl font-bold text-surface-900 dark:text-white">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-sm font-medium text-primary mt-1 uppercase tracking-wider">
            {user.role?.replace(/[-_]/g, ' ')}
          </p>
          
          <div className="w-full mt-8 border-t border-surface-100 dark:border-surface-800 pt-6 space-y-4 px-4">
            <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface-100 dark:bg-surface-800 text-surface-400 rounded-lg text-sm font-medium cursor-not-allowed opacity-70">
              <Edit2 size={16} /> Edit Profile
            </button>
            <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface-100 dark:bg-surface-800 text-surface-400 rounded-lg text-sm font-medium cursor-not-allowed opacity-70">
              <Lock size={16} /> Change Password
            </button>
            <p className="text-[10px] text-surface-400">Profile editing is managed by the Administrator.</p>
          </div>
        </Card>

        <Card className="col-span-1 md:col-span-2 p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-semibold border-b border-surface-100 dark:border-surface-800 pb-3">Personal Information</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/5 text-primary rounded-lg">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 uppercase">First Name</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white mt-0.5">{user.firstName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/5 text-primary rounded-lg">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 uppercase">Last Name</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white mt-0.5">{user.lastName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/5 text-primary rounded-lg">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 uppercase">Email Address</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white mt-0.5">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/5 text-primary rounded-lg">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 uppercase">Phone Number</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white mt-0.5">{user.phone || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/5 text-primary rounded-lg">
                <Shield size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 uppercase">Role</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white mt-0.5 capitalize">{user.role?.replace(/[-_]/g, ' ')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/5 text-primary rounded-lg">
                <Building size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 uppercase">Institute ID</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white mt-0.5">{user.instituteId}</p>
              </div>
            </div>
          </div>
          
          {user.metadata && Object.keys(user.metadata).length > 0 && (
            <>
              <h3 className="text-lg font-semibold border-b border-surface-100 dark:border-surface-800 pb-3 pt-4">Additional Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Object.entries(user.metadata).map(([key, value]) => {
                  if(typeof value === 'object') return null;
                  return (
                    <div key={key} className="flex items-start gap-3">
                      <div className="p-2 bg-surface-100 dark:bg-surface-800 text-surface-500 rounded-lg">
                        <div className="w-[18px] h-[18px] flex items-center justify-center text-xs font-bold">
                          {key.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-surface-500 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-sm font-semibold text-surface-900 dark:text-white mt-0.5">{value?.toString() || 'N/A'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
