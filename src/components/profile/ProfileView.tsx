"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Mail, 
  Phone, 
  User, 
  Shield, 
  CheckCircle2, 
  Loader2, 
  Edit3, 
  X, 
  BookOpen, 
  Hash, 
  Sparkles, 
  Compass, 
  Layers, 
  Globe, 
  Check, 
  Stethoscope, 
  Zap, 
  GraduationCap, 
  Building2,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const EXAM_GOALS = [
  {
    id: "NEET",
    title: "NEET UG",
    tagline: "Medical Entrance (MBBS / BDS)",
    icon: Stethoscope,
    color: "#059669"
  },
  {
    id: "IIT-JEE",
    title: "IIT JEE",
    tagline: "Engineering (Main & Advanced)",
    icon: Zap,
    color: "#2563EB"
  },
  {
    id: "BOARDS-11-12",
    title: "Class 11 & 12",
    tagline: "CBSE & State Board Prep",
    icon: GraduationCap,
    color: "#7C3AED"
  },
  {
    id: "FOUNDATION-9-10",
    title: "Class 9 & 10",
    tagline: "Foundation & Olympiads",
    icon: BookOpen,
    color: "#D97706"
  },
  {
    id: "CUET-GOVT",
    title: "CUET & Govt Exams",
    tagline: "Central Univ & Aptitude",
    icon: Building2,
    color: "#DC2626"
  }
];

const CLASSES = [
  { id: "Class 9", label: "Class 9" },
  { id: "Class 10", label: "Class 10" },
  { id: "Class 11", label: "Class 11" },
  { id: "Class 12", label: "Class 12" },
  { id: "Dropper", label: "12th Pass / Dropper" }
];

const MEDIUMS = [
  { id: "Hinglish", label: "Hinglish (Hindi + English)" },
  { id: "English", label: "English" },
  { id: "Hindi", label: "Hindi" }
];

