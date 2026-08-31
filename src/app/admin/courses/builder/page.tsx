"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, Save, Plus, CheckCircle2, Trophy, ArrowRight, Trash2, KeyRound, Users, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

function CourseBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const [loading, setLoading] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);
  const [fetching, setFetching] = useState(!!editId);
  const [token, setToken] = useState('');
  const [courseBatches, setCourseBatches] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: '', subtitle: '', tag: 'NEET 2027', fee: '', actualFee: '', duration: '', startDate: '', endDate: '',
    badge: '', color: '#0033a0', popular: false, isPublished: true,
    description: '', features: [''], bestFor: [''],
    access: { liveClasses: true, studyMaterials: true, dpps: true, testSeries: true },
    defaultBatchId: ''
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    if (editId && t) {
      fetch(`/api/v1/courses/${editId}`, { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data) {
            const c = data.data;
              setForm({
        name: c.name || '', subtitle: c.subtitle || '', tag: c.tag || 'NEET 2027',
        fee: c.fee?.toString() || '', actualFee: c.actualFee?.toString() || '', 
        duration: c.duration || '',
        startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '', 
        endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '',
        badge: c.badge || '', color: c.color || '#0033a0', popular: c.popular || false, isPublished: c.isPublished ?? true,
              description: c.description || '',
              features: c.features?.length ? c.features : [''],
              bestFor: c.bestFor?.length ? c.bestFor : [''],
              access: c.access || { liveClasses: true, studyMaterials: true, dpps: true, testSeries: true },
              defaultBatchId: c.defaultBatchId || ''
            });
            // Fetch batches for this course
            fetch(`/api/v1/batches?courseId=${c._id}`, { headers: { Authorization: `Bearer ${t}` } })
              .then(r => r.json())
              .then(bData => { if (bData.success) setCourseBatches(bData.data || []); });
          }
        })
        .finally(() => setFetching(false));
    }
  }, [editId]);

  const handleListChange = (key: 'features' | 'bestFor', index: number, value: string) => {
    const newList = [...form[key]];
    newList[index] = value;
    set(key, newList);
  };

  const addListItem = (key: 'features' | 'bestFor') => {
    set(key, [...form[key], '']);
  };

  const removeListItem = (key: 'features' | 'bestFor', index: number) => {
    const newList = [...form[key]];
    newList.splice(index, 1);
    if (newList.length === 0) newList.push('');
    set(key, newList);
  };

  const validateCourseDates = () => {
    if (!form.startDate && !form.endDate) return null;

    const start = form.startDate ? new Date(form.startDate) : null;
    const end = form.endDate ? new Date(form.endDate) : null;

    if (start && end && isNaN(start.getTime()) === false && isNaN(end.getTime()) === false && start > end) {
      return 'Course start date must be on or before the end date.';
    }

    if (end && isNaN(end.getTime()) === false && end < new Date(new Date().setHours(0, 0, 0, 0))) {
      return 'Course end date cannot be in the past.';
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Course name is required'); return; }

    const dateError = validateCourseDates();
    if (dateError) {
      toast.error(dateError);
      return;
    }

    if (!token) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        fee: form.fee ? Number(form.fee) : null,
        actualFee: form.actualFee ? Number(form.actualFee) : null,
        startDate: form.startDate ? new Date(form.startDate) : null,
        endDate: form.endDate ? new Date(form.endDate) : null,
        features: form.features.map(s => s.trim()).filter(Boolean),
        bestFor: form.bestFor.map(s => s.trim()).filter(Boolean),
      };
      if (!payload.defaultBatchId || payload.defaultBatchId.toString().startsWith('pending-')) {
        delete payload.defaultBatchId;
      }
      
      const url = editId ? `/api/v1/courses/${editId}` : '/api/v1/courses';
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save');
      
      const savedCourseId = editId || data.data._id;
      
      // Process pending batches if any
      const pendingBatches = courseBatches.filter(b => b._id.toString().startsWith('pending-'));
      let newDefaultBatchId = null;
      for (const b of pendingBatches) {
        const bRes = await fetch('/api/v1/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: b.name, courseId: savedCourseId })
        });
        const bData = await bRes.json();
        if (bData.success && form.defaultBatchId === b._id) {
          newDefaultBatchId = bData.data._id;
        }
      }
      
      if (newDefaultBatchId) {
        await fetch(`/api/v1/courses/${savedCourseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ defaultBatchId: newDefaultBatchId })
        });
      }

      toast.success(editId ? 'Course updated successfully!' : 'Course created successfully!');
      router.push('/admin/courses');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newBatchName.trim();
    if (!name) return;

    if (!editId) {
      const tempId = 'pending-' + Date.now();
      setCourseBatches([...courseBatches, { _id: tempId, name }]);
      setForm(f => ({ ...f, defaultBatchId: tempId }));
      setShowBatchModal(false);
      setNewBatchName('');
      toast.success("Batch added! It will be created when you save the course.");
      return;
    }

    setSavingBatch(true);
    try {
      const res = await fetch('/api/v1/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, courseId: editId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Batch created successfully!");
        setCourseBatches([...courseBatches, data.data]);
        setForm(f => ({ ...f, defaultBatchId: data.data._id }));
        setShowBatchModal(false);
        setNewBatchName('');
      } else {
        toast.error(data.message || 'Failed to create batch');
      }
    } catch (err) {
      toast.error('Error creating batch');
    } finally {
      setSavingBatch(false);
    }
  };

  if (fetching) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
      {/* Create Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Create New Batch</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateBatch} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Batch Name</label>
                <input autoFocus value={newBatchName} onChange={e => setNewBatchName(e.target.value)} placeholder="e.g. Target NEET 2025"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 transition-all text-sm font-semibold" />
              </div>
              <button type="submit" disabled={savingBatch || !newBatchName.trim()}
                className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex justify-center items-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0033a0, #7b3fa0)' }}>
                {savingBatch ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                Create Batch
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-10 relative shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/courses')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">{editId ? 'Edit Course' : 'Create New Course'}</h1>
            <p className="text-xs text-gray-500 font-medium">Design how this course appears on the landing page</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="px-6 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:opacity-90 active:scale-95 disabled:opacity-70"
          style={{ background: 'linear-gradient(135deg, #0033a0, #7b3fa0)' }}>
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          {editId ? 'Save Changes' : 'Publish Course'}
        </button>
      </header>

      {/* Main Split Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Editor Form */}
        <div className="w-full lg:w-3/5 bg-white overflow-y-auto border-r border-gray-100 p-6 lg:p-10">
          <div className="max-w-2xl mx-auto space-y-10">
            
            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                <BookOpen size={16} /> Basic Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Course Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., SKD Prime"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Subtitle</label>
                  <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="e.g., Complete NEET Preparation Program"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Course Tag</label>
                  <input value={form.tag} onChange={e => set('tag', e.target.value)} placeholder="e.g., NEET 2026"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Offer Fee (₹)</label>
                    <input type="number" value={form.fee} onChange={e => set('fee', e.target.value)} placeholder="9999"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Actual Fee (₹)</label>
                    <input type="number" value={form.actualFee} onChange={e => set('actualFee', e.target.value)} placeholder="18999"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Start Date</label>
                    <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">End Date</label>
                    <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Description</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Brief description..."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold resize-none" />
                </div>
              </div>
            </section>

            <hr className="border-gray-100 border-2" />

            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                <KeyRound size={16} /> Access & Enrollment
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-3">Included Content Access</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(form.access).map(([key, val]) => (
                      <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${val ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${val ? 'bg-blue-600' : 'bg-white border-2 border-gray-200'}`}>
                          {val && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <span className={`text-sm font-bold ${val ? 'text-blue-900' : 'text-gray-500'}`}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <input type="checkbox" className="hidden" checked={val} onChange={e => set('access', { ...form.access, [key]: e.target.checked })} />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      Default Enrollment Batch
                    </label>
                    <div>
                      <button type="button" onClick={() => setShowBatchModal(true)} disabled={savingBatch} className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50">
                        {savingBatch ? <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" /> : <Plus size={12} />}
                        Create New
                      </button>
                    </div>
                  </div>
                  <select value={form.defaultBatchId} onChange={e => set('defaultBatchId', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold text-sm">
                    <option value="">Select a batch (Optional)</option>
                    {courseBatches.map(b => (
                      <option key={b._id} value={b._id}>{b.name} {b.section ? `(${b.section})` : ''}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 font-medium mt-1.5 leading-relaxed">
                    When a student purchases this course, they will automatically be assigned to this batch.
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 border-2" />

            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                <Trophy size={16} /> Visual & Badge
              </h2>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Badge Text</label>
                  <input value={form.badge} onChange={e => set('badge', e.target.value)} placeholder="e.g., BEST VALUE"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 transition-all font-bold text-sm uppercase" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Theme Color</label>
                  <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-100 p-1.5 rounded-xl">
                    <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 bg-transparent" />
                    <span className="font-mono text-sm font-bold text-gray-600 uppercase">{form.color}</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 p-4 rounded-xl cursor-pointer hover:bg-blue-100/50 transition-colors"
                  onClick={() => set('popular', !form.popular)}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${form.popular ? 'bg-blue-600' : 'bg-white border-2 border-blue-200'}`}>
                    {form.popular && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Mark as Popular Course</p>
                    <p className="text-[10px] text-blue-600/80 font-semibold mt-0.5">Adds a shadow glow and emphasizes the card</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-green-50 border border-green-100 p-4 rounded-xl cursor-pointer hover:bg-green-100/50 transition-colors"
                  onClick={() => set('isPublished', !form.isPublished)}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${form.isPublished ? 'bg-green-600' : 'bg-white border-2 border-green-200'}`}>
                    {form.isPublished && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-900">Published (Visible to Public)</p>
                    <p className="text-[10px] text-green-700/80 font-semibold mt-0.5">Uncheck for in-house only courses</p>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 border-2" />

            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                <CheckCircle2 size={16} /> Course Features
              </h2>
              <div className="space-y-3">
                {form.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0">{idx + 1}</div>
                    <input value={feat} onChange={e => handleListChange('features', idx, e.target.value)} placeholder="e.g., Daily LIVE Interactive Classes"
                      className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-500 transition-all font-medium text-sm" />
                    <button onClick={() => removeListItem('features', idx)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addListItem('features')} className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-2 py-1">
                  <Plus size={16} /> Add Feature
                </button>
              </div>
            </section>

            <hr className="border-gray-100 border-2" />

            <section className="pb-20">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                <Trophy size={16} /> Best For Audience
              </h2>
              <div className="space-y-3">
                {form.bestFor.map((bf, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input value={bf} onChange={e => handleListChange('bestFor', idx, e.target.value)} placeholder="e.g., Class XI & XII students"
                      className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-500 transition-all font-medium text-sm" />
                    <button onClick={() => removeListItem('bestFor', idx)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addListItem('bestFor')} className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-2 py-1">
                  <Plus size={16} /> Add Audience
                </button>
              </div>
            </section>

          </div>
        </div>

        {/* Right Side: Live Preview */}
        <div className="w-full lg:w-2/5 bg-slate-50 overflow-y-auto flex flex-col items-center pt-20 pb-12 px-6 lg:px-8 relative border-t lg:border-t-0"
             style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          
          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur rounded-full shadow-sm border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Live Preview</span>
          </div>

          <div className="w-full max-w-sm">
            {/* The exactly replicated card component from page.tsx */}
            <motion.div
              initial={false}
              animate={{ 
                y: form.popular ? -8 : 0, 
                boxShadow: form.popular ? `0 12px 40px ${form.color}20` : '0 10px 30px rgba(0,0,0,0.05)',
                borderColor: form.popular ? form.color : '#e5e7eb'
              }}
              className="flex flex-col rounded-2xl overflow-hidden border-2 bg-white transition-all duration-300 w-full"
            >
              {/* Card Header */}
              <div className="px-6 pt-6 pb-5 transition-colors duration-300" style={{ background: `linear-gradient(135deg, ${form.color} 0%, ${form.color}cc 100%)` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white/60 text-xs font-black uppercase tracking-widest">COURSE PREVIEW</span>
                  {form.tag && (
                    <span className="text-xs font-black px-2.5 py-1 rounded-full text-white bg-white/25 border border-white/40">
                      {form.tag}
                    </span>
                  )}
                  {form.badge && (
                    <span className="ml-auto text-xs font-black px-2.5 py-1 rounded-full text-white bg-white/25 border border-white/40">
                      {form.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-white font-black text-xl leading-tight mb-1">{form.name || 'Course Name'}</h3>
                <p className="text-white/75 text-sm mb-3">{form.subtitle || 'Course subtitle goes here'}</p>
                {form.startDate && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/80 uppercase tracking-wider">
                    <span>{new Date(form.startDate).toLocaleDateString()}</span>
                    {form.endDate && <span> - {new Date(form.endDate).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col p-6">
                {/* What's Included */}
                <div className="mb-5">
                  <p className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors duration-300" style={{ color: form.color }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> What's Included
                  </p>
                  <ul className="space-y-2">
                    {form.features.filter(Boolean).length > 0 ? (
                      form.features.filter(Boolean).map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5 text-sm">
                          <span className="mt-1 w-4 h-4 flex-shrink-0 rounded-full flex items-center justify-center transition-colors duration-300" style={{ background: `${form.color}18` }}>
                            <CheckCircle2 className="w-3 h-3 transition-colors duration-300" style={{ color: form.color }} />
                          </span>
                          <span className="text-gray-700 leading-snug">{f}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-gray-400 italic">Add features to see them here...</li>
                    )}
                  </ul>
                </div>

                {/* Best For */}
                <div className="mb-6">
                  <p className="text-xs font-black uppercase tracking-widest mb-2.5 text-gray-500">Best For</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.bestFor.filter(Boolean).length > 0 ? (
                      form.bestFor.filter(Boolean).map((b, bi) => (
                        <span key={bi}
                          className="text-xs px-3 py-1 rounded-full font-semibold transition-colors duration-300"
                          style={{ background: `${form.color}12`, color: form.color, border: `1px solid ${form.color}25` }}>
                          {b}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 italic">Add audiences...</span>
                    )}
                  </div>
                </div>

                {/* Enroll Button */}
                <div className="mt-auto">
                  <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all duration-300"
                    style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}bb)`, color: "white", boxShadow: `0 6px 20px ${form.color}35` }}>
                    Enroll Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Course Fee Footer */}
              <div className="px-6 py-4 flex items-center justify-between transition-colors duration-300" style={{ background: `${form.color}08`, borderTop: `2px solid ${form.color}20` }}>
                <span className="text-xs font-black uppercase tracking-widest transition-colors duration-300" style={{ color: form.color }}>Course Fee</span>
                <span className="text-2xl font-black transition-colors duration-300" style={{ color: form.color }}>₹{form.fee ? Number(form.fee).toLocaleString() : '0'}</span>
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CourseBuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <CourseBuilderContent />
    </Suspense>
  );
}
