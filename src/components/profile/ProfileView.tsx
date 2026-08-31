"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mail, Phone, User, Shield, CheckCircle2, Loader2, Edit3, X, BookOpen, Hash } from 'lucide-react';

export function ProfileView({ user, onUpdate }: { user: any, onUpdate?: (user: any) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    profilePictureUrl: user?.profilePictureUrl || ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'student' || user?.role === 'teacher') {
      const fetchBatches = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/v1/batches/my-batches', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const result = await res.json();
          if (result.success && result.data) {
            setBatches(result.data);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchBatches();
    }
  }, [user?.role]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const data = new FormData();
      data.append('file', file);
      
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });
      
      const result = await res.json();
      const imageUrl = result.data?.url || result.url; // Support both just in case
      if (result.success && imageUrl) {
        setFormData(prev => ({ ...prev, profilePictureUrl: imageUrl }));
        
        // Immediately update backend as well for seamless experience
        await fetch('/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ profilePictureUrl: imageUrl })
        });
        
        // Update local storage
        const updatedUser = { ...user, profilePictureUrl: imageUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
      } else {
        alert(result.message || result.error || "Failed to get upload URL");
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const result = await res.json();
      if (result.success) {
        setIsEditing(false);
        const updatedUser = { ...user, ...formData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
      } else {
        alert(result.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        {/* Background Decorative Blob */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        {/* Avatar Section */}
        <div className="relative group shrink-0">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-4xl font-bold text-primary-700 shadow-lg border-4 border-white relative z-10">
            {formData.profilePictureUrl ? (
              <img src={formData.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (user.firstName || user.name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-700 shadow-md border border-gray-100 hover:bg-gray-50 transition-all z-20"
          >
            {uploading ? <Loader2 size={18} className="animate-spin text-primary-600" /> : <Camera size={18} />}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />
        </div>

        {/* Info Section */}
        <div className="flex-1 text-center md:text-left z-10 pt-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-2">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {formData.firstName ? `${formData.firstName} ${formData.lastName}`.trim() : (user.name || 'Student')}
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-bold uppercase tracking-wider mx-auto md:mx-0 w-fit">
              <Shield size={14} /> {user.role || 'Student'}
            </span>
          </div>
          <p className="text-gray-500 font-medium">{user.email}</p>
        </div>
        
        {/* Edit Toggle */}
        <div className="z-10 absolute top-6 right-6">
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl transition-all border border-gray-200"
            >
              <Edit3 size={16} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Details / Edit Form Card */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative z-10">
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
            <p className="text-sm text-gray-500">Update your personal details and how we can reach you.</p>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">First Name</label>
                <input 
                  type="text" 
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Last Name</label>
                <input 
                  type="text" 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Mobile Number</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                  placeholder="e.g. 9876543210"
                />
                <p className="text-xs text-orange-500 font-medium mt-1">Note: Changing this will require you to log in with the new number next time.</p>
              </div>
              <div className="space-y-1.5 opacity-60">
                <label className="text-sm font-semibold text-gray-700">Email Address (Read-only)</label>
                <input 
                  type="email" 
                  value={user.email || ''}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-gray-900 font-semibold">{formData.firstName ? `${formData.firstName} ${formData.lastName}`.trim() : (user.name || 'Not set')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mobile Number</p>
                <p className="text-gray-900 font-semibold">{formData.phone || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                <p className="text-gray-900 font-semibold">{user.email || 'Not set'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extended Details Card (Batches & Metadata) */}
      {!isEditing && (user.role === 'student' || user.role === 'teacher') && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Academic Details</h3>
              <p className="text-sm text-gray-500">Your batches and enrolled information.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Metadata (Roll No, Class, etc.) */}
            {user.metadata && Object.keys(user.metadata).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-gray-100">
                {Object.entries(user.metadata).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-sm font-semibold text-gray-800">{String(value)}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Batches List */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Enrolled Batches</p>
              {batches.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {batches.map((batch: any) => (
                    <div key={batch._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700">
                      <Hash size={14} className="text-purple-500" />
                      {batch.name || 'Unnamed Batch'}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No batches assigned yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
