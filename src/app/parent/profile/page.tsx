"use client";

import { useState, useEffect } from 'react';
import { ProfileView } from '@/components/profile/ProfileView';
import { PageHeader } from '@/components/layout/index.jsx';
import { Loader2 } from 'lucide-react';

export default function ParentProfilePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader 
        title="My Profile" 
        subtitle="Manage your personal details and account settings"
        breadcrumbs={['Home', 'Profile']} 
      />
      
      {user ? (
        <ProfileView user={user} onUpdate={(u) => setUser(u)} />
      ) : (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      )}
    </div>
  );
}
