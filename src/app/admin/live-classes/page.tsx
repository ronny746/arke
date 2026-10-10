"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Calendar, Plus, Play, StopCircle, Trash, Clock, Save, 
  Edit3, Grid, PlayCircle, ArrowLeft, BookOpen, Sparkles, Shuffle, 
  CheckCircle2, RefreshCw, Filter, Layers, UserCheck, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { DataTable, RowActions } from '@/components/tables/DataTable.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WORKING_DAYS_DEFAULT = [1, 2, 3, 4, 5, 6]; // Mon to Sat

const DEFAULT_TIME_SLOTS = [
  { startTime: '09:00', endTime: '10:00' },
  { startTime: '10:00', endTime: '11:00' },
  { startTime: '11:15', endTime: '12:15' },
  { startTime: '12:15', endTime: '13:15' },
  { startTime: '14:00', endTime: '15:00' },
];

const getLiveClassUrl = (liveClass: any, preferHostUrl = false) => {
  const primaryUrl = preferHostUrl ? liveClass?.startUrl || liveClass?.meetingLink : liveClass?.meetingLink || liveClass?.startUrl;
  if (!primaryUrl) return null;

  if (primaryUrl.includes('zoom.us')) {
    return primaryUrl;
  }

  if (primaryUrl.includes('/class/')) {
    const roomCode = primaryUrl.split('/class/')[1]?.split(/[?#]/)[0];
    return roomCode ? `/class/${roomCode}` : primaryUrl;
  }

  return primaryUrl;
};

const getApiErrorMessage = (error: any, fallbackMessage: string) => {
  const candidate = error?.response?.data?.message || error?.message;
  return typeof candidate === 'string' && candidate.trim() ? candidate : fallbackMessage;
};

export default function AdminLiveClassesAndTimetablePage() {
  const [activeTab, setActiveTab] = useState<'TIMETABLE_BUILDER' | 'AUTO_GENERATOR' | 'DAILY_MONITOR'>('TIMETABLE_BUILDER');
  const [loading, setLoading] = useState(true);
  
  // Common Lookups
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [activeClasses, setActiveClasses] = useState<any[]>([]);

  // Daily Monitor State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideData, setOverrideData] = useState({
    recurringScheduleId: null,
    batchId: '',
    subjectId: '',
    teacherId: '',
    overrideDate: '',
    overrideType: 'CANCELLED',
    newStartTime: '',
    newEndTime: '',
    reason: ''
  });

  // Timetable Builder State
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [gridSchedules, setGridSchedules] = useState<any[]>([]);
  const [timeColumns, setTimeColumns] = useState<{ startTime: string; endTime: string }[]>([]);
  const [showTimeColumnModal, setShowTimeColumnModal] = useState(false);
  const [newTimeColumn, setNewTimeColumn] = useState({ startTime: '', endTime: '' });
  const [showEditTimeColumnModal, setShowEditTimeColumnModal] = useState(false);
  const [editTimeColumnData, setEditTimeColumnData] = useState({ oldStartTime: '', oldEndTime: '', newStartTime: '', newEndTime: '' });
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');
  
  const [showCellModal, setShowCellModal] = useState(false);
  const [cellData, setCellData] = useState({
    scheduleId: null,
    dayOfWeek: 0,
    startTime: '',
    endTime: '',
    subjectId: '',
    teacherId: ''
  });

  // =========================================================================
  // AUTOMATIC TIMETABLE & ROSTER ENGINE STATE
  // =========================================================================
  const [rosterBatchId, setRosterBatchId] = useState('');
  const [rosterWorkingDays, setRosterWorkingDays] = useState<number[]>(WORKING_DAYS_DEFAULT);
  const [rosterSlots, setRosterSlots] = useState<{ startTime: string; endTime: string }[]>(DEFAULT_TIME_SLOTS);
  const [newRosterSlot, setNewRosterSlot] = useState({ startTime: '', endTime: '' });
  
  // Roster allocations: [{ subjectId, teacherId, classesPerWeek }]
  const [rosterAllocations, setRosterAllocations] = useState<Array<{
    id: string;
    subjectId: string;
    teacherId: string;
    classesPerWeek: number;
  }>>([]);

  // Generated Draft Timetable: Array of { dayOfWeek, startTime, endTime, subjectId, teacherId, tempId }
  const [draftTimetable, setDraftTimetable] = useState<Array<{
    tempId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectId: string;
    teacherId: string;
  }>>([]);

  const [isDraftGenerated, setIsDraftGenerated] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [editingDraftSlot, setEditingDraftSlot] = useState<any>(null);
  const [showDraftEditModal, setShowDraftEditModal] = useState(false);

  // Initial Fetch
  const fetchInitialData = async () => {
    try {
      const [batchRes, teacherRes, subRes, liveRes] = await Promise.all([
        adminAPI.getBatches(),
        adminAPI.getUsers({ role: 'teacher' }),
        adminAPI.getSubjects(),
        adminAPI.getLiveClasses()
      ]);
      const fetchedBatches = batchRes.data?.data || [];
      setClasses(fetchedBatches);
      setTeachers(teacherRes.data?.data || []);
      setSubjects(subRes.data?.data || []);
      setActiveClasses(liveRes.data?.data || []);

      if (fetchedBatches.length > 0 && !rosterBatchId) {
        setRosterBatchId(fetchedBatches[0]._id);
      }
    } catch (error) {
      toast.error('Failed to load initial data');
    }
  };

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      const [schedRes, liveRes] = await Promise.all([
        adminAPI.getCalculatedSchedule({ date: selectedDate }),
        adminAPI.getLiveClasses()
      ]);
      setSchedules(schedRes.data?.data || []);
      setActiveClasses(liveRes.data?.data || []);
    } catch (error) {
      toast.error('Failed to load daily schedule');
    } finally {
      setLoading(false);
    }
  };

  const fetchGridData = async () => {
    if (!selectedBatchId) return;
    try {
      setLoading(true);
      const [res, liveRes] = await Promise.all([
        adminAPI.getClassSchedule({ batchId: selectedBatchId }),
        adminAPI.getLiveClasses()
      ]);
      const scheds = res.data?.data || [];
      setGridSchedules(scheds);
      setActiveClasses(liveRes.data?.data || []);

      // Extract unique time columns
      const cols: { startTime: string; endTime: string }[] = [];
      const colMap = new Set();
      scheds.forEach((s: any) => {
        const key = `${s.startTime}-${s.endTime}`;
        if (!colMap.has(key)) {
          colMap.add(key);
          cols.push({ startTime: s.startTime, endTime: s.endTime });
        }
      });
      cols.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTimeColumns(cols.length > 0 ? cols : DEFAULT_TIME_SLOTS);
    } catch (error) {
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'DAILY_MONITOR') {
      fetchDailyData();
    } else if (activeTab === 'TIMETABLE_BUILDER' && selectedBatchId) {
      fetchGridData();
    }
  }, [activeTab, selectedDate, selectedBatchId]);

  // Set initial roster allocation sample when subjects and teachers load
  useEffect(() => {
    if (subjects.length > 0 && teachers.length > 0 && rosterAllocations.length === 0) {
      const initial = subjects.slice(0, 4).map((sub, idx) => ({
        id: `alloc-${Date.now()}-${idx}`,
        subjectId: sub._id,
        teacherId: teachers[idx % teachers.length]._id,
        classesPerWeek: 5
      }));
      setRosterAllocations(initial);
    }
  }, [subjects, teachers]);

  // =========================================================================
  // AUTOMATIC TIMETABLE GENERATION ALGORITHM
  // =========================================================================
  const totalSlotsAvailable = useMemo(() => {
    return rosterWorkingDays.length * rosterSlots.length;
  }, [rosterWorkingDays, rosterSlots]);

  const totalClassesAllocated = useMemo(() => {
    return rosterAllocations.reduce((sum, item) => sum + (Number(item.classesPerWeek) || 0), 0);
  }, [rosterAllocations]);

  const addRosterAllocationRow = () => {
    if (subjects.length === 0 || teachers.length === 0) {
      toast.error('Please create subjects and teachers first.');
      return;
    }
    setRosterAllocations(prev => [
      ...prev,
      {
        id: `alloc-${Date.now()}`,
        subjectId: subjects[0]?._id || '',
        teacherId: teachers[0]?._id || '',
        classesPerWeek: 4
      }
    ]);
  };

  const removeRosterAllocationRow = (id: string) => {
    setRosterAllocations(prev => prev.filter(r => r.id !== id));
  };

  const updateRosterAllocation = (id: string, field: string, value: any) => {
    setRosterAllocations(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRosterTimeSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRosterSlot.startTime || !newRosterSlot.endTime) return;
    const key = `${newRosterSlot.startTime}-${newRosterSlot.endTime}`;
    if (rosterSlots.some(s => `${s.startTime}-${s.endTime}` === key)) {
      toast.error('Time slot already exists');
      return;
    }
    const updated = [...rosterSlots, newRosterSlot].sort((a, b) => a.startTime.localeCompare(b.startTime));
    setRosterSlots(updated);
    setNewRosterSlot({ startTime: '', endTime: '' });
  };

  const removeRosterTimeSlot = (slot: { startTime: string; endTime: string }) => {
    if (rosterSlots.length <= 1) {
      toast.error('At least one time slot is required.');
      return;
    }
    setRosterSlots(prev => prev.filter(s => !(s.startTime === slot.startTime && s.endTime === slot.endTime)));
  };

  // Generate / Rearrange Timetable
  const generateAutomaticTimetable = useCallback((seedShuffle = false) => {
    if (!rosterBatchId) {
      toast.error('Please select a target batch');
      return;
    }
    if (rosterWorkingDays.length === 0) {
      toast.error('Please select at least one working day');
      return;
    }
    if (rosterSlots.length === 0) {
      toast.error('Please configure at least one time slot');
      return;
    }
    if (rosterAllocations.length === 0) {
      toast.error('Please add at least one subject & teacher allocation');
      return;
    }

    // 1. Build list of class instances needed
    const classPool: Array<{ subjectId: string; teacherId: string }> = [];
    rosterAllocations.forEach(alloc => {
      const count = Number(alloc.classesPerWeek) || 0;
      for (let i = 0; i < count; i++) {
        classPool.push({
          subjectId: alloc.subjectId,
          teacherId: alloc.teacherId
        });
      }
    });

    if (classPool.length > totalSlotsAvailable) {
      toast.error(`Allocated classes (${classPool.length}) exceed available weekly slots (${totalSlotsAvailable}). Please increase slots/days or reduce classes per week.`);
      return;
    }

    // 2. Generate matrix coordinates: (dayOfWeek, slotIndex)
    const availableCells: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
    rosterWorkingDays.forEach(dayOfWeek => {
      rosterSlots.forEach(slot => {
        availableCells.push({
          dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime
        });
      });
    });

    // Shuffle pool and cells for fair distribution
    const shuffledPool = [...classPool].sort(() => Math.random() - 0.5);
    
    // Balanced allocation: distribute subjects across days
    const draft: Array<{
      tempId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      subjectId: string;
      teacherId: string;
    }> = [];

    // Track subject counts per day to avoid grouping same subject multiple times on one day
    const subjectDayCounts: Record<string, number> = {};

    // Sort cells: spread across days first
    const sortedCells = [...availableCells].sort((a, b) => {
      if (seedShuffle) return Math.random() - 0.5;
      return a.startTime.localeCompare(b.startTime) || a.dayOfWeek - b.dayOfWeek;
    });

    const unassignedPool = [...shuffledPool];

    for (const cell of sortedCells) {
      if (unassignedPool.length === 0) break;

      // Find best candidate from unassignedPool that has min occurrences on this day
      let candidateIdx = unassignedPool.findIndex(item => {
        const key = `${cell.dayOfWeek}-${item.subjectId}`;
        return (subjectDayCounts[key] || 0) === 0;
      });

      if (candidateIdx === -1) {
        candidateIdx = unassignedPool.findIndex(item => {
          const key = `${cell.dayOfWeek}-${item.subjectId}`;
          return (subjectDayCounts[key] || 0) < 2;
        });
      }

      if (candidateIdx === -1) {
        candidateIdx = 0; // fallback
      }

      const picked = unassignedPool.splice(candidateIdx, 1)[0];
      const countKey = `${cell.dayOfWeek}-${picked.subjectId}`;
      subjectDayCounts[countKey] = (subjectDayCounts[countKey] || 0) + 1;

      draft.push({
        tempId: `draft-${cell.dayOfWeek}-${cell.startTime}-${Math.random()}`,
        dayOfWeek: cell.dayOfWeek,
        startTime: cell.startTime,
        endTime: cell.endTime,
        subjectId: picked.subjectId,
        teacherId: picked.teacherId
      });
    }

    setDraftTimetable(draft);
    setIsDraftGenerated(true);
    toast.success(seedShuffle ? 'Timetable rearranged with new optimal balance!' : 'Automatic timetable generated successfully!');
  }, [rosterBatchId, rosterWorkingDays, rosterSlots, rosterAllocations, totalSlotsAvailable]);

  // Save the draft timetable to backend
  const handleSaveDraftTimetable = async () => {
    if (!rosterBatchId) {
      toast.error('No batch selected');
      return;
    }
    if (draftTimetable.length === 0) {
      toast.error('Draft timetable is empty');
      return;
    }

    try {
      setSavingDraft(true);
      await adminAPI.bulkSaveClassSchedule({
        batchId: rosterBatchId,
        schedules: draftTimetable.map(item => ({
          batchId: rosterBatchId,
          subjectId: item.subjectId,
          teacherId: item.teacherId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          isRecurring: true
        }))
      });

      toast.success('Timetable saved and published successfully!');
      setSelectedBatchId(rosterBatchId);
      setActiveTab('TIMETABLE_BUILDER');
      fetchGridData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save timetable');
    } finally {
      setSavingDraft(false);
    }
  };

  // Edit / Reschedule single slot in draft
  const handleOpenEditDraftSlot = (dayOfWeek: number, slot: { startTime: string; endTime: string }) => {
    const existing = draftTimetable.find(d => d.dayOfWeek === dayOfWeek && d.startTime === slot.startTime && d.endTime === slot.endTime);
    setEditingDraftSlot({
      dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectId: existing?.subjectId || subjects[0]?._id || '',
      teacherId: existing?.teacherId || teachers[0]?._id || '',
      isNew: !existing
    });
    setShowDraftEditModal(true);
  };

  const handleSaveDraftSlotEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraftSlot) return;

    setDraftTimetable(prev => {
      const filtered = prev.filter(d => !(d.dayOfWeek === editingDraftSlot.dayOfWeek && d.startTime === editingDraftSlot.startTime && d.endTime === editingDraftSlot.endTime));
      if (editingDraftSlot.subjectId && editingDraftSlot.teacherId) {
        filtered.push({
          tempId: `draft-${editingDraftSlot.dayOfWeek}-${editingDraftSlot.startTime}-${Date.now()}`,
          dayOfWeek: editingDraftSlot.dayOfWeek,
          startTime: editingDraftSlot.startTime,
          endTime: editingDraftSlot.endTime,
          subjectId: editingDraftSlot.subjectId,
          teacherId: editingDraftSlot.teacherId
        });
      }
      return filtered;
    });

    setShowDraftEditModal(false);
    toast.success('Draft slot updated');
  };

  const handleDeleteDraftSlot = (dayOfWeek: number, slot: { startTime: string; endTime: string }) => {
    setDraftTimetable(prev => prev.filter(d => !(d.dayOfWeek === dayOfWeek && d.startTime === slot.startTime && d.endTime === slot.endTime)));
    toast.success('Period cleared from draft');
  };

  // =========================================================================
  // LIVE CLASS & MANUAL TIMETABLE BUILDER ACTIONS
  // =========================================================================
  const handleStartClass = async (scheduleId: string) => {
    try {
      const res = await adminAPI.createLiveClass({ classScheduleId: scheduleId, platform: 'zoom' });
      toast.success("Zoom Live class started!");
      const startUrl = getLiveClassUrl(res.data?.data, true);
      if (startUrl) {
        window.open(startUrl, '_blank');
      }
      fetchDailyData();
      if (selectedBatchId) fetchGridData();
    } catch (err: any) {
      const existingLiveClass = err?.response?.data?.data;
      if (err?.response?.status === 409 && existingLiveClass) {
        toast(getApiErrorMessage(err, "A live class is already running. Rejoining it now."), { icon: 'ℹ️' });
        handleJoinClass(existingLiveClass);
        fetchDailyData();
        return;
      }
      toast.error(getApiErrorMessage(err, "Failed to start live class"));
    }
  };

  const handleJoinClass = (liveClass: any) => {
    const joinUrl = getLiveClassUrl(liveClass, true);
    if (!joinUrl) {
      toast.error("No meeting link available");
      return;
    }
    window.open(joinUrl, '_blank');
  };

  const handleEndClass = async (liveClassId: string) => {
    if (!window.confirm("End this live class?")) return;
    try {
      await adminAPI.endLiveClass(liveClassId);
      toast.success("Class ended");
      fetchDailyData();
      if (selectedBatchId) fetchGridData();
    } catch (err) {
      toast.error("Failed to end class");
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...overrideData };
      if (!payload.subjectId) delete payload.subjectId;
      await adminAPI.createScheduleOverride(payload);
      toast.success("Schedule updated successfully!");
      setShowOverrideModal(false);
      fetchDailyData();
    } catch (err) {
      toast.error("Failed to update schedule");
    }
  };

  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        batchId: selectedBatchId,
        teacherId: cellData.teacherId,
        dayOfWeek: cellData.dayOfWeek,
        startTime: cellData.startTime,
        endTime: cellData.endTime
      };
      if (cellData.subjectId) payload.subjectId = cellData.subjectId;
      
      if (cellData.scheduleId) {
        await adminAPI.deleteClassSchedule(cellData.scheduleId);
      }
      await adminAPI.createClassSchedule(payload);
      
      toast.success("Cell updated successfully");
      setShowCellModal(false);
      fetchGridData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update cell");
    }
  };

  const handleDirectDeleteSchedule = async (scheduleId: string, e: any) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this class schedule?")) return;
    try {
      await adminAPI.deleteClassSchedule(scheduleId);
      toast.success("Class schedule removed");
      fetchGridData();
    } catch (err) {
      toast.error("Failed to remove schedule");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
      <PageHeader
        title="Timetable & Live Class Control Centre"
        subtitle="Manage master timetables, auto-generate conflict-free rosters, and monitor live Zoom classes."
        breadcrumbs={['Home', 'Live Classes & Timetable']}
      />

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-200 dark:border-surface-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('TIMETABLE_BUILDER')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
            activeTab === 'TIMETABLE_BUILDER'
              ? 'bg-[#1a7a35] text-white shadow-sm'
              : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
          }`}
        >
          <Grid size={16} /> Weekly Timetable Master
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AUTO_GENERATOR')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
            activeTab === 'AUTO_GENERATOR'
              ? 'bg-[#1a7a35] text-white shadow-sm'
              : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
          }`}
        >
          <Sparkles size={16} className="text-amber-400" /> Auto-Generate Timetable (Roster Engine)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DAILY_MONITOR')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
            activeTab === 'DAILY_MONITOR'
              ? 'bg-[#1a7a35] text-white shadow-sm'
              : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
          }`}
        >
          <Video size={16} /> Daily Live Class Monitor
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AUTO-TIMETABLE GENERATOR & ROSTER ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'AUTO_GENERATOR' && (
        <div className="space-y-6">
          {/* Header Card */}
          <section className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#1a7a35] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-black text-gray-800 dark:text-white">
                    Smart Timetable Generator & Roster Engine
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                    Configure time slots, assign teachers and weekly periods, then automatically generate, rearrange, edit, and publish a conflict-free timetable.
                  </p>
                </div>
              </div>

              {isDraftGenerated && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generateAutomaticTimetable(true)}
                    className="text-xs font-bold"
                  >
                    <Shuffle size={14} className="mr-1.5" /> Rearrange / Shuffle
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={savingDraft}
                    onClick={handleSaveDraftTimetable}
                    className="text-xs font-bold shadow-sm"
                  >
                    <Save size={14} className="mr-1.5" /> Save & Publish Timetable
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Configuration Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Batch & Working Days + Time Slots */}
            <div className="space-y-6">
              {/* Batch & Days */}
              <Card className="p-5 space-y-4">
                <h3 className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-2">
                  <Layers size={16} className="text-[#1a7a35]" /> 1. Select Target Batch & Days
                </h3>

                <div>
                  <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">
                    Target Batch
                  </label>
                  <select
                    value={rosterBatchId}
                    onChange={(e) => {
                      setRosterBatchId(e.target.value);
                      setIsDraftGenerated(false);
                    }}
                    className="w-full p-2.5 border rounded-xl bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-xs font-semibold focus:outline-none"
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name}{c.section ? ` · Section ${c.section}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-2">
                    Operating Days
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map(dayIdx => {
                      const isSelected = rosterWorkingDays.includes(dayIdx);
                      return (
                        <button
                          key={dayIdx}
                          type="button"
                          onClick={() => {
                            setRosterWorkingDays(prev => 
                              isSelected ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx].sort()
                            );
                            setIsDraftGenerated(false);
                          }}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                            isSelected
                              ? 'bg-[#1a7a35] text-white shadow-xs'
                              : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200'
                          }`}
                        >
                          {DAYS[dayIdx].slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Time Slots (Periods) */}
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-2">
                    <Clock size={16} className="text-[#1a7a35]" /> 2. Time Slots / Periods
                  </h3>
                  <span className="text-xs font-bold text-[#1a7a35]">
                    {rosterSlots.length} periods
                  </span>
                </div>

                {/* Slots List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {rosterSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl border border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-surface-200 dark:bg-surface-700 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-surface-800 dark:text-surface-200">
                          {slot.startTime} – {slot.endTime}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeRosterTimeSlot(slot);
                          setIsDraftGenerated(false);
                        }}
                        className="text-surface-400 hover:text-red-500 p-1"
                        title="Remove period"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Time Slot Form */}
                <form onSubmit={addRosterTimeSlot} className="pt-2 border-t border-surface-100 dark:border-surface-800 flex gap-2">
                  <input
                    type="time"
                    required
                    value={newRosterSlot.startTime}
                    onChange={(e) => setNewRosterSlot({ ...newRosterSlot, startTime: e.target.value })}
                    className="p-1.5 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-xs w-full"
                    placeholder="Start"
                  />
                  <input
                    type="time"
                    required
                    value={newRosterSlot.endTime}
                    onChange={(e) => setNewRosterSlot({ ...newRosterSlot, endTime: e.target.value })}
                    className="p-1.5 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-xs w-full"
                    placeholder="End"
                  />
                  <Button type="submit" size="sm" variant="outline" className="px-3 shrink-0">
                    <Plus size={14} /> Add
                  </Button>
                </form>
              </Card>
            </div>

            {/* Right: Teacher & Subject Roster Allocations */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-100 dark:border-surface-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm md:text-base text-surface-900 dark:text-white flex items-center gap-2">
                      <UserCheck size={18} className="text-[#1a7a35]" /> 3. Teachers & Subject Roster
                    </h3>
                    <p className="text-xs text-surface-500 mt-0.5">
                      Assign subjects, teachers, and weekly class counts for this batch.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      totalClassesAllocated === totalSlotsAvailable
                        ? 'bg-emerald-100 text-emerald-800'
                        : totalClassesAllocated > totalSlotsAvailable
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {totalClassesAllocated} / {totalSlotsAvailable} periods assigned
                    </span>
                    <Button type="button" size="sm" variant="outline" onClick={addRosterAllocationRow}>
                      <Plus size={14} className="mr-1" /> Add Subject
                    </Button>
                  </div>
                </div>

                {/* Roster Allocations Table */}
                <div className="space-y-2.5 overflow-x-auto">
                  {rosterAllocations.map((alloc) => (
                    <div
                      key={alloc.id}
                      className="flex flex-wrap md:flex-nowrap items-center gap-2.5 p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50"
                    >
                      {/* Subject Selection */}
                      <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-bold text-surface-500 uppercase mb-0.5">Subject</label>
                        <select
                          value={alloc.subjectId}
                          onChange={(e) => {
                            updateRosterAllocation(alloc.id, 'subjectId', e.target.value);
                            setIsDraftGenerated(false);
                          }}
                          className="w-full p-2 border rounded-lg bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-xs font-bold focus:outline-none"
                        >
                          {subjects.map(sub => (
                            <option key={sub._id} value={sub._id}>{sub.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Teacher Selection */}
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-[10px] font-bold text-surface-500 uppercase mb-0.5">Assigned Teacher</label>
                        <select
                          value={alloc.teacherId}
                          onChange={(e) => {
                            updateRosterAllocation(alloc.id, 'teacherId', e.target.value);
                            setIsDraftGenerated(false);
                          }}
                          className="w-full p-2 border rounded-lg bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-xs font-semibold focus:outline-none"
                        >
                          {teachers.map(t => (
                            <option key={t._id} value={t._id}>{t.firstName} {t.lastName || ''}</option>
                          ))}
                        </select>
                      </div>

                      {/* Classes / Week */}
                      <div className="w-28 shrink-0">
                        <label className="block text-[10px] font-bold text-surface-500 uppercase mb-0.5">Classes/Wk</label>
                        <input
                          type="number"
                          min={1}
                          max={15}
                          value={alloc.classesPerWeek}
                          onChange={(e) => {
                            updateRosterAllocation(alloc.id, 'classesPerWeek', parseInt(e.target.value) || 0);
                            setIsDraftGenerated(false);
                          }}
                          className="w-full p-2 border rounded-lg bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-xs font-bold text-center focus:outline-none"
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => {
                          removeRosterAllocationRow(alloc.id);
                          setIsDraftGenerated(false);
                        }}
                        className="p-2 text-surface-400 hover:text-red-500 rounded-lg transition mt-3"
                        title="Remove allocation"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  ))}

                  {rosterAllocations.length === 0 && (
                    <div className="text-center py-8 text-xs text-surface-500 border border-dashed border-surface-300 rounded-xl">
                      No subjects added yet. Click '+ Add Subject' above.
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <div className="pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                  <p className="text-xs text-surface-500">
                    Creates an optimized, conflict-free schedule balanced across all days.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => generateAutomaticTimetable(false)}
                    className="font-black shadow-md"
                  >
                    <Sparkles size={16} className="mr-1.5" /> Generate Automatic Timetable
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* GENERATED DRAFT TIMETABLE MATRIX (WITH REARRANGE, EDIT & SAVE) */}
          {/* ========================================================================= */}
          {isDraftGenerated && (
            <Card className="p-5 space-y-5 border-2 border-emerald-300 dark:border-emerald-800 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      DRAFT PREVIEW
                    </span>
                    <h3 className="text-lg font-black text-surface-900 dark:text-white">
                      Generated Timetable for {classes.find(c => c._id === rosterBatchId)?.name}
                    </h3>
                  </div>
                  <p className="text-xs text-surface-500 mt-1">
                    Click any slot to reschedule or edit. Click 'Rearrange' to shuffle into another optimal plan. When satisfied, click 'Save & Publish'.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generateAutomaticTimetable(true)}
                    className="text-xs font-bold"
                  >
                    <Shuffle size={14} className="mr-1.5" /> Rearrange / Shuffle
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={savingDraft}
                    onClick={handleSaveDraftTimetable}
                    className="text-xs font-black shadow-sm"
                  >
                    <Save size={14} className="mr-1.5" /> Save & Publish Timetable
                  </Button>
                </div>
              </div>

              {/* Draft Timetable Grid */}
              <div className="w-full overflow-x-auto rounded-2xl border border-surface-200 dark:border-surface-700 shadow-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3.5 border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 font-bold text-left w-36 sticky left-0 z-10">
                        Day / Time
                      </th>
                      {rosterSlots.map((col, i) => (
                        <th key={i} className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 font-bold text-center min-w-[180px]">
                          {col.startTime} – {col.endTime}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rosterWorkingDays.map(dayIdx => (
                      <tr key={dayIdx} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                        <td className="p-3.5 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-bold text-sm sticky left-0 z-10">
                          {DAYS[dayIdx]}
                        </td>
                        {rosterSlots.map((col, colIdx) => {
                          const slotItem = draftTimetable.find(
                            d => d.dayOfWeek === dayIdx && d.startTime === col.startTime && d.endTime === col.endTime
                          );
                          const subObj = subjects.find(s => s._id === slotItem?.subjectId);
                          const teachObj = teachers.find(t => t._id === slotItem?.teacherId);

                          return (
                            <td
                              key={colIdx}
                              onClick={() => handleOpenEditDraftSlot(dayIdx, col)}
                              className="p-2 border border-surface-200 dark:border-surface-700 text-center hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors relative group align-top min-h-[85px]"
                            >
                              {slotItem && subObj ? (
                                <div className="bg-[#ecfdf5] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 p-2.5 rounded-xl text-sm h-full flex flex-col justify-between shadow-xs relative">
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-bold text-xs md:text-sm text-left truncate text-emerald-900 dark:text-emerald-200">
                                      {subObj.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDraftSlot(dayIdx, col);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-emerald-600 hover:text-red-500 rounded transition"
                                      title="Clear period"
                                    >
                                      <Trash size={12} />
                                    </button>
                                  </div>
                                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate text-left mt-1 font-medium">
                                    {teachObj ? `${teachObj.firstName} ${teachObj.lastName || ''}` : 'Teacher'}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-12 flex items-center justify-center text-surface-300 dark:text-surface-600 group-hover:text-emerald-600">
                                  <Plus size={16} />
                                  <span className="text-[10px] ml-1 font-semibold opacity-0 group-hover:opacity-100">Set Slot</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Draft Slot Edit / Reschedule Modal */}
          {showDraftEditModal && editingDraftSlot && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
                <h3 className="text-lg font-bold text-surface-900 dark:text-white">
                  Reschedule / Edit Draft Slot
                </h3>
                <p className="text-xs text-surface-500">
                  {DAYS[editingDraftSlot.dayOfWeek]} • {editingDraftSlot.startTime} – {editingDraftSlot.endTime}
                </p>

                <form onSubmit={handleSaveDraftSlotEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">Subject</label>
                    <select
                      value={editingDraftSlot.subjectId}
                      onChange={(e) => setEditingDraftSlot({ ...editingDraftSlot, subjectId: e.target.value })}
                      className="w-full p-2 border rounded-xl bg-surface-50 dark:bg-surface-900 text-xs font-bold"
                    >
                      {subjects.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Teacher</label>
                    <select
                      value={editingDraftSlot.teacherId}
                      onChange={(e) => setEditingDraftSlot({ ...editingDraftSlot, teacherId: e.target.value })}
                      className="w-full p-2 border rounded-xl bg-surface-50 dark:bg-surface-900 text-xs font-bold"
                    >
                      {teachers.map(t => (
                        <option key={t._id} value={t._id}>{t.firstName} {t.lastName || ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowDraftEditModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm">
                      Apply to Draft
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TIMETABLE BUILDER / MASTER VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'TIMETABLE_BUILDER' && (
        <Card className="p-5 overflow-x-auto space-y-6">
          {!selectedBatchId ? (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Grid className="text-[#1a7a35]" /> Select Batch for Weekly Timetable
                  </h2>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Choose a batch to view or edit its active weekly class schedule.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveTab('AUTO_GENERATOR')}
                  className="font-bold text-xs"
                >
                  <Sparkles size={14} className="mr-1.5" /> Auto-Generate Timetable
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 py-4">
                {classes.map(c => {
                  const active = activeClasses.find(lc => {
                    const bId = lc.classScheduleId?.batchId?._id || lc.classScheduleId?.batchId;
                    return (bId === c._id || lc.batchName === c.name) && lc.status === 'ONGOING';
                  });

                  return (
                    <motion.div
                      key={c._id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedBatchId(c._id)}
                      className="cursor-pointer bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 hover:border-[#1a7a35] hover:shadow-lg rounded-2xl p-5 flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/40 text-[#1a7a35] rounded-xl flex items-center justify-center">
                            <BookOpen size={20} />
                          </div>
                          {active && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-500/10 text-green-600 border border-green-500/20 animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> LIVE NOW
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-surface-900 dark:text-white mb-1">{c.name}</h3>
                        {c.section && (
                          <span className="text-xs px-2 py-0.5 bg-surface-100 dark:bg-surface-800 rounded-md text-surface-600 dark:text-surface-300">
                            Section {c.section}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1a7a35]">View Timetable →</span>
                        {active && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinClass(active);
                            }}
                          >
                            <PlayCircle size={14} className="mr-1" /> Watch Live
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedBatchId("")} className="hover:bg-surface-100">
                    <ArrowLeft size={18} className="mr-2" /> Back to Batches
                  </Button>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Grid className="text-[#1a7a35]" /> 
                    {classes.find(c => c._id === selectedBatchId)?.name} 
                    {classes.find(c => c._id === selectedBatchId)?.section ? ` · Sec ${classes.find(c => c._id === selectedBatchId)?.section}` : ''}
                    <span className="text-sm font-normal text-surface-500 ml-2">Active Timetable</span>
                  </h2>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setRosterBatchId(selectedBatchId);
                      setActiveTab('AUTO_GENERATOR');
                    }}
                  >
                    <Sparkles size={14} className="mr-1.5" /> Auto-Generate for This Batch
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setShowTimeColumnModal(true)}>
                    <Plus size={16} className="mr-1" /> Add Time Slot
                  </Button>
                </div>
              </div>

              {/* Day Filter Pill Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedDayFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedDayFilter === 'ALL'
                      ? 'bg-[#1a7a35] text-white shadow-sm'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200'
                  }`}
                >
                  Weekly View (All Days)
                </button>
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayFilter(String(idx))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      String(selectedDayFilter) === String(idx)
                        ? 'bg-[#1a7a35] text-white shadow-sm'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Timetable Matrix */}
              <div className="w-full overflow-x-auto rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3.5 border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 font-bold text-left w-36 sticky left-0 z-10">
                        Day / Time
                      </th>
                      {timeColumns.map((col, i) => (
                        <th key={i} className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 font-semibold text-center min-w-[190px] group/th">
                          <div className="flex items-center justify-between gap-1.5 px-2">
                            <span className="font-bold text-sm text-surface-900 dark:text-surface-100">
                              {col.startTime} – {col.endTime}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover/th:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTimeColumnData({
                                    oldStartTime: col.startTime,
                                    oldEndTime: col.endTime,
                                    newStartTime: col.startTime,
                                    newEndTime: col.endTime
                                  });
                                  setShowEditTimeColumnModal(true);
                                }}
                                className="p-1 text-surface-500 hover:text-[#1a7a35] rounded"
                                title="Edit Time Slot"
                              >
                                <Edit3 size={13} />
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDayFilter === 'ALL' ? DAYS.map((d, i) => ({ day: d, dayIndex: i })) : [{ day: DAYS[parseInt(selectedDayFilter)], dayIndex: parseInt(selectedDayFilter) }]).map(({ day, dayIndex }) => (
                      <tr key={dayIndex} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                        <td className="p-3.5 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-bold text-sm sticky left-0 z-10">
                          {day}
                        </td>
                        {timeColumns.map((col, colIndex) => {
                          const cellSchedule = gridSchedules.find(s => s.dayOfWeek === dayIndex && s.startTime === col.startTime && s.endTime === col.endTime);
                          const active = cellSchedule && activeClasses.find(lc => {
                            const lcId = lc.classScheduleId?._id || lc.classScheduleId;
                            return lcId === cellSchedule._id && lc.status === 'ONGOING';
                          });

                          return (
                            <td 
                              key={colIndex} 
                              onClick={() => {
                                setCellData({
                                  scheduleId: cellSchedule ? cellSchedule._id : null,
                                  dayOfWeek: dayIndex,
                                  startTime: col.startTime,
                                  endTime: col.endTime,
                                  subjectId: cellSchedule?.subjectId?._id || cellSchedule?.subjectId || subjects[0]?._id || '',
                                  teacherId: cellSchedule?.teacherId?._id || cellSchedule?.teacherId || teachers[0]?._id || ''
                                });
                                setShowCellModal(true);
                              }}
                              className="p-2 border border-surface-200 dark:border-surface-700 text-center hover:bg-emerald-50/70 cursor-pointer transition-colors relative group align-top min-h-[90px]"
                            >
                              {cellSchedule ? (
                                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 p-2.5 rounded-xl text-sm h-full flex flex-col justify-between group/card relative shadow-xs">
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="font-bold text-xs md:text-sm text-left truncate text-emerald-900 dark:text-emerald-200">
                                      {cellSchedule.subjectId?.name || 'Class'}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDirectDeleteSchedule(cellSchedule._id, e)}
                                      className="opacity-0 group-hover/card:opacity-100 p-1 text-surface-400 hover:text-red-500 rounded transition"
                                      title="Remove class"
                                    >
                                      <Trash size={12} />
                                    </button>
                                  </div>
                                  <div className="text-xs text-surface-600 dark:text-surface-300 truncate text-left my-1 font-medium">
                                    {cellSchedule.teacherId?.firstName} {cellSchedule.teacherId?.lastName || ''}
                                  </div>
                                  {dayIndex === new Date().getDay() && (
                                    active ? (
                                      <Button 
                                        size="sm" 
                                        variant="success" 
                                        className="w-full text-xs font-bold mt-1" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleJoinClass(active);
                                        }}
                                      >
                                        <PlayCircle size={13} className="mr-1"/> Rejoin
                                      </Button>
                                    ) : (
                                      <Button 
                                        size="sm" 
                                        variant="primary" 
                                        className="w-full mt-1 text-xs font-bold" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartClass(cellSchedule._id);
                                        }}
                                      >
                                        <Play size={13} className="mr-1"/> Start
                                      </Button>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="h-14 flex flex-col items-center justify-center text-surface-300 dark:text-surface-600 group-hover:text-[#1a7a35] transition-colors">
                                  <Plus size={18} />
                                  <span className="text-[10px] opacity-0 group-hover:opacity-100 font-semibold transition-opacity">Add Class</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DAILY LIVE MONITOR */}
      {/* ========================================================================= */}
      {activeTab === 'DAILY_MONITOR' && (
        <div className="space-y-6">
          <Card className="p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-surface-900 dark:text-white">
                  <Clock className="text-[#1a7a35]" size={20} /> Daily Schedule & Live Monitor
                </h2>
                <p className="mt-0.5 text-xs text-surface-500">
                  Track scheduled classes and live Zoom meetings across all batches for the chosen date.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="p-2 border rounded-xl bg-surface-50 dark:bg-surface-900 text-xs font-bold"
                />
                <Button type="button" variant="outline" size="sm" onClick={fetchDailyData}>
                  <RefreshCw size={14} className="mr-1.5" /> Refresh
                </Button>
              </div>
            </div>

            {/* Daily Schedule List */}
            <div className="mt-5 space-y-3">
              {schedules.map((row) => {
                const active = activeClasses.find(lc => (lc.classScheduleId?._id || lc.classScheduleId) === row._id && lc.status === 'ONGOING');
                return (
                  <div
                    key={row._id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                      active ? 'border-emerald-300 bg-emerald-50/70' : 'border-surface-200 bg-white dark:bg-surface-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          active ? 'bg-emerald-600 text-white animate-pulse' : 'bg-surface-100 text-surface-700'
                        }`}>
                          {active ? 'LIVE NOW' : 'SCHEDULED'}
                        </span>
                        <h4 className="font-bold text-sm text-surface-900 dark:text-white">{row.subjectId?.name || 'Class'}</h4>
                      </div>
                      <p className="text-xs text-surface-500 mt-1">
                        Batch: {row.batchId?.name}{row.batchId?.section ? ` · Sec ${row.batchId.section}` : ''} • Teacher: {row.teacherId?.firstName} {row.teacherId?.lastName || ''}
                      </p>
                      <p className="text-xs font-semibold text-[#1a7a35] mt-1">
                        {row.startTime} – {row.endTime}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {active ? (
                        <>
                          <Button size="sm" variant="success" onClick={() => handleJoinClass(active)}>
                            <PlayCircle size={14} className="mr-1" /> Rejoin
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleEndClass(active._id)}>
                            <StopCircle size={14} className="mr-1" /> End
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="primary" onClick={() => handleStartClass(row._id)}>
                          <Play size={14} className="mr-1" /> Start Zoom
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {schedules.length === 0 && (
                <div className="text-center py-10 text-xs text-surface-500 border border-dashed border-surface-200 rounded-2xl">
                  No classes scheduled for {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Manual Slot / Cell Edit Modal */}
      {showCellModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-surface-900 dark:text-white">
              {cellData.scheduleId ? 'Edit Timetable Slot' : 'Add Class to Slot'}
            </h3>
            <p className="text-xs text-surface-500">
              {DAYS[cellData.dayOfWeek]} • {cellData.startTime} – {cellData.endTime}
            </p>

            <form onSubmit={handleSaveCell} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Subject</label>
                <select
                  value={cellData.subjectId}
                  onChange={(e) => setCellData({ ...cellData, subjectId: e.target.value })}
                  className="w-full p-2 border rounded-xl bg-surface-50 dark:bg-surface-900 text-xs font-bold"
                >
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Teacher</label>
                <select
                  value={cellData.teacherId}
                  onChange={(e) => setCellData({ ...cellData, teacherId: e.target.value })}
                  className="w-full p-2 border rounded-xl bg-surface-50 dark:bg-surface-900 text-xs font-bold"
                >
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>{t.firstName} {t.lastName || ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCellModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Slot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Time Column Modal */}
      {showTimeColumnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Add Time Column</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newTimeColumn.startTime || !newTimeColumn.endTime) return;
              setTimeColumns(prev => [...prev, newTimeColumn].sort((a, b) => a.startTime.localeCompare(b.startTime)));
              setShowTimeColumnModal(false);
              setNewTimeColumn({ startTime: '', endTime: '' });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={newTimeColumn.startTime}
                  onChange={e => setNewTimeColumn({ ...newTimeColumn, startTime: e.target.value })}
                  className="w-full p-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={newTimeColumn.endTime}
                  onChange={e => setNewTimeColumn({ ...newTimeColumn, endTime: e.target.value })}
                  className="w-full p-2 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowTimeColumnModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Add Column</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
