"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, Calendar, Plus, Play, StopCircle, Trash, Clock, Save, Edit3, Grid, PlayCircle, ArrowLeft, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { DataTable, RowActions } from '@/components/tables/DataTable.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { teacherAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

export default function TeacherLiveClassesPage() {
  const [activeTab, setActiveTab] = useState('TIMETABLE_BUILDER'); // 'DAILY_MONITOR' | 'TIMETABLE_BUILDER'
  const [loading, setLoading] = useState(true);
  
  // Daily Monitor State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedules, setSchedules] = useState([]);
  const [activeClasses, setActiveClasses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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
  const ongoingClasses = activeClasses.filter((liveClass) => liveClass.status === 'ONGOING');

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
      const [batchRes, subRes, liveRes] = await Promise.all([
        teacherAPI.getViewBatches(),
        teacherAPI.getSubjects(),
        teacherAPI.getLiveClasses()
      ]);
      setClasses(batchRes.data?.data || []);
      setSubjects(subRes.data?.data || []);
      setActiveClasses(liveRes.data?.data || []);
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setTeachers([parsed]);
        setCurrentUser(parsed);
      }
    } catch (error) {
      toast.error('Failed to load initial data');
    }
  };

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      const [schedRes, liveRes] = await Promise.all([
        teacherAPI.getCalculatedSchedule({ date: selectedDate }),
        teacherAPI.getLiveClasses()
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
        teacherAPI.getClassSchedule({ batchId: selectedBatchId }),
        teacherAPI.getLiveClasses()
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
      const res = await teacherAPI.createLiveClass({ classScheduleId: scheduleId, platform: 'custom' });
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
      await teacherAPI.endLiveClass(liveClassId);
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
      await teacherAPI.createScheduleOverride(payload);
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

  const handleCellClick = (dayIndex, col) => {
    const existing = gridSchedules.find(s => s.dayOfWeek === dayIndex && s.startTime === col.startTime && s.endTime === col.endTime);
    setCellData({
      scheduleId: existing ? existing._id : null,
      dayOfWeek: dayIndex,
      startTime: col.startTime,
      endTime: col.endTime,
      subjectId: existing?.subjectId?._id || '',
      teacherId: existing?.teacherId?._id || ''
    });
    setShowCellModal(true);
  };

  const handleSaveCell = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        batchId: selectedBatchId,
        subjectId: cellData.subjectId || undefined,
        teacherId: cellData.teacherId,
        dayOfWeek: cellData.dayOfWeek,
        startTime: cellData.startTime,
        endTime: cellData.endTime
      };
      
      // If updating, delete old one first for simplicity, or if our API supports upsert, use that.
      // Since createClassSchedule creates a new one, we should delete the old if it existed and is changed.
      if (cellData.scheduleId) {
        await teacherAPI.deleteClassSchedule(cellData.scheduleId);
      }
      await teacherAPI.createClassSchedule(payload);
      
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
      await teacherAPI.deleteClassSchedule(cellData.scheduleId);
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

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Video className="w-5 h-5 text-success-500" /> Ongoing Live Classes
            </h2>
            <p className="text-sm text-surface-500">Your currently running classes appear here instantly.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDailyData}>
            Refresh
          </Button>
        </div>

        {ongoingClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ongoingClasses.map((liveClass) => {
              const schedule = liveClass.classScheduleId || {};
              const batch = schedule.batchId || {};
              const subject = schedule.subjectId || {};

              return (
                <div
                  key={liveClass._id}
                  className="rounded-2xl border border-success-200 bg-success-50/70 dark:bg-success-900/10 dark:border-success-900/40 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-success-600">Live Now</div>
                      <h3 className="font-bold text-surface-900 dark:text-white">
                        {subject.name || 'Live Class'}
                      </h3>
                      <p className="text-sm text-surface-600 dark:text-surface-300">
                        {batch.name || 'Class'}{batch.section ? ` • Section ${batch.section}` : ''}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300">
                      {liveClass.status}
                    </span>
                  </div>

                  <div className="text-sm text-surface-500 space-y-1">
                    <p>Teacher: {liveClass.teacherId?.firstName || currentUser?.firstName || 'You'} {liveClass.teacherId?.lastName || currentUser?.lastName || ''}</p>
                    {liveClass.roomCode && <p>Room: {liveClass.roomCode}</p>}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="success" className="flex-1" onClick={() => handleJoinClass(liveClass)}>
                      <PlayCircle size={16} className="mr-1" /> Rejoin
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => handleEndClass(liveClass._id)}>
                      <StopCircle size={16} className="mr-1" /> End
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-200 dark:border-surface-700 p-8 text-center text-surface-500">
            No ongoing live classes right now.
          </div>
        )}
      </Card>

      {/* activeTab === 'DAILY_MONITOR' && ... */}

      {activeTab === 'TIMETABLE_BUILDER' && (
        <Card className="p-5 overflow-x-auto">
          {!selectedBatchId ? (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Grid className="text-primary-500 w-5 h-5" /> Select Class for Timetable
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-4">
                {classes.map(c => (
                  <motion.div
                    key={c._id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedBatchId(c._id)}
                    className="cursor-pointer bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 hover:border-primary-500 hover:shadow-lg rounded-xl p-5 flex flex-col items-center justify-center transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mb-3">
                      <BookOpen size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-surface-900 dark:text-white">{c.name}</h3>
                    {c.section && <span className="text-xs px-2 py-1 bg-surface-100 dark:bg-surface-800 rounded-md mt-1 text-surface-600 dark:text-surface-300">Section {c.section}</span>}
                  </motion.div>
                ))}
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
              </div>

              <div className="min-w-[800px] overflow-x-auto pb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-semibold text-left w-32 sticky left-0 z-10">Day / Time</th>
                    {timeColumns.map((col, i) => (
                      <th key={i} className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-semibold text-center min-w-[150px]">
                        {col.startTime} - {col.endTime}
                      </th>
                    ))}
                    {timeColumns.length === 0 && (
                      <th className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-normal text-surface-500 italic">
                        No time slots available for this class.
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIndex) => (
                    <tr key={dayIndex}>
                      <td className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-medium sticky left-0 z-10">
                        {day}
                      </td>
                      {timeColumns.map((col, colIndex) => {
                        const cellSchedule = gridSchedules.find(s => s.dayOfWeek === dayIndex && s.startTime === col.startTime && s.endTime === col.endTime);
                        return (
                          <td 
                            key={colIndex} 
                            className="p-2 border border-surface-200 dark:border-surface-700 text-center relative group"
                          >
                        {cellSchedule ? (
                          <div className="bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-100 p-2 rounded text-sm h-full flex flex-col justify-center">
                            <div className="font-semibold truncate">{cellSchedule.subjectId?.name || 'No Subject'}</div>
                            <div className="text-xs opacity-80 truncate mb-1">{cellSchedule.teacherId?.firstName} {cellSchedule.teacherId?.lastName}</div>
                            {dayIndex === new Date().getDay() && currentUser && (cellSchedule.teacherId?._id === currentUser.userId || cellSchedule.teacherId?._id === currentUser._id) && (
                              activeClasses.find(lc => {
                                const lcId = lc.classScheduleId?._id || lc.classScheduleId;
                                return lcId === cellSchedule._id && lc.status === 'ONGOING';
                              }) ? (
                                <div className="mt-2 space-y-1">
                                  <Button 
                                    size="sm" 
                                    variant="success" 
                                    className="w-full" 
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
                                    className="w-full" 
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
                                  className="w-full mt-2" 
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
                          <div className="h-12 flex items-center justify-center text-surface-300 dark:text-surface-600">
                            -
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
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-sm p-6">
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
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
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
                      {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
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
