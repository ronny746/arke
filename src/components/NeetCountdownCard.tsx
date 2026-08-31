"use client";

import { useState, useEffect } from 'react';
import { Flame, Calendar, Edit3, Save, X, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { publicAPI } from '@/api/publicAPI.js';
import { adminAPI } from '@/api/admin.js';

interface NeetConfig {
  examTitle: string;
  examDate: string;
  targetDateLabel?: string;
  isTentative?: boolean;
  startDate?: string;
  subtitle?: string;
  daysLabel?: string;
}

interface NeetCountdownCardProps {
  isAdmin?: boolean;
}

export default function NeetCountdownCard({ isAdmin = false }: NeetCountdownCardProps) {
  const [config, setConfig] = useState<NeetConfig>({
    examTitle: "NEET UG 2026",
    examDate: "2026-05-03T10:00:00.000Z",
    targetDateLabel: "Expected May 2026 (Tentative)",
    isTentative: true,
    subtitle: "Stay focused. Every day brings you closer to your dream medical college! 🎯",
    daysLabel: "DAYS LEFT"
  });

  const [daysLeft, setDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTargetDateLabel, setEditTargetDateLabel] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editDaysLabel, setEditDaysLabel] = useState('');

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await publicAPI.getPublicSettings();
      if (res.data?.success && res.data?.data?.neetExamConfig) {
        setConfig(res.data.data.neetExamConfig);
      }
    } catch (err) {
      console.error("Failed to fetch NEET Countdown config", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Calculate days remaining
  useEffect(() => {
    const calculateDays = () => {
      const target = new Date(config.examDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setDaysLeft(0);
        return;
      }

      const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
      setDaysLeft(days);
    };

    calculateDays();
    const interval = setInterval(calculateDays, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [config.examDate]);

  const openEditModal = () => {
    setEditTitle(config.examTitle || 'NEET UG 2026');
    
    try {
      const d = new Date(config.examDate);
      const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      setEditDate(isoLocal);
    } catch {
      setEditDate('2026-05-03');
    }

    setEditTargetDateLabel(config.targetDateLabel || 'Expected May 2026 (Tentative)');
    setEditSubtitle(config.subtitle || 'Stay focused. Every day brings you closer to your dream medical college! 🎯');
    setEditDaysLabel(config.daysLabel || 'DAYS LEFT');
    setIsEditing(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        neetExamConfig: {
          examTitle: editTitle,
          examDate: new Date(editDate).toISOString(),
          targetDateLabel: editTargetDateLabel,
          subtitle: editSubtitle,
          daysLabel: editDaysLabel
        }
      };

      const res = await adminAPI.updateSystemConfig(payload);
      if (res.data?.success) {
        toast.success("NEET Goal Card updated successfully!");
        setConfig({
          ...config,
          examTitle: editTitle,
          examDate: new Date(editDate).toISOString(),
          targetDateLabel: editTargetDateLabel,
          subtitle: editSubtitle,
          daysLabel: editDaysLabel
        });
        setIsEditing(false);
      } else {
        toast.error("Failed to update goal settings.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-rose-950 p-3.5 md:p-4 text-white shadow-lg border border-white/10"
      >
        {/* Ambient subtle glow background */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-rose-500/15 blur-2xl pointer-events-none" />

        {/* Single Row Flex Container */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
          
          {/* Left: Icon + Title + Date Label */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
              <Flame className="w-5 h-5 animate-pulse text-amber-400" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-white tracking-wide">
                  {config.examTitle}
                </span>
                {config.targetDateLabel && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    {config.targetDateLabel}
                  </span>
                )}
              </div>
              {config.subtitle && (
                <p className="text-xs text-slate-300 font-medium truncate mt-0.5 hidden md:block">
                  {config.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Days Count Pill + Edit Button */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
            {config.subtitle && (
              <p className="text-xs text-slate-300 font-medium truncate md:hidden">
                {config.subtitle}
              </p>
            )}

            <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
              {/* Days Counter Badge */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15">
                <Target className="w-4 h-4 text-rose-400" />
                <span className="text-lg font-black tracking-tight text-white font-mono leading-none">
                  {daysLeft}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {config.daysLabel || "DAYS LEFT"}
                </span>
              </div>

              {/* Admin Edit Button */}
              {isAdmin && (
                <button
                  onClick={openEditModal}
                  title="Edit Goal Card"
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/15 active:scale-95 shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5 text-rose-300" />
                </button>
              )}
            </div>
          </div>

        </div>
      </motion.div>

      {/* Admin Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
                    <Flame className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">Edit Goal Card Text</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">All fields are editable for web & mobile app.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Exam Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. NEET UG 2026"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Target Exam Date (Calculates Remaining Days)
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Date Tag / Tentative Text
                  </label>
                  <input
                    type="text"
                    value={editTargetDateLabel}
                    onChange={(e) => setEditTargetDateLabel(e.target.value)}
                    placeholder="e.g. Expected May 2026 (Tentative)"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Goal Reminder / Subtitle Text
                  </label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    placeholder="e.g. Stay focused. Every day counts toward your goal! 🎯"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Days Badge Label
                  </label>
                  <input
                    type="text"
                    value={editDaysLabel}
                    onChange={(e) => setEditDaysLabel(e.target.value)}
                    placeholder="e.g. DAYS LEFT or DAYS TO GO"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {saving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