export function ProfileView({ user, onUpdate }: { user: any, onUpdate?: (user: any) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Personal Info form
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email && !user.email.includes('@arke.com') && !user.email.startsWith('student_') ? user.email : (user?.email || ''),
    phone: user?.phone || '',
    profilePictureUrl: user?.profilePictureUrl || ''
  });
  
  // Student Preferences modal & state
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [prefGoal, setPrefGoal] = useState<string>(user?.metadata?.targetExam || 'NEET');
  const [prefClass, setPrefClass] = useState<string>(user?.metadata?.studentClass || 'Class 11');
  const [prefMedium, setPrefMedium] = useState<string>(user?.metadata?.medium || 'Hinglish');
  const [savingPrefs, setSavingPrefs] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        profilePictureUrl: user.profilePictureUrl || ''
      });
      if (user.metadata?.targetExam) setPrefGoal(user.metadata.targetExam);
      if (user.metadata?.studentClass) setPrefClass(user.metadata.studentClass);
      if (user.metadata?.medium) setPrefMedium(user.metadata.medium);
    }
  }, [user]);

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
      const imageUrl = result.data?.url || result.url;
      if (result.success && imageUrl) {
        setFormData(prev => ({ ...prev, profilePictureUrl: imageUrl }));
        
        await fetch('/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ profilePictureUrl: imageUrl })
        });
        
        const updatedUser = { ...user, profilePictureUrl: imageUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
        toast.success("Profile photo updated successfully!");
      } else {
        toast.error(result.message || result.error || "Failed to get upload URL");
      }
    } catch (err) {
      console.error("Upload failed", err);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim()) {
      toast.error("First Name is required.");
      return;
    }
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          email: formData.email.trim(),
          metadata: {
            ...(user?.metadata || {}),
            isProfileIncomplete: false
          }
        })
      });
      
      const result = await res.json();
      if (result.success) {
        setIsEditing(false);
        const updatedUser = { 
          ...user, 
          ...formData, 
          metadata: { ...(user?.metadata || {}), isProfileIncomplete: false } 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
        toast.success("Profile details updated successfully!");
      } else {
        toast.error(result.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const token = localStorage.getItem('token');
      const updatedMetadata = {
        ...(user?.metadata || {}),
        targetExam: prefGoal,
        studentClass: prefClass,
        medium: prefMedium,
        isProfileIncomplete: false
      };

      const res = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          metadata: updatedMetadata
        })
      });

      const result = await res.json();
      if (result.success) {
        const updatedUser = {
          ...user,
          metadata: updatedMetadata
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
        setIsPrefModalOpen(false);
        toast.success("Preferences updated! Your recommendations are refreshed.");
      } else {
        toast.error(result.message || "Failed to update preferences");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  if (!user) return null;

  const currentGoalObj = EXAM_GOALS.find(g => g.id === (user?.metadata?.targetExam || 'NEET')) || EXAM_GOALS[0];
  const GoalIcon = currentGoalObj.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 relative overflow-hidden">
        {/* Background Decorative Blob */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-[#0B132B]/10 to-[#C99A2E]/10 rounded-full blur-3xl opacity-60 pointer-events-none" />
        
        {/* Avatar Section */}
        <div className="relative group shrink-0">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-gradient-to-br from-[#0B132B] to-[#1E293B] flex items-center justify-center text-3xl sm:text-4xl font-black text-[#C99A2E] shadow-xl border-4 border-white relative z-10">
            {formData.profilePictureUrl ? (
              <img src={formData.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (user.firstName || user.name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-9 h-9 sm:w-10 sm:h-10 bg-[#0B132B] text-[#C99A2E] rounded-2xl flex items-center justify-center shadow-lg border-2 border-white hover:bg-[#1C2541] transition-all z-20"
            title="Change photo"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
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
        <div className="flex-1 text-center md:text-left z-10 pt-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {formData.firstName ? `${formData.firstName} ${formData.lastName}`.trim() : (user.name || 'Student')}
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B132B] text-[#C99A2E] text-xs font-bold uppercase tracking-wider mx-auto md:mx-0 w-fit">
              <Shield size={13} /> {user.role || 'Student'}
            </span>
          </div>
          <p className="text-gray-500 font-medium text-sm">{formData.email || user.email || 'No email associated'}</p>
          {user.phone && <p className="text-xs text-gray-400 font-medium mt-0.5">📞 +91 {user.phone}</p>}
        </div>
        
        {/* Edit Toggle */}
        <div className="z-10 md:self-start">
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-bold rounded-xl transition-all border border-gray-200"
            >
              <Edit3 size={15} /> Edit Details
            </button>
          )}
        </div>
      </div>

      {/* STUDENT PREFERENCES CARD (When role is student) */}
      {user.role === 'student' && (
        <div className="bg-gradient-to-br from-white via-white to-amber-50/30 rounded-3xl p-6 sm:p-8 shadow-sm border border-amber-200/60 relative z-10 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center shadow-md shrink-0">
                <Compass size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0B132B] flex items-center gap-2">
                  <span>My Target Exam & Learning Preferences</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    Live
                  </span>
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Your dashboard recommendations and batch suggestions adapt to these preferences.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsPrefModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B132B] hover:bg-[#1C2541] text-[#C99A2E] text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/10 shrink-0"
            >
              <SlidersHorizontal size={15} />
              <span>Change Preferences</span>
            </button>
          </div>

          {/* Current Preferences Display Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Target Exam */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <GoalIcon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Goal / Exam</p>
                <h4 className="text-sm font-black text-gray-900 truncate mt-0.5">{currentGoalObj.title}</h4>
                <p className="text-[11px] text-gray-500 truncate">{currentGoalObj.tagline}</p>
              </div>
            </div>

            {/* Target Class */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Layers size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Class / Level</p>
                <h4 className="text-sm font-black text-gray-900 truncate mt-0.5">{user?.metadata?.studentClass || 'Class 11'}</h4>
                <p className="text-[11px] text-gray-500 truncate">Academic Grade</p>
              </div>
            </div>

            {/* Study Medium */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Globe size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Language Medium</p>
                <h4 className="text-sm font-black text-gray-900 truncate mt-0.5">{user?.metadata?.medium || 'Hinglish'}</h4>
                <p className="text-[11px] text-gray-500 truncate">Lecture & Content</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details / Edit Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 relative z-10">
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
            <p className="text-xs sm:text-sm text-gray-500">Update your personal details and how we can reach you.</p>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">First Name</label>
                <input 
                  type="text" 
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#0B132B] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-semibold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Last Name</label>
                <input 
                  type="text" 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#0B132B] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address (Gmail)</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#0B132B] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-semibold"
                  placeholder="e.g. user@gmail.com"
                />
                <p className="text-[11px] text-gray-500 font-medium mt-1">Used for payment receipts & invoice generation.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Mobile Number</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#0B132B] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-semibold"
                  placeholder="e.g. 9876543210"
                />
                <p className="text-[11px] text-amber-600 font-medium mt-1">Note: Use a verified mobile number to receive instant OTPs.</p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 rounded-xl text-gray-600 font-bold text-xs sm:text-sm hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0B132B] hover:bg-[#1C2541] text-[#C99A2E] font-black text-xs sm:text-sm transition-all disabled:opacity-70 shadow-md"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-gray-900 font-bold">{formData.firstName ? `${formData.firstName} ${formData.lastName}`.trim() : (user.name || 'Not set')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mobile Number</p>
                <p className="text-gray-900 font-bold">{formData.phone || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                <p className="text-gray-900 font-bold">{formData.email || user.email || 'Not set'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batches & Academic Details Card */}
      {!isEditing && (user.role === 'student' || user.role === 'teacher') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Enrolled Batches & Classroom</h3>
              <p className="text-xs sm:text-sm text-gray-500">Your active batches and courses.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Enrolled Batches</p>
              {batches.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {batches.map((batch: any) => (
                    <div key={batch._id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-sm font-bold text-gray-800">
                      <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center text-xs shrink-0">
                        <Hash size={14} />
                      </div>
                      <span className="truncate">{batch.name || batch.courseName || 'Active Batch'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 font-medium italic">No active batches enrolled yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PREFERENCES EDIT MODAL */}
      <AnimatePresence>
        {isPrefModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 my-8"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#0B132B] via-[#111C3A] to-[#1C2541] p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-[#C99A2E] font-black">
                    <Compass size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Select Your Preferences</h3>
                    <p className="text-xs text-gray-300 font-medium">Customize your target exam, class, and medium</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPrefModalOpen(false)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSavePreferences} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                
                {/* 1. Target Exam Goal */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-[#0B132B] uppercase tracking-wider flex items-center gap-1.5">
                    <Compass size={14} className="text-[#C99A2E]" /> 1. Select Target Exam / Goal
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {EXAM_GOALS.map((goal) => {
                      const Icon = goal.icon;
                      const isSelected = prefGoal === goal.id;
                      return (
                        <button
                          key={goal.id}
                          type="button"
                          onClick={() => setPrefGoal(goal.id)}
                          className={`p-3.5 rounded-2xl text-left border transition-all flex items-start gap-3 relative overflow-hidden ${
                            isSelected
                              ? "bg-[#0B132B] border-[#0B132B] text-white shadow-md ring-2 ring-[#C99A2E]/50"
                              : "bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-100/70"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-white/15 text-[#C99A2E]" : "bg-white text-gray-700 shadow-sm"
                            }`}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-xs font-black ${isSelected ? "text-white" : "text-gray-900"}`}>
                              {goal.title}
                            </h4>
                            <p className={`text-[11px] leading-tight mt-0.5 line-clamp-1 ${isSelected ? "text-gray-300" : "text-gray-500"}`}>
                              {goal.tagline}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#C99A2E] text-[#0B132B] flex items-center justify-center shrink-0 shadow-sm">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Target Class */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-[#0B132B] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} className="text-[#C99A2E]" /> 2. Select Your Class / Grade
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CLASSES.map((cls) => {
                      const isSelected = prefClass === cls.id;
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => setPrefClass(cls.id)}
                          className={`py-3 px-3 rounded-xl text-xs font-black border transition-all text-center flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? "bg-[#0B132B] text-[#C99A2E] border-[#0B132B] shadow-md ring-2 ring-[#C99A2E]/40"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {cls.label}
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Study Medium */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-[#0B132B] uppercase tracking-wider flex items-center gap-1.5">
                    <Globe size={14} className="text-[#C99A2E]" /> 3. Preferred Study Medium / Language
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {MEDIUMS.map((med) => {
                      const isSelected = prefMedium === med.id;
                      return (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => setPrefMedium(med.id)}
                          className={`py-3 px-3 rounded-xl text-xs font-black border transition-all text-center flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? "bg-[#0B132B] text-[#C99A2E] border-[#0B132B] shadow-md ring-2 ring-[#C99A2E]/40"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {med.id}
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer / Actions */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPrefModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-gray-600 font-bold text-xs sm:text-sm hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPrefs}
                    className="px-6 py-2.5 rounded-xl bg-[#0B132B] hover:bg-[#1C2541] text-[#C99A2E] font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
                  >
                    {savingPrefs ? <Loader2 size={16} className="animate-spin text-[#C99A2E]" /> : <CheckCircle2 size={16} />}
                    <span>Save Preferences</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
