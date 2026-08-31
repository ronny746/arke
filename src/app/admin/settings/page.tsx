"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Save, Lock, Smartphone, AlertTriangle, Image as ImageIcon, Plus, Trash2, Edit2, Link as LinkIcon, Upload, Check, Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Banner {
  _id: string;
  title?: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order?: number;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enableRollNumberLogin: true,
    latestVersion: '1.0.0',
    minRequiredVersion: '1.0.0',
    isMandatory: false,
    updateUrl: 'https://play.google.com/store/apps/details?id=com.skdinstituteneet.online',
    updateNotes: 'New version available with enhanced performance and features!'
  });

  // Banner states
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchBanners();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/system-config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (result.success && result.data) {
        const appUp = result.data.appUpdate || {};
        setSettings({
          enableRollNumberLogin: result.data.authSettings?.enableRollNumberLogin ?? true,
          latestVersion: appUp.latestVersion || '1.0.0',
          minRequiredVersion: appUp.minRequiredVersion || '1.0.0',
          isMandatory: appUp.isMandatory ?? false,
          updateUrl: appUp.updateUrl || 'https://arke.pro/download',
          updateNotes: appUp.updateNotes || 'New version available with enhanced performance and features!'
        });
      }
    } catch {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchBanners = useCallback(async () => {
    setBannersLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/banners', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setBanners(result.data || []);
      }
    } catch {
      toast.error('Failed to load banners');
    } finally {
      setBannersLoading(false);
    }
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/system-config', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          authSettings: {
            enableRollNumberLogin: settings.enableRollNumberLogin
          },
          appUpdate: {
            latestVersion: settings.latestVersion,
            minRequiredVersion: settings.minRequiredVersion,
            isMandatory: settings.isMandatory,
            updateUrl: settings.updateUrl,
            updateNotes: settings.updateNotes
          }
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error(result.message || 'Failed to save settings');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  // Image Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    setUploadingImage(true);
    try {
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const result = await res.json();
      if (result.success && result.data?.url) {
        setBannerForm(prev => ({ ...prev, imageUrl: result.data.url }));
        toast.success('Image uploaded successfully!');
      } else {
        toast.error(result.message || 'Image upload failed');
      }
    } catch {
      toast.error('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingBanner(null);
    setBannerForm({ title: '', imageUrl: '', linkUrl: '', isActive: true });
    setShowBannerModal(true);
  };

  const handleOpenEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setBannerForm({
      title: banner.title || '',
      imageUrl: banner.imageUrl || '',
      linkUrl: banner.linkUrl || '',
      isActive: banner.isActive !== false
    });
    setShowBannerModal(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.imageUrl.trim()) {
      toast.error('Please upload or provide a banner image URL');
      return;
    }

    setSavingBanner(true);
    const token = localStorage.getItem('token');
    try {
      const url = editingBanner ? `/api/v1/banners/${editingBanner._id}` : '/api/v1/banners';
      const method = editingBanner ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bannerForm)
      });
      const result = await res.json();
      if (result.success) {
        toast.success(editingBanner ? 'Banner updated!' : 'Banner added successfully!');
        setShowBannerModal(false);
        fetchBanners();
      } else {
        toast.error(result.message || 'Failed to save banner');
      }
    } catch {
      toast.error('Error saving banner');
    } finally {
      setSavingBanner(false);
    }
  };

  const handleToggleBannerActive = async (banner: Banner) => {
    const token = localStorage.getItem('token');
    try {
      const updatedStatus = !banner.isActive;
      const res = await fetch(`/api/v1/banners/${banner._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: updatedStatus })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(updatedStatus ? 'Banner activated' : 'Banner deactivated');
        fetchBanners();
      } else {
        toast.error(result.message || 'Failed to update banner');
      }
    } catch {
      toast.error('Error updating banner status');
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/banners/${bannerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Banner deleted');
        fetchBanners();
      } else {
        toast.error(result.message || 'Failed to delete banner');
      }
    } catch {
      toast.error('Error deleting banner');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <PageHeader 
        title="System & Application Settings" 
        subtitle="Manage promotional banners, mobile app update controls, and authentication settings"
      />

      {/* ── Banner Management Section ────────────────────────────────────────── */}
      <Card className="p-6 border border-gray-100 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Promotional Banners</h2>
              <p className="text-sm text-gray-500">Manage promotional slides displayed on user dashboards and mobile app</p>
            </div>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-md hover:shadow-indigo-500/20 active:scale-95 shrink-0"
          >
            <Plus size={18} /> Add New Banner
          </button>
        </div>

        {/* Dimension & Aspect Ratio Guideline Banner */}
        <div className="mb-6 p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0 mt-0.5">
            <ImageIcon size={18} />
          </div>
          <div className="text-xs text-indigo-900 leading-relaxed">
            <p className="font-bold text-sm text-indigo-950 mb-0.5">📐 Recommended Image Size & Aspect Ratio</p>
            <p className="font-medium">
              Please use rectangular images in a <strong className="font-bold">16:9 aspect ratio</strong> (e.g. <span className="font-mono bg-white px-1.5 py-0.5 rounded text-indigo-800 font-bold border border-indigo-200">1920×1080</span>, <span className="font-mono bg-white px-1.5 py-0.5 rounded text-indigo-800 font-bold border border-indigo-200">1280×720</span>, or <span className="font-mono bg-white px-1.5 py-0.5 rounded text-indigo-800 font-bold border border-indigo-200">1600×900</span> pixels).
            </p>
            <p className="mt-1 text-indigo-700 font-medium">
              You can upload as many banners as you like. All active banners will automatically cycle in a smooth 16:9 carousel on the student dashboard and main website.
            </p>
          </div>
        </div>

        {/* Banners Grid */}
        {bannersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="aspect-[16/9] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
            <ImageIcon className="mx-auto text-gray-300 mb-2" size={36} />
            <p className="font-bold text-gray-600">No Banners Added Yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Create your first 16:9 promotional banner to show announcements to users.</p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              + Add Banner
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {banners.map((banner) => (
              <div 
                key={banner._id}
                className={`group bg-white rounded-2xl border transition-all overflow-hidden flex flex-col relative shadow-sm ${banner.isActive ? 'border-gray-200 hover:shadow-lg hover:border-indigo-300' : 'border-gray-200 opacity-60 bg-gray-50'}`}
              >
                {/* 16:9 Aspect Ratio Image Container */}
                <div className="w-full aspect-[16/9] max-h-52 relative bg-black/90 overflow-hidden">
                  <img 
                    src={banner.imageUrl} 
                    alt={banner.title || 'Banner'} 
                    className="w-full h-full object-contain mx-auto transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Status Tag Overlay */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur shadow-sm border ${banner.isActive ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-gray-800/90 text-gray-300 border-gray-700'}`}>
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Quick Action Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleBannerActive(banner)}
                      title={banner.isActive ? 'Deactivate' : 'Activate'}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur transition-all"
                    >
                      {banner.isActive ? <Eye size={14} /> : <EyeOff size={14} className="text-gray-400" />}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(banner)}
                      title="Edit Banner"
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(banner._id)}
                      title="Delete Banner"
                      className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Banner Info Footer */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm line-clamp-1 mb-1">
                      {banner.title || <span className="text-gray-400 italic">Untitled Banner</span>}
                    </h4>
                    {banner.linkUrl ? (
                      <p className="text-[11px] text-indigo-600 font-medium truncate flex items-center gap-1">
                        <LinkIcon size={12} className="shrink-0" /> {banner.linkUrl}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">No click link attached</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Add / Edit Banner Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBannerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ImageIcon size={18} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{editingBanner ? 'Edit Banner' : 'Add New Banner'}</h3>
                </div>
                <button onClick={() => setShowBannerModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveBanner} className="p-6 space-y-4">
                {/* 16:9 Image Preview Box */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Banner Image (16:9 Aspect Ratio) *
                  </label>
                  <div className="w-full aspect-[16/9] max-h-56 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden relative flex flex-col items-center justify-center group">
                    {bannerForm.imageUrl ? (
                      <>
                        <img src={bannerForm.imageUrl} alt="Preview" className="w-full h-full object-contain mx-auto" />
                        <button
                          type="button"
                          onClick={() => setBannerForm(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white shadow hover:bg-red-700 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="p-4 text-center">
                        <ImageIcon className="mx-auto text-gray-300 mb-2" size={32} />
                        <p className="text-xs font-bold text-gray-600">Upload 16:9 Banner Image</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Recommended: 1920×1080 or 1280×720 px</p>
                        <label className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                          <Upload size={14} />
                          {uploadingImage ? 'Uploading...' : 'Choose File'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploadingImage} />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Image URL input option */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Or Enter Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/banner-16x9.jpg"
                    value={bannerForm.imageUrl}
                    onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Banner Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special NEET 2026 Batch Announcement"
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Click Link / Destination URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /course/123 or https://..."
                    value={bannerForm.linkUrl}
                    onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">When clicked in app or website, user will be redirected to this link.</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Publish Banner Immediately</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={bannerForm.isActive}
                      onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowBannerModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBanner || !bannerForm.imageUrl}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
                  >
                    {savingBanner ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    {editingBanner ? 'Save Changes' : 'Add Banner'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── System Settings Section ────────────────────────────────────────── */}
      <Card className="p-6 border border-gray-100 shadow-md">
        {/* Authentication Settings */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Authentication Settings</h2>
            <p className="text-sm text-gray-500">Manage how users log into the application</p>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h3 className="font-semibold text-gray-900">Student Roll Number Login</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-lg">
                Allow students to use their roll number instead of an OTP to log in. Note: Parents can never bypass OTP.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={settings.enableRollNumberLogin}
                onChange={(e) => setSettings({ ...settings, enableRollNumberLogin: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Mobile App Update Controls */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 pt-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Smartphone size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mobile App Update Controls</h2>
            <p className="text-sm text-gray-500">Configure app update version checks, download link, and mandatory update prompt</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Mandatory Update Toggle */}
          <div className="flex items-start justify-between p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-amber-950">Mandatory App Update</h3>
                <p className="text-sm text-amber-800 mt-0.5 max-w-lg">
                  When enabled, users with older app versions will be blocked from using the app until they update to the latest version.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={settings.isMandatory}
                onChange={(e) => setSettings({ ...settings, isMandatory: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Latest App Version</label>
              <input 
                type="text"
                placeholder="e.g. 1.0.1"
                value={settings.latestVersion}
                onChange={(e) => setSettings({ ...settings, latestVersion: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Minimum Required Version</label>
              <input 
                type="text"
                placeholder="e.g. 1.0.0"
                value={settings.minRequiredVersion}
                onChange={(e) => setSettings({ ...settings, minRequiredVersion: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">App Download / Update URL</label>
            <input 
              type="text"
              placeholder="e.g. https://arke.pro/download or Play Store link"
              value={settings.updateUrl}
              onChange={(e) => setSettings({ ...settings, updateUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Release Notes / What's New</label>
            <textarea 
              rows={3}
              placeholder="Enter details about this update..."
              value={settings.updateNotes}
              onChange={(e) => setSettings({ ...settings, updateNotes: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save size={18} />
            )}
            Save System Settings
          </button>
        </div>
      </Card>
    </div>
  );
}
