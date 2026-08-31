"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, MapPin, Building, BookOpen } from 'lucide-react';
import { studentAPI } from '@/api/student';
import { toast } from 'react-hot-toast';

export function ProfileCompletionModal({ user, onComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    metadata: {
      studentClass: '',
      state: '',
      city: ''
    }
  });

  useEffect(() => {
    if (user && (user.metadata?.isProfileIncomplete || user.firstName === 'Student')) {
      setIsOpen(true);
      setForm({
        firstName: user.firstName === 'Student' ? '' : user.firstName || '',
        lastName: user.lastName === '.' ? '' : user.lastName || '',
        email: user.email?.includes('@skd.com') ? '' : user.email || '',
        metadata: {
          studentClass: user.metadata?.studentClass || '',
          state: user.metadata?.state || '',
          city: user.metadata?.city || ''
        }
      });
    } else {
      setIsOpen(false);
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.email.trim()) {
      toast.error('First Name and Email are required');
      return;
    }
    
    setLoading(true);
    try {
      const res = await studentAPI.updateMe(form);
      if (res.data?.success) {
        toast.success('Profile completed successfully!');
        const updatedUser = res.data.data;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setIsOpen(false);
        if (onComplete) onComplete(updatedUser);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden relative"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
            <User size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-black mb-2">Complete Your Profile</h2>
          <p className="text-indigo-100 text-sm">Please fill out your details to access the student portal.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5 text-gray-900">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">First Name <span className="text-red-500">*</span></label>
              <input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium" placeholder="First Name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Last Name</label>
              <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium" placeholder="Last Name" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Email Address <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium" placeholder="you@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Target Class</label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                <input value={form.metadata.studentClass} onChange={e => setForm({...form, metadata: {...form.metadata, studentClass: e.target.value}})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium" placeholder="e.g. 11th, Dropper" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">State</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                <input value={form.metadata.state} onChange={e => setForm({...form, metadata: {...form.metadata, state: e.target.value}})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium" placeholder="State" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center shadow-lg shadow-indigo-500/30 disabled:opacity-70 mt-4"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Profile & Continue'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
