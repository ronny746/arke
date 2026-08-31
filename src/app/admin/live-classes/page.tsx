"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, Calendar, Plus, Play, StopCircle, Trash, Clock, Save, Edit3, Grid, PlayCircle, ArrowLeft, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { DataTable, RowActions } from '@/components/tables/DataTable.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LIVE_CLASS_SUBJECT_OPTIONS = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

const getLiveClassUrl = (liveClass, preferHostUrl = false) => {
  const primaryUrl = preferHostUrl ? liveClass?.startUrl || liveClass?.meetingLink : liveClass?.meetingLink || liveClass?.startUrl;
  if (!primaryUrl) return null;

  if (primaryUrl.includes('/class/')) {
    const roomCode = primaryUrl.split('/class/')[1]?.split(/[?#]/)[0];
    return roomCode ? `/class/${roomCode}` : primaryUrl;
  }

  return primaryUrl;
};

const getApiErrorMessage = (error, fallbackMessage) => {
  const candidate = error?.response?.data?.message || error?.message;
  return typeof candidate === 'string' && candidate.trim() ? candidate : fallbackMessage;
};

export default function LiveClassesPage() {
  const [activeTab, setActiveTab] = useState('TIMETABLE_BUILDER'); // 'DAILY_MONITOR' | 'TIMETABLE_BUILDER'
  const [loading, setLoading] = useState(true);
  
  // Daily Monitor State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedules, setSchedules] = useState([]);
  const [activeClasses, setActiveClasses] = useState([]);
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
  const [gridSchedules, setGridSchedules] = useState([]);
  const [timeColumns, setTimeColumns] = useState([]); // [{startTime, endTime}]
  const [showTimeColumnModal, setShowTimeColumnModal] = useState(false);
  const [newTimeColumn, setNewTimeColumn] = useState({ startTime: '', endTime: '' });
  const [showEditTimeColumnModal, setShowEditTimeColumnModal] = useState(false);
  const [editTimeColumnData, setEditTimeColumnData] = useState({ oldStartTime: '', oldEndTime: '', newStartTime: '', newEndTime: '' });
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL'); // 'ALL' | 0..6
  
  const [showCellModal, setShowCellModal] = useState(false);
  const [cellData, setCellData] = useState({
    scheduleId: null,
    dayOfWeek: 0,
    startTime: '',
    endTime: '',
    subjectId: '',
    teacherId: ''
  });

  // Common Lookups
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);

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

  const fetchInitialData = async () => {
    try {
      const [batchRes, teacherRes, subRes, liveRes] = await Promise.all([
        adminAPI.getBatches(),
        adminAPI.getUsers({ role: 'teacher' }),
        adminAPI.getSubjects(),
        adminAPI.getLiveClasses()
      ]);
      setClasses(batchRes.data?.data || []);
      setTeachers(teacherRes.data?.data || []);
      setSubjects(subRes.data?.data || []);
      setActiveClasses(liveRes.data?.data || []);
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
      const cols = [];
      const colMap = new Set();
      scheds.forEach(s => {
        const key = `${s.startTime}-${s.endTime}`;
        if (!colMap.has(key)) {
          colMap.add(key);
          cols.push({ startTime: s.startTime, endTime: s.endTime });
        }
      });
      // Sort columns by start time
      cols.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTimeColumns(cols);
    } catch (error) {
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleStartClass = async (scheduleId) => {
    try {
      const res = await adminAPI.createLiveClass({ classScheduleId: scheduleId, platform: 'custom' });
      toast.success("Live class started!");
      const startUrl = getLiveClassUrl(res.data?.data, true);
      if (startUrl) {
        window.open(startUrl, '_blank');
      }
      fetchDailyData();
    } catch (err) {
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

  const handleJoinClass = (liveClass) => {
    const joinUrl = getLiveClassUrl(liveClass, true);
    if (!joinUrl) {
      toast.error("No meeting link available");
      return;
    }

    window.open(joinUrl, '_blank');
  };

  const handleEndClass = async (liveClassId) => {
    if (!window.confirm("End this live class?")) return;
    try {
      await adminAPI.endLiveClass(liveClassId);
      toast.success("Class ended");
      fetchDailyData();
    } catch (err) {
      toast.error("Failed to end class");
    }
  };

  const handleOverrideSubmit = async (e) => {
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

  // --- Timetable Builder Actions ---
  const handleAddTimeColumn = (e) => {
    e.preventDefault();
    if (!newTimeColumn.startTime || !newTimeColumn.endTime) return;
    const key = `${newTimeColumn.startTime}-${newTimeColumn.endTime}`;
    if (timeColumns.some(c => `${c.startTime}-${c.endTime}` === key)) {
      toast.error("Time slot already exists");
      return;
    }
    const newCols = [...timeColumns, newTimeColumn].sort((a, b) => a.startTime.localeCompare(b.startTime));
    setTimeColumns(newCols);
    setNewTimeColumn({ startTime: '', endTime: '' });
    setShowTimeColumnModal(false);
  };

  const handleOpenEditTimeColumn = (col, e) => {
    if (e) e.stopPropagation();
    setEditTimeColumnData({
      oldStartTime: col.startTime,
      oldEndTime: col.endTime,
      newStartTime: col.startTime,
      newEndTime: col.endTime
    });
    setShowEditTimeColumnModal(true);
  };

  const handleSaveEditTimeColumn = async (e) => {
    e.preventDefault();
    const { oldStartTime, oldEndTime, newStartTime, newEndTime } = editTimeColumnData;
    if (!newStartTime || !newEndTime) return;
    try {
      setLoading(true);
      const toUpdate = gridSchedules.filter(s => s.startTime === oldStartTime && s.endTime === oldEndTime);
      for (const item of toUpdate) {
        if (item._id) {
          await adminAPI.deleteClassSchedule(item._id);
          await adminAPI.createClassSchedule({
            batchId: selectedBatchId,
            subjectId: item.subjectId?._id || item.subjectId,
            teacherId: item.teacherId?._id || item.teacherId,
            dayOfWeek: item.dayOfWeek,
            startTime: newStartTime,
            endTime: newEndTime
          });
        }
      }
      setShowEditTimeColumnModal(false);
      toast.success("Time slot updated successfully!");
      fetchGridData();
    } catch (err) {
      toast.error("Failed to update time slot");
      setLoading(false);
    }
  };

  const handleDeleteTimeColumn = async (col, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete time slot (${col.startTime} - ${col.endTime}) and all scheduled classes in it?`)) return;
    try {
      setLoading(true);
      const toDelete = gridSchedules.filter(s => s.startTime === col.startTime && s.endTime === col.endTime);
      for (const item of toDelete) {
        if (item._id) {
          await adminAPI.deleteClassSchedule(item._id);
        }
      }
      setTimeColumns(prev => prev.filter(c => !(c.startTime === col.startTime && c.endTime === col.endTime)));
      toast.success(`Time slot ${col.startTime} - ${col.endTime} deleted`);
      fetchGridData();
    } catch (err) {
      toast.error("Failed to delete time slot");
      setLoading(false);
    }
  };

  const handleDirectDeleteSchedule = async (scheduleId, e) => {
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

  const handleCellClick = (dayIndex, col) => {
    const existing = gridSchedules.find(s => s.dayOfWeek === dayIndex && s.startTime === col.startTime && s.endTime === col.endTime);
    const existingSubjectName = existing?.subjectId?.name || '';
    setCellData({
      scheduleId: existing ? existing._id : null,
      dayOfWeek: dayIndex,
      startTime: col.startTime,
      endTime: col.endTime,
      subjectId: existingSubjectName,
      teacherId: existing?.teacherId?._id || ''
    });
    setShowCellModal(true);
  };

  const handleSaveCell = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        batchId: selectedBatchId,
        teacherId: cellData.teacherId,
        dayOfWeek: cellData.dayOfWeek,
        startTime: cellData.startTime,
        endTime: cellData.endTime
      };

      if (cellData.subjectId) {
        const matchingSubject = subjects.find((subject) => subject.name === cellData.subjectId);
        if (!matchingSubject?._id) {
          toast.error("Selected subject is not available in the database");
          return;
        }
        payload.subjectId = matchingSubject._id;
      }
      
      // If updating, delete old one first for simplicity, or if our API supports upsert, use that.
      // Since createClassSchedule creates a new one, we should delete the old if it existed and is changed.
      if (cellData.scheduleId) {
        await adminAPI.deleteClassSchedule(cellData.scheduleId);
      }
      await adminAPI.createClassSchedule(payload);
      
      toast.success("Cell updated successfully");
      setShowCellModal(false);
      fetchGridData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update cell");
    }
  };

  const handleDeleteCell = async () => {
    if (!cellData.scheduleId) return;
    if (!window.confirm("Remove this schedule?")) return;
    try {
      await adminAPI.deleteClassSchedule(cellData.scheduleId);
      toast.success("Schedule removed");
      setShowCellModal(false);
      fetchGridData();
    } catch (error) {
      toast.error("Failed to remove");
    }
  };


  const scheduleColumns = [
    { header: 'Status', cell: (row) => row.type === 'EXTRA_CLASS' ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Extra</span> : (row.isRescheduled ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Rescheduled</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Regular</span>) },
    { header: 'Class', cell: (row) => `${row.batchId?.name} ${row.batchId?.section || ''}` },
    { header: 'Subject', cell: (row) => row.subjectId?.name || 'N/A' },
    { header: 'Teacher', cell: (row) => `${row.teacherId?.firstName} ${row.teacherId?.lastName}` },
    { header: 'Date/Day', cell: (row) => row.type === 'EXTRA_CLASS' ? new Date(selectedDate).toLocaleDateString() : DAYS[row.dayOfWeek] },
    { header: 'Time', cell: (row) => `${row.startTime} - ${row.endTime}` },
    {
      header: 'Actions',
      cell: (row) => {
        const active = activeClasses.find(lc => lc.classScheduleId?._id === row._id && lc.status === 'ONGOING');
        const actions = [];
        if (row.type === 'RECURRING') {
          actions.push({
            icon: Calendar,
            label: 'Reschedule',
            onClick: () => {
              setOverrideData({
                recurringScheduleId: row._id,
                batchId: row.batchId._id,
                subjectId: row.subjectId?._id || '',
                teacherId: row.teacherId._id,
                overrideDate: selectedDate,
                overrideType: 'RESCHEDULED',
                newStartTime: row.startTime,
                newEndTime: row.endTime,
                reason: ''
              });
              setShowOverrideModal(true);
            }
          });
          actions.push({
            icon: Trash,
            label: 'Cancel Class',
            onClick: () => {
              setOverrideData({
                recurringScheduleId: row._id,
                batchId: row.batchId._id,
                subjectId: row.subjectId?._id || '',
                teacherId: row.teacherId._id,
                overrideDate: selectedDate,
                overrideType: 'CANCELLED',
                newStartTime: '',
                newEndTime: '',
                reason: ''
              });
              setShowOverrideModal(true);
            }
          });
        }
        if (active) {
          actions.push({
            icon: StopCircle,
            label: 'End Class',
            onClick: () => handleEndClass(active._id)
          });
        } else {
          actions.push({
            icon: Play,
            label: 'Start Class Now',
            onClick: () => handleStartClass(row._id)
          });
        }
        return <RowActions actions={actions} />;
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Timetable & Live Classes"
        subtitle="Manage weekly timetables and monitor daily live sessions"
        breadcrumbs={['Home', 'Live Classes']}
      />

      {/* activeTab === 'DAILY_MONITOR' && ... */}

      {activeTab === 'TIMETABLE_BUILDER' && (
        <Card className="p-5 overflow-x-auto">
          {!selectedBatchId ? (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Grid className="text-primary-500" /> Select Class for Timetable
                </h2>
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
                      className="cursor-pointer bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 hover:border-primary-500 hover:shadow-lg rounded-2xl p-5 flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center">
                            <BookOpen size={20} />
                          </div>
                          {active && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-500/10 text-green-600 border border-green-500/20 animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> LIVE NOW
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-surface-900 dark:text-white mb-1">{c.name}</h3>
                        {c.section && <span className="text-xs px-2 py-0.5 bg-surface-100 dark:bg-surface-800 rounded-md text-surface-600 dark:text-surface-300">Section {c.section}</span>}
                      </div>

                      {active ? (
                        <Button
                          variant="success"
                          className="w-full mt-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinClass(active);
                          }}
                        >
                          <PlayCircle size={18} className="mr-2" /> Watch Live Class
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full mt-4">
                          <Calendar size={18} className="mr-2" /> View Timetable
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
                {classes.length === 0 && (
                  <div className="col-span-full text-center py-12 text-surface-500 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
                    No classes available.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedBatchId("")} className="hover:bg-surface-100 dark:hover:bg-surface-800">
                    <ArrowLeft size={18} className="mr-2" /> Back
                  </Button>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Grid className="text-primary-500" /> 
                    {classes.find(c => c._id === selectedBatchId)?.name} 
                    {classes.find(c => c._id === selectedBatchId)?.section ? ` - Sec ${classes.find(c => c._id === selectedBatchId)?.section}` : ''}
                    <span className="text-sm font-normal text-surface-500 ml-2">Weekly Timetable</span>
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const active = activeClasses.find(lc => {
                      const bId = lc.classScheduleId?.batchId?._id || lc.classScheduleId?.batchId;
                      return bId === selectedBatchId && lc.status === 'ONGOING';
                    });
                    return active ? (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleJoinClass(active)}
                      >
                        <PlayCircle size={16} className="mr-1.5" /> Watch Live Class
                      </Button>
                    ) : null;
                  })()}
                  <Button variant="outline" size="sm" onClick={() => setShowTimeColumnModal(true)}>
                    <Plus size={16} className="mr-1" /> Add Time Slot
                  </Button>
                </div>
              </div>

              {/* Responsive Day Filter Pill Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedDayFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedDayFilter === 'ALL'
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-900/30'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                  }`}
                >
                  Weekly View (All Days)
                </button>
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayFilter(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedDayFilter === idx
                        ? 'bg-primary-600 text-white shadow-sm shadow-primary-900/30'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
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
                    <th className="p-3.5 border border-surface-200 dark:border-surface-700 bg-surface-100/80 dark:bg-surface-800 font-bold text-left w-36 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                      Day / Time
                    </th>
                    {timeColumns.map((col, i) => (
                      <th key={i} className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-100/80 dark:bg-surface-800 font-semibold text-center min-w-[190px] group/th">
                        <div className="flex items-center justify-between gap-1.5 px-2">
                          <span className="font-bold text-sm tracking-tight text-surface-900 dark:text-surface-100">
                            {col.startTime} - {col.endTime}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover/th:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditTimeColumn(col, e)}
                              className="p-1 text-surface-500 hover:text-primary-600 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition"
                              title="Edit Time Slot"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTimeColumn(col, e)}
                              className="p-1 text-surface-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-lg transition"
                              title="Delete Time Slot"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                    {timeColumns.length === 0 && (
                      <th className="p-4 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-normal text-surface-500 italic">
                        No time slots added yet. Click '+ Add Time Slot' above.
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(selectedDayFilter === 'ALL' ? DAYS.map((d, i) => ({ day: d, dayIndex: i })) : [{ day: DAYS[selectedDayFilter], dayIndex: selectedDayFilter }]).map(({ day, dayIndex }) => (
                    <tr key={dayIndex} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                      <td className="p-3.5 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-bold text-sm sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        {day}
                      </td>
                      {timeColumns.map((col, colIndex) => {
                        const cellSchedule = gridSchedules.find(s => s.dayOfWeek === dayIndex && s.startTime === col.startTime && s.endTime === col.endTime);
                        return (
                          <td 
                            key={colIndex} 
                            onClick={() => handleCellClick(dayIndex, col)}
                            className="p-2 border border-surface-200 dark:border-surface-700 text-center hover:bg-primary-50/70 dark:hover:bg-primary-900/20 cursor-pointer transition-colors relative group align-top min-h-[90px]"
                          >
                        {cellSchedule ? (
                          <div className="bg-primary-100/80 dark:bg-primary-900/40 border border-primary-200/80 dark:border-primary-800/60 text-primary-900 dark:text-primary-100 p-2.5 rounded-xl text-sm h-full flex flex-col justify-between group/card relative shadow-sm">
                            <div className="flex items-start justify-between gap-1">
                              <div className="font-bold text-xs md:text-sm text-left truncate text-primary-700 dark:text-primary-300">
                                {cellSchedule.subjectId?.name || 'No Subject'}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDirectDeleteSchedule(cellSchedule._id, e)}
                                className="opacity-0 group-hover/card:opacity-100 p-1 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                                title="Remove this class"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                            <div className="text-xs text-surface-600 dark:text-surface-300 truncate text-left my-1 font-medium">
                              {cellSchedule.teacherId?.firstName} {cellSchedule.teacherId?.lastName}
                            </div>
                            {dayIndex === new Date().getDay() && (
                              activeClasses.find(lc => {
                                const lcId = lc.classScheduleId?._id || lc.classScheduleId;
                                return lcId === cellSchedule._id && lc.status === 'ONGOING';
                              }) ? (
                                <div className="mt-2 space-y-1">
                                  <Button 
                                    size="sm" 
                                    variant="success" 
                                    className="w-full text-xs font-bold" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJoinClass(activeClasses.find(lc => {
                                        const lcId = lc.classScheduleId?._id || lc.classScheduleId;
                                        return lcId === cellSchedule._id && lc.status === 'ONGOING';
                                      }));
                                    }}
                                  >
                                    <PlayCircle size={14} className="mr-1"/> Rejoin
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="danger" 
                                    className="w-full text-xs font-bold" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEndClass(activeClasses.find(lc => {
                                        const lcId = lc.classScheduleId?._id || lc.classScheduleId;
                                        return lcId === cellSchedule._id && lc.status === 'ONGOING';
                                      })._id);
                                    }}
                                  >
                                    <StopCircle size={14} className="mr-1"/> End
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="primary" 
                                  className="w-full mt-2 text-xs font-bold" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartClass(cellSchedule._id);
                                  }}
                                >
                                  <Play size={14} className="mr-1"/> Start
                                </Button>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="h-14 flex flex-col items-center justify-center text-surface-300 dark:text-surface-600 group-hover:text-primary-500 transition-colors">
                            <Plus size={18} />
                            <span className="text-[10px] opacity-0 group-hover:opacity-100 font-semibold transition-opacity">Add Class</span>
                          </div>
                        )}
                          </td>
                        );
                      })}
                      {timeColumns.length === 0 && (
                        <td className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50"></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </Card>
      )}


      {/* Add Time Column Modal */}
      {showTimeColumnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Add Time Slot</h2>
            <form onSubmit={handleAddTimeColumn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input type="time" required value={newTimeColumn.startTime} onChange={e => setNewTimeColumn({...newTimeColumn, startTime: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input type="time" required value={newTimeColumn.endTime} onChange={e => setNewTimeColumn({...newTimeColumn, endTime: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowTimeColumnModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Add Column</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Time Column Modal */}
      {showEditTimeColumnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-1">Edit Time Slot</h2>
            <p className="text-xs text-surface-500 mb-4">
              Updating this slot will update all scheduled classes from {editTimeColumnData.oldStartTime} - {editTimeColumnData.oldEndTime}.
            </p>
            <form onSubmit={handleSaveEditTimeColumn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">New Start Time</label>
                <input
                  type="time"
                  required
                  value={editTimeColumnData.newStartTime}
                  onChange={e => setEditTimeColumnData({...editTimeColumnData, newStartTime: e.target.value})}
                  className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New End Time</label>
                <input
                  type="time"
                  required
                  value={editTimeColumnData.newEndTime}
                  onChange={e => setEditTimeColumnData({...editTimeColumnData, newEndTime: e.target.value})}
                  className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditTimeColumnModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Cell Modal */}
      {showCellModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Assign Teacher</h2>
                <p className="text-sm text-surface-500">{DAYS[cellData.dayOfWeek]} • {cellData.startTime} - {cellData.endTime}</p>
              </div>
              {cellData.scheduleId && (
                <div className="flex items-center gap-2">
                  {cellData.dayOfWeek === new Date().getDay() && (
                    activeClasses.find(lc => lc.classScheduleId?._id === cellData.scheduleId && lc.status === 'ONGOING') ? (
                      <Button size="sm" variant="danger" onClick={() => handleEndClass(activeClasses.find(lc => lc.classScheduleId?._id === cellData.scheduleId && lc.status === 'ONGOING')._id)}>
                        <StopCircle size={16} className="mr-1"/> End Class
                      </Button>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => handleStartClass(cellData.scheduleId)}>
                        <Play size={16} className="mr-1"/> Start Class Today
                      </Button>
                    )
                  )}
                  <button type="button" onClick={handleDeleteCell} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Schedule">
                    <Trash size={20} />
                  </button>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSaveCell} className="space-y-4">
              <div>
                    <label className="block text-sm font-medium mb-1">Subject (Optional)</label>
                    <select value={cellData.subjectId} onChange={e => setCellData({...cellData, subjectId: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700">
                      <option value="">-- Select Subject --</option>
                      {LIVE_CLASS_SUBJECT_OPTIONS.map((subjectName) => (
                        <option key={subjectName} value={subjectName}>{subjectName}</option>
                      ))}
                    </select>
                  </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teacher</label>
                <select required value={cellData.teacherId} onChange={e => setCellData({...cellData, teacherId: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700">
                  <option value="">-- Select Teacher --</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCellModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Cell</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {overrideData.overrideType === 'CANCELLED' ? 'Cancel Class' : (overrideData.overrideType === 'RESCHEDULED' ? 'Reschedule Class' : 'Add Extra Class')}
            </h2>
            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              {overrideData.overrideType === 'EXTRA_CLASS' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Batch</label>
                    <select required value={overrideData.batchId} onChange={e => setOverrideData({...overrideData, batchId: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700">
                      <option value="">-- Select Batch --</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject (Optional)</label>
                    <select value={overrideData.subjectId} onChange={e => setOverrideData({...overrideData, subjectId: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700">
                      <option value="">-- Select Subject --</option>
                      {LIVE_CLASS_SUBJECT_OPTIONS.map((subjectName) => {
                        const matchingSubject = subjects.find((subject) => subject.name === subjectName);
                        return (
                          <option key={subjectName} value={matchingSubject?._id || ''} disabled={!matchingSubject?._id}>
                            {subjectName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Teacher</label>
                    <select required value={overrideData.teacherId} onChange={e => setOverrideData({...overrideData, teacherId: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700">
                      <option value="">-- Select Teacher --</option>
                      {teachers.map(t => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                    </select>
                  </div>
                </>
              )}
              
              {overrideData.overrideType !== 'CANCELLED' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">New Start Time</label>
                    <input type="time" required value={overrideData.newStartTime} onChange={e => setOverrideData({...overrideData, newStartTime: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">New End Time</label>
                    <input type="time" required value={overrideData.newEndTime} onChange={e => setOverrideData({...overrideData, newEndTime: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                <input type="text" value={overrideData.reason} onChange={e => setOverrideData({...overrideData, reason: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowOverrideModal(false)}>Cancel</Button>
                <Button type="submit" variant={overrideData.overrideType === 'CANCELLED' ? 'danger' : 'primary'}>Confirm</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
