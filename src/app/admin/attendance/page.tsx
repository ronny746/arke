"use client";

import { useEffect, useState, useMemo } from 'react';
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X, 
  FileText, 
  UserCheck, 
  Layers, 
  BarChart3, 
  ChevronRight, 
  Sparkles,
  CalendarCheck,
  CalendarX,
  MessageSquare,
  Eye,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, Avatar, Badge } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/modals/index.jsx';
import { adminAPI } from '@/api/admin';
import { formatDate } from '@/utils/helpers';

type TabMode = 'batches' | 'leaves' | 'logs';

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<TabMode>('batches');
  const [loading, setLoading] = useState(true);

  // Core Data
  const [attendanceRegisters, setAttendanceRegisters] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

  // Selected Batch for drilldown
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchTab, setBatchTab] = useState<'students' | 'registers'>('students');

  // Filters
  const [batchSearch, setBatchSearch] = useState('');
  const [batchCourseFilter, setBatchCourseFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentHealthFilter, setStudentHealthFilter] = useState<'all' | 'low' | 'good'>('all');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [leaveSearch, setLeaveSearch] = useState('');

  // Modals
  const [selectedRegister, setSelectedRegister] = useState<any | null>(null);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<any | null>(null);
  const [reviewModal, setReviewModal] = useState<{
    leave: any;
    action: 'APPROVED' | 'REJECTED';
    note: string;
  } | null>(null);
  const [reviewing, setReviewing] = useState(false);

  // Manual Mark Attendance Modal
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [markDate, setMarkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [markSubject, setMarkSubject] = useState('General');
  const [markRecords, setMarkRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, batchRes, stuRes, leaveRes] = await Promise.all([
        adminAPI.getAttendance({}).catch(() => ({ data: { data: [] } })),
        adminAPI.getBatches().catch(() => ({ data: { data: [] } })),
        adminAPI.getUsers({ role: 'student' }).catch(() => ({ data: { data: [] } })),
        adminAPI.getLeaveRequests({}).catch(() => ({ data: { data: [] } }))
      ]);

      setAttendanceRegisters(attRes.data?.data || attRes.data || []);
      setBatches(batchRes.data?.data || []);
      setStudents(Array.isArray(stuRes.data?.data) ? stuRes.data.data : (stuRes.data?.data?.users || []));
      setLeaveRequests(leaveRes.data?.data || leaveRes.data || []);
    } catch (error) {
      toast.error('Failed to load attendance records and leaves.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Map student IDs to student objects
  const studentMap = useMemo(() => {
    const map = new Map<string, any>();
    students.forEach(s => map.set(String(s._id || s.id), s));
    return map;
  }, [students]);

  // Unique Courses for filters
  const uniqueCourses = useMemo(() => {
    const map = new Map<string, string>();
    batches.forEach(b => {
      if (b.courseId && b.courseId.name) {
        map.set(String(b.courseId._id || b.courseId), b.courseId.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [batches]);

  // Pending Leave count
  const pendingLeavesCount = useMemo(() => {
    return leaveRequests.filter(l => l.status === 'PENDING').length;
  }, [leaveRequests]);

  // Batch analytics computation
  const batchStatsMap = useMemo(() => {
    const map = new Map<string, {
      totalRegisters: number;
      totalEntries: number;
      presentEntries: number;
      averageRate: number;
      lastDate: string | null;
    }>();

    batches.forEach(b => {
      const bId = String(b._id);
      const registers = attendanceRegisters.filter(r => {
        const regBatchId = String(r.batchId?._id || r.batchId);
        return regBatchId === bId;
      });

      let totalEntries = 0;
      let presentEntries = 0;
      let lastDate: string | null = null;

      registers.forEach(reg => {
        const records = reg.records || [];
        totalEntries += records.length;
        presentEntries += records.filter((rec: any) => ['present', 'late'].includes(rec.status)).length;
        if (!lastDate || new Date(reg.date) > new Date(lastDate)) {
          lastDate = reg.date;
        }
      });

      const averageRate = totalEntries > 0 ? Math.round((presentEntries / totalEntries) * 100) : 0;
      map.set(bId, {
        totalRegisters: registers.length,
        totalEntries,
        presentEntries,
        averageRate,
        lastDate
      });
    });

    return map;
  }, [batches, attendanceRegisters]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (batchSearch.trim()) {
        const q = batchSearch.trim().toLowerCase();
        const matchName = b.name?.toLowerCase().includes(q);
        const matchSection = b.section?.toLowerCase().includes(q);
        const matchCourse = b.courseId?.name?.toLowerCase().includes(q);
        if (!matchName && !matchSection && !matchCourse) return false;
      }
      if (batchCourseFilter) {
        const cId = String(b.courseId?._id || b.courseId);
        if (cId !== batchCourseFilter) return false;
      }
      return true;
    });
  }, [batches, batchSearch, batchCourseFilter]);

  // Active Batch Object
  const currentBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return batches.find(b => String(b._id) === String(selectedBatchId)) || null;
  }, [selectedBatchId, batches]);

  // Registers for current batch
  const currentBatchRegisters = useMemo(() => {
    if (!selectedBatchId) return [];
    return attendanceRegisters.filter(r => {
      const regBatchId = String(r.batchId?._id || r.batchId);
      return regBatchId === String(selectedBatchId);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedBatchId, attendanceRegisters]);

  // Student Attendance Summary within the selected batch
  const batchStudentRoster = useMemo(() => {
    if (!currentBatch) return [];
    const enrolledIds = (currentBatch.students || []).map((s: any) => String(s._id || s.id || s));
    
    return enrolledIds.map((sId: string) => {
      const studentObj = studentMap.get(sId);
      const studentName = studentObj ? `${studentObj.firstName || ''} ${studentObj.lastName || ''}`.trim() : 'Unknown Student';
      const rollNo = studentObj?.metadata?.rollNo || studentObj?.admissionNumber || '—';
      const email = studentObj?.email || '';
      const phone = studentObj?.phone || '';

      let totalSessions = 0;
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      const sessionHistory: any[] = [];

      currentBatchRegisters.forEach(reg => {
        const rec = (reg.records || []).find((r: any) => String(r.studentId?._id || r.studentId) === sId);
        if (rec) {
          totalSessions++;
          if (rec.status === 'present') presentCount++;
          else if (rec.status === 'late') lateCount++;
          else absentCount++;

          sessionHistory.push({
            date: reg.date,
            subject: reg.subjectId?.name || 'General',
            teacher: reg.teacherId ? `${reg.teacherId.firstName} ${reg.teacherId.lastName || ''}`.trim() : 'Faculty',
            status: rec.status,
            joinedAt: rec.joinedAt
          });
        }
      });

      const effectivePresent = presentCount + lateCount;
      const percentage = totalSessions > 0 ? Math.round((effectivePresent / totalSessions) * 100) : 0;

      return {
        studentId: sId,
        studentObj,
        studentName,
        rollNo,
        email,
        phone,
        totalSessions,
        presentCount,
        lateCount,
        absentCount,
        percentage,
        sessionHistory
      };
    });
  }, [currentBatch, currentBatchRegisters, studentMap]);

  // Filtered Student Roster within batch
  const filteredBatchStudentRoster = useMemo(() => {
    return batchStudentRoster.filter(s => {
      if (studentSearch.trim()) {
        const q = studentSearch.trim().toLowerCase();
        const matchName = s.studentName.toLowerCase().includes(q);
        const matchRoll = s.rollNo.toLowerCase().includes(q);
        const matchEmail = s.email.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchEmail) return false;
      }
      if (studentHealthFilter === 'low') {
        if (s.totalSessions > 0 && s.percentage >= 75) return false;
      } else if (studentHealthFilter === 'good') {
        if (s.totalSessions === 0 || s.percentage < 75) return false;
      }
      return true;
    });
  }, [batchStudentRoster, studentSearch, studentHealthFilter]);

  // Filtered Leave Requests
  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter(l => {
      if (leaveStatusFilter !== 'all') {
        if (l.status !== leaveStatusFilter) return false;
      }
      if (leaveSearch.trim()) {
        const q = leaveSearch.trim().toLowerCase();
        const teacherName = `${l.teacherId?.firstName || ''} ${l.teacherId?.lastName || ''}`.toLowerCase();
        const reason = (l.reason || '').toLowerCase();
        const type = (l.leaveType || '').toLowerCase();
        if (!teacherName.includes(q) && !reason.includes(q) && !type.includes(q)) return false;
      }
      return true;
    });
  }, [leaveRequests, leaveStatusFilter, leaveSearch]);

  // Handle Reviewing Leave
  const handleReviewLeaveSubmit = async () => {
    if (!reviewModal) return;
    setReviewing(true);
    try {
      await adminAPI.reviewLeaveRequest(reviewModal.leave._id, {
        status: reviewModal.action,
        reviewNote: reviewModal.note.trim()
      });
      toast.success(`Leave request ${reviewModal.action.toLowerCase()} successfully.`);
      setReviewModal(null);
      void loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update leave request.');
    } finally {
      setReviewing(false);
    }
  };

  // Open Manual Mark Attendance
  const openManualMark = () => {
    if (!currentBatch) return;
    const initialRecords: Record<string, 'present' | 'absent' | 'late'> = {};
    const enrolledIds = (currentBatch.students || []).map((s: any) => String(s._id || s.id || s));
    enrolledIds.forEach((id: string) => {
      initialRecords[id] = 'present';
    });
    setMarkRecords(initialRecords);
    setMarkDate(new Date().toISOString().split('T')[0]);
    setMarkSubject('General');
    setMarkModalOpen(true);
  };

  // Save Manual Attendance
  const handleSaveManualAttendance = async () => {
    if (!currentBatch) return;
    setSavingAttendance(true);
    try {
      const recordsArray = Object.entries(markRecords).map(([studentId, status]) => ({
        studentId,
        status,
        joinedAt: new Date()
      }));

      await adminAPI.markAttendance?.({
        batchId: currentBatch._id,
        date: markDate,
        subjectName: markSubject,
        records: recordsArray
      });

      toast.success('Attendance register saved successfully!');
      setMarkModalOpen(false);
      void loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save attendance register.');
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto">
      <PageHeader
        title="Attendance & Leave Management"
        subtitle="Review batch-wise student attendance registers, individual learner analytics, and teacher leave requests."
        breadcrumbs={['Home', 'Academics', 'Attendance']}
      />

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card 
          className="p-4 text-center cursor-pointer hover:border-[#1a7a35]/40 transition-colors"
          onClick={() => { setActiveTab('batches'); setSelectedBatchId(null); }}
        >
          <p className="text-2xl font-black text-[#1a7a35]">{batches.length}</p>
          <p className="text-xs font-bold text-surface-500 mt-1 flex items-center justify-center gap-1.5">
            <Layers size={13} /> Total Batches
          </p>
        </Card>
        <Card 
          className="p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => setActiveTab('logs')}
        >
          <p className="text-2xl font-black text-blue-600">{attendanceRegisters.length}</p>
          <p className="text-xs font-bold text-surface-500 mt-1 flex items-center justify-center gap-1.5">
            <CalendarCheck size={13} /> Registers Logged
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">
            {(() => {
              const totalRate = Array.from(batchStatsMap.values()).reduce((acc, curr) => acc + curr.averageRate, 0);
              const count = batchStatsMap.size || 1;
              return Math.round(totalRate / count);
            })()}%
          </p>
          <p className="text-xs font-bold text-surface-500 mt-1 flex items-center justify-center gap-1.5">
            <BarChart3 size={13} /> Avg Batch Attendance
          </p>
        </Card>
        <Card 
          className="p-4 text-center cursor-pointer hover:border-amber-400 transition-colors relative"
          onClick={() => setActiveTab('leaves')}
        >
          <p className="text-2xl font-black text-amber-600">{pendingLeavesCount}</p>
          <p className="text-xs font-bold text-surface-500 mt-1 flex items-center justify-center gap-1.5">
            <CalendarX size={13} /> Pending Leaves
          </p>
          {pendingLeavesCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </Card>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-200 dark:border-surface-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('batches'); setSelectedBatchId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'batches' && !selectedBatchId
                ? 'bg-[#1a7a35] text-white shadow-sm'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
            }`}
          >
            <Layers size={15} /> Batch Attendance Directory ({batches.length})
          </button>
          <button
            onClick={() => { setActiveTab('leaves'); setSelectedBatchId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
              activeTab === 'leaves'
                ? 'bg-[#1a7a35] text-white shadow-sm'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
            }`}
          >
            <CalendarX size={15} /> Teacher Leave Applications
            {pendingLeavesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                {pendingLeavesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('logs'); setSelectedBatchId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-[#1a7a35] text-white shadow-sm'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
            }`}
          >
            <CalendarCheck size={15} /> Master Register Logs ({attendanceRegisters.length})
          </button>
        </div>

        {selectedBatchId && activeTab === 'batches' && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <span>Viewing: {currentBatch?.name}</span>
            <button 
              onClick={() => setSelectedBatchId(null)}
              className="text-emerald-900 dark:text-emerald-200 hover:text-red-600 ml-1"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: BATCH DIRECTORY & DRILLDOWN */}
      {activeTab === 'batches' && (
        <div className="space-y-5 animate-fade-in">
          {/* If No Batch is Selected: Show Batch Cards Directory */}
          {!selectedBatchId ? (
            <div className="space-y-4">
              {/* Batch Search & Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-50 dark:bg-surface-900/60 p-3.5 rounded-2xl border border-surface-200 dark:border-surface-800">
                <div className="sm:col-span-2 relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="text"
                    placeholder="Search batch by name, section, or course..."
                    value={batchSearch}
                    onChange={e => setBatchSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                  />
                </div>
                <div>
                  <select
                    value={batchCourseFilter}
                    onChange={e => setBatchCourseFilter(e.target.value)}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                  >
                    <option value="">All Courses</option>
                    {uniqueCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Batch Cards Grid */}
              {filteredBatches.length === 0 ? (
                <Card className="p-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 text-surface-400 mx-auto flex items-center justify-center mb-3">
                    <Layers size={24} />
                  </div>
                  <h3 className="font-bold text-surface-800 dark:text-white text-base">No batches found</h3>
                  <p className="text-xs text-surface-500 mt-1">Try resetting the search terms above.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBatches.map(batch => {
                    const stats = batchStatsMap.get(String(batch._id)) || {
                      totalRegisters: 0,
                      totalEntries: 0,
                      presentEntries: 0,
                      averageRate: 0,
                      lastDate: null
                    };
                    const enrolledCount = (batch.students || []).length;
                    const courseName = batch.courseId?.name || 'Academic Course';

                    return (
                      <Card
                        key={batch._id}
                        className="p-5 hover:shadow-lg hover:border-[#1a7a35]/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group rounded-2xl border-surface-200 dark:border-surface-800"
                        onClick={() => setSelectedBatchId(String(batch._id))}
                      >
                        <div>
                          {/* Badges */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 truncate max-w-[170px]">
                              {courseName}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                              {batch.type || 'offline'}
                            </span>
                          </div>

                          {/* Batch Title */}
                          <h3 className="text-base font-bold text-surface-900 dark:text-white group-hover:text-[#1a7a35] transition-colors flex items-center justify-between">
                            <span>{batch.name}</span>
                            {batch.section && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                                Sec {batch.section}
                              </span>
                            )}
                          </h3>

                          {/* Attendance Rate Progress Bar */}
                          <div className="mt-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-800">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-bold text-surface-500">Attendance Rate</span>
                              <span className={`font-black ${stats.averageRate >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {stats.averageRate}%
                              </span>
                            </div>
                            <div className="w-full bg-surface-200 dark:bg-surface-700 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${stats.averageRate >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(100, stats.averageRate)}%` }}
                              />
                            </div>
                          </div>

                          {/* Key Statistics Grid */}
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 text-left">
                              <p className="text-[10px] uppercase font-bold text-surface-400">Students</p>
                              <p className="text-xs font-bold text-surface-800 dark:text-white mt-0.5 flex items-center gap-1">
                                <Users size={12} className="text-[#1a7a35]" /> {enrolledCount} Enrolled
                              </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 text-left">
                              <p className="text-[10px] uppercase font-bold text-surface-400">Sessions</p>
                              <p className="text-xs font-bold text-surface-800 dark:text-white mt-0.5 flex items-center gap-1">
                                <CalendarCheck size={12} className="text-blue-600" /> {stats.totalRegisters} Recorded
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Footer Action */}
                        <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between text-xs font-bold text-[#1a7a35] group-hover:translate-x-0.5 transition-transform">
                          <span>View Student Attendance</span>
                          <ArrowRight size={15} />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* When a Batch IS Selected: Full Student Roster & Registers Drilldown */
            <div className="space-y-5 animate-fade-in">
              {/* Batch Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 dark:from-surface-900 dark:to-surface-800 border border-emerald-200 dark:border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedBatchId(null)}
                    className="hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 shrink-0 mt-0.5"
                  >
                    <ArrowLeft size={16} className="mr-1.5" /> All Batches
                  </Button>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                        {currentBatch?.name} {currentBatch?.section ? `· Section ${currentBatch.section}` : ''}
                      </h2>
                      {currentBatch?.courseId?.name && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100">
                          {currentBatch.courseId.name}
                        </span>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600">
                        {currentBatch?.type || 'offline'}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 mt-1">
                      {batchStudentRoster.length} enrolled students • {currentBatchRegisters.length} recorded attendance sessions
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                  {/* Batch Switcher */}
                  <select
                    value={selectedBatchId || ''}
                    onChange={e => setSelectedBatchId(e.target.value)}
                    className="py-1.5 px-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs font-bold focus:ring-2 focus:ring-[#1a7a35] outline-none"
                  >
                    {batches.map(b => (
                      <option key={b._id} value={b._id}>{b.name}{b.section ? ` (${b.section})` : ''}</option>
                    ))}
                  </select>

                  <Button 
                    variant="primary" 
                    size="sm"
                    className="bg-[#1a7a35] text-white font-bold"
                    icon={Plus}
                    onClick={openManualMark}
                  >
                    Mark Attendance
                  </Button>
                </div>
              </div>

              {/* Sub-Tabs: Students Attendance vs Registers History */}
              <div className="flex items-center gap-2 border-b border-surface-200 dark:border-surface-800 pb-2">
                <button
                  onClick={() => setBatchTab('students')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    batchTab === 'students'
                      ? 'bg-[#1a7a35] text-white shadow-sm'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                  }`}
                >
                  <Users size={14} /> Student Attendance Roster ({batchStudentRoster.length})
                </button>
                <button
                  onClick={() => setBatchTab('registers')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    batchTab === 'registers'
                      ? 'bg-[#1a7a35] text-white shadow-sm'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                  }`}
                >
                  <CalendarCheck size={14} /> Session History Registers ({currentBatchRegisters.length})
                </button>
              </div>

              {/* SUB-VIEW A: STUDENT ATTENDANCE ROSTER */}
              {batchTab === 'students' && (
                <Card className="p-4 md:p-5 shadow-sm space-y-4">
                  {/* Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                      <input
                        type="text"
                        placeholder="Search student name, roll no, email..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-surface-500">Attendance:</span>
                      <select
                        value={studentHealthFilter}
                        onChange={e => setStudentHealthFilter(e.target.value as any)}
                        className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                      >
                        <option value="all">All Students</option>
                        <option value="low">Critical &lt; 75% Attendance</option>
                        <option value="good">Good &ge; 75% Attendance</option>
                      </select>
                    </div>
                  </div>

                  {/* Student Attendance Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/60 font-bold text-surface-600 dark:text-surface-300">
                          <th className="p-3">Student</th>
                          <th className="p-3">Roll No</th>
                          <th className="p-3 text-center">Sessions</th>
                          <th className="p-3 text-center text-emerald-600">Present</th>
                          <th className="p-3 text-center text-amber-600">Late</th>
                          <th className="p-3 text-center text-red-600">Absent</th>
                          <th className="p-3 text-center">Attendance %</th>
                          <th className="p-3 text-center">Health</th>
                          <th className="p-3 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {filteredBatchStudentRoster.map(s => {
                          const isLow = s.totalSessions > 0 && s.percentage < 75;
                          return (
                            <tr key={s.studentId} className="hover:bg-surface-50/80 dark:hover:bg-surface-800/40 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={s.studentName} size="sm" />
                                  <div>
                                    <p className="font-bold text-surface-900 dark:text-white">{s.studentName}</p>
                                    <p className="text-[11px] text-surface-400">{s.email || s.phone || 'No contact'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-semibold text-surface-700 dark:text-surface-300">{s.rollNo}</td>
                              <td className="p-3 text-center font-bold text-surface-800 dark:text-white">{s.totalSessions}</td>
                              <td className="p-3 text-center font-bold text-emerald-600">{s.presentCount}</td>
                              <td className="p-3 text-center font-bold text-amber-600">{s.lateCount}</td>
                              <td className="p-3 text-center font-bold text-red-600">{s.absentCount}</td>
                              <td className="p-3 text-center">
                                <span className={`inline-block font-black px-2.5 py-0.5 rounded-lg text-xs ${
                                  s.totalSessions === 0 
                                    ? 'bg-surface-100 text-surface-500'
                                    : s.percentage >= 75
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                  {s.totalSessions === 0 ? 'N/A' : `${s.percentage}%`}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {s.totalSessions === 0 ? (
                                  <span className="text-[10px] text-surface-400 font-semibold">No Data</span>
                                ) : isLow ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200">
                                    <AlertTriangle size={11} /> Short Attendance
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200">
                                    <CheckCircle2 size={11} /> Regular
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs font-bold text-[#1a7a35] hover:bg-emerald-50"
                                  onClick={() => setSelectedStudentHistory(s)}
                                >
                                  <Eye size={13} className="mr-1" /> View Logs
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredBatchStudentRoster.length === 0 && (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-surface-500 text-xs">
                              No students found matching your criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* SUB-VIEW B: SESSION REGISTERS HISTORY */}
              {batchTab === 'registers' && (
                <Card className="p-4 md:p-5 shadow-sm space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/60 font-bold text-surface-600 dark:text-surface-300">
                          <th className="p-3">Date</th>
                          <th className="p-3">Subject / Topic</th>
                          <th className="p-3">Recorded By</th>
                          <th className="p-3 text-center">Total Students</th>
                          <th className="p-3 text-center text-emerald-600">Present</th>
                          <th className="p-3 text-center text-red-600">Absent</th>
                          <th className="p-3 text-center">Turnout Rate</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {currentBatchRegisters.map(reg => {
                          const records = reg.records || [];
                          const present = records.filter((r: any) => ['present', 'late'].includes(r.status)).length;
                          const absent = records.filter((r: any) => r.status === 'absent').length;
                          const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
                          const teacherName = reg.teacherId ? `${reg.teacherId.firstName} ${reg.teacherId.lastName || ''}`.trim() : 'Faculty';

                          return (
                            <tr key={reg._id} className="hover:bg-surface-50/80 dark:hover:bg-surface-800/40 transition-colors">
                              <td className="p-3 font-bold text-surface-900 dark:text-white">
                                {new Date(reg.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="p-3 font-semibold text-surface-700 dark:text-surface-300">
                                {reg.subjectId?.name || 'General Class'}
                              </td>
                              <td className="p-3 text-surface-600 dark:text-surface-400">{teacherName}</td>
                              <td className="p-3 text-center font-bold text-surface-800 dark:text-white">{records.length}</td>
                              <td className="p-3 text-center font-bold text-emerald-600">{present}</td>
                              <td className="p-3 text-center font-bold text-red-600">{absent}</td>
                              <td className="p-3 text-center">
                                <span className={`font-black px-2 py-0.5 rounded-lg text-xs ${
                                  rate >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {rate}%
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs font-bold"
                                  onClick={() => setSelectedRegister(reg)}
                                >
                                  View Register
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        {currentBatchRegisters.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-surface-500 text-xs">
                              No attendance registers recorded for this batch yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEACHER LEAVE APPLICATIONS */}
      {activeTab === 'leaves' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-50 dark:bg-surface-900/60 p-3.5 rounded-2xl border border-surface-200 dark:border-surface-800">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search by teacher name or reason..."
                value={leaveSearch}
                onChange={e => setLeaveSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-surface-500">Status:</span>
              <select
                value={leaveStatusFilter}
                onChange={e => setLeaveStatusFilter(e.target.value as any)}
                className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
              >
                <option value="all">All Leave Requests</option>
                <option value="PENDING">Pending Approval ({pendingLeavesCount})</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Leave Requests List */}
          {filteredLeaves.length === 0 ? (
            <Card className="p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 text-surface-400 mx-auto flex items-center justify-center mb-3">
                <CalendarX size={24} />
              </div>
              <h3 className="font-bold text-surface-800 dark:text-white text-base">No leave applications found</h3>
              <p className="text-xs text-surface-500 mt-1">There are no leave requests matching the active filter.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLeaves.map(leave => {
                const teacherName = leave.teacherId 
                  ? `${leave.teacherId.firstName} ${leave.teacherId.lastName || ''}`.trim() 
                  : 'Teacher';
                const isPending = leave.status === 'PENDING';
                const isApproved = leave.status === 'APPROVED';
                const isRejected = leave.status === 'REJECTED';

                const startDate = new Date(leave.startDate);
                const endDate = new Date(leave.endDate);
                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                return (
                  <Card key={leave._id} className="p-5 flex flex-col justify-between border-surface-200 dark:border-surface-800 shadow-sm rounded-2xl">
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={teacherName} size="md" />
                          <div>
                            <h3 className="font-bold text-sm text-surface-900 dark:text-white">{teacherName}</h3>
                            <p className="text-[11px] text-surface-400">Applied on {formatDate(leave.createdAt)}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-xl border ${
                          isPending 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                            : isApproved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300'
                        }`}>
                          {leave.status}
                        </span>
                      </div>

                      {/* Leave Dates Info */}
                      <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-800 mb-3 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-surface-500">Leave Type:</span>
                          <span className="text-surface-800 dark:text-white capitalize">{leave.leaveType || 'Sick Leave'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-surface-500">Duration:</span>
                          <span className="text-surface-800 dark:text-white">
                            {startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ({diffDays} Day{diffDays > 1 ? 's' : ''})
                          </span>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="text-xs text-surface-600 dark:text-surface-300 mb-3">
                        <span className="font-bold text-surface-400 block mb-0.5">Reason:</span>
                        <p className="bg-white dark:bg-surface-900 p-2.5 rounded-xl border border-surface-100 dark:border-surface-800 italic">
                          "{leave.reason}"
                        </p>
                      </div>

                      {/* Review Note if any */}
                      {leave.reviewNote && (
                        <div className="text-xs text-surface-500 mb-3 p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                          <span className="font-bold">Admin Note:</span> {leave.reviewNote}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for Pending */}
                    {isPending ? (
                      <div className="flex items-center gap-2 pt-3 border-t border-surface-100 dark:border-surface-800">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          icon={Check}
                          onClick={() => setReviewModal({ leave, action: 'APPROVED', note: '' })}
                        >
                          Approve Leave
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="flex-1 font-bold bg-red-600 hover:bg-red-700 text-white"
                          icon={X}
                          onClick={() => setReviewModal({ leave, action: 'REJECTED', note: '' })}
                        >
                          Reject Leave
                        </Button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-surface-400 text-right pt-2 border-t border-surface-100 dark:border-surface-800">
                        Decision completed
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MASTER REGISTER LOGS */}
      {activeTab === 'logs' && (
        <Card className="p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-3">
            <div>
              <h3 className="font-bold text-surface-900 dark:text-white text-base">Master Attendance Log History</h3>
              <p className="text-xs text-surface-500">Audit trail of all attendance marks across every batch and classroom.</p>
            </div>
            <span className="text-xs font-bold text-surface-500">{attendanceRegisters.length} Total Logs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/60 font-bold text-surface-600 dark:text-surface-300">
                  <th className="p-3">Date</th>
                  <th className="p-3">Batch</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Teacher</th>
                  <th className="p-3 text-center">Enrolled</th>
                  <th className="p-3 text-center text-emerald-600">Present</th>
                  <th className="p-3 text-center text-red-600">Absent</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {attendanceRegisters.map(item => {
                  const records = item.records || [];
                  const present = records.filter((r: any) => ['present', 'late'].includes(r.status)).length;
                  const absent = records.filter((r: any) => r.status === 'absent').length;
                  const teacherName = item.teacherId ? `${item.teacherId.firstName} ${item.teacherId.lastName || ''}`.trim() : '—';

                  return (
                    <tr key={item._id} className="hover:bg-surface-50/80 dark:hover:bg-surface-800/40 transition-colors">
                      <td className="p-3 font-bold text-surface-900 dark:text-white">
                        {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3 font-semibold text-emerald-700 dark:text-emerald-300">
                        {item.batchId?.name || '—'} {item.batchId?.section ? `(${item.batchId.section})` : ''}
                      </td>
                      <td className="p-3 text-surface-700 dark:text-surface-300">{item.subjectId?.name || 'General'}</td>
                      <td className="p-3 text-surface-600 dark:text-surface-400">{teacherName}</td>
                      <td className="p-3 text-center font-bold text-surface-800 dark:text-white">{records.length}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">{present}</td>
                      <td className="p-3 text-center font-bold text-red-600">{absent}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-bold text-[#1a7a35]"
                          onClick={() => setSelectedRegister(item)}
                        >
                          View Register
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {attendanceRegisters.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-surface-500 text-xs">
                      No attendance registers recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: VIEW REGISTER DETAILS */}
      {selectedRegister && (
        <Modal isOpen={Boolean(selectedRegister)} onClose={() => setSelectedRegister(null)} size="lg">
          <ModalHeader 
            title="Attendance Register Breakdown" 
            subtitle={`${selectedRegister.batchId?.name || 'Batch'} · ${new Date(selectedRegister.date).toLocaleDateString('en-IN')}`} 
            onClose={() => setSelectedRegister(null)} 
          />
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
              <div>
                <p className="text-[10px] uppercase font-bold text-surface-400">Subject</p>
                <p className="text-xs font-bold text-surface-900 dark:text-white mt-0.5">{selectedRegister.subjectId?.name || 'General'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-surface-400">Total Enrolled</p>
                <p className="text-xs font-bold text-surface-900 dark:text-white mt-0.5">{(selectedRegister.records || []).length} Students</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-surface-400">Teacher</p>
                <p className="text-xs font-bold text-surface-900 dark:text-white mt-0.5">
                  {selectedRegister.teacherId ? `${selectedRegister.teacherId.firstName} ${selectedRegister.teacherId.lastName || ''}`.trim() : 'Faculty'}
                </p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-xl divide-y divide-surface-100 dark:divide-surface-800">
              {(selectedRegister.records || []).map((rec: any, idx: number) => {
                const sObj = studentMap.get(String(rec.studentId?._id || rec.studentId));
                const sName = sObj ? `${sObj.firstName || ''} ${sObj.lastName || ''}`.trim() : (rec.studentId?.firstName ? `${rec.studentId.firstName} ${rec.studentId.lastName || ''}`.trim() : 'Student');
                const rollNo = sObj?.metadata?.rollNo || sObj?.admissionNumber || '—';

                return (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-surface-50 dark:hover:bg-surface-800/50">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={sName} size="xs" />
                      <div>
                        <p className="font-bold text-surface-900 dark:text-white">{sName}</p>
                        <p className="text-[10px] text-surface-400">Roll No: {rollNo}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase ${
                        rec.status === 'present' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rec.status === 'late'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {rec.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setSelectedRegister(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* MODAL: VIEW INDIVIDUAL STUDENT ATTENDANCE HISTORY */}
      {selectedStudentHistory && (
        <Modal isOpen={Boolean(selectedStudentHistory)} onClose={() => setSelectedStudentHistory(null)} size="lg">
          <ModalHeader 
            title="Student Attendance History" 
            subtitle={`${selectedStudentHistory.studentName} · Roll No: ${selectedStudentHistory.rollNo}`} 
            onClose={() => setSelectedStudentHistory(null)} 
          />
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
              <div>
                <p className="text-[10px] uppercase font-bold text-surface-400">Total Sessions</p>
                <p className="text-xs font-bold text-surface-900 dark:text-white mt-0.5">{selectedStudentHistory.totalSessions}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-600">Present</p>
                <p className="text-xs font-bold text-emerald-600 mt-0.5">{selectedStudentHistory.presentCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-red-600">Absent</p>
                <p className="text-xs font-bold text-red-600 mt-0.5">{selectedStudentHistory.absentCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-surface-400">Overall Rate</p>
                <p className="text-xs font-black text-[#1a7a35] mt-0.5">{selectedStudentHistory.percentage}%</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-xl divide-y divide-surface-100 dark:divide-surface-800">
              {selectedStudentHistory.sessionHistory.map((sess: any, idx: number) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-surface-50 dark:hover:bg-surface-800/50">
                  <div>
                    <p className="font-bold text-surface-900 dark:text-white">
                      {new Date(sess.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-[11px] text-surface-400">{sess.subject} • Faculty: {sess.teacher}</p>
                  </div>
                  <div>
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase ${
                      sess.status === 'present'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : sess.status === 'late'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {sess.status}
                    </span>
                  </div>
                </div>
              ))}
              {selectedStudentHistory.sessionHistory.length === 0 && (
                <div className="p-6 text-center text-xs text-surface-500">
                  No individual session records logged yet for this student.
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setSelectedStudentHistory(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* MODAL: REVIEW TEACHER LEAVE REQUEST */}
      {reviewModal && (
        <Modal isOpen={Boolean(reviewModal)} onClose={() => setReviewModal(null)} size="md">
          <ModalHeader 
            title={`${reviewModal.action === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request`} 
            subtitle={`Reviewing application from ${reviewModal.leave.teacherId?.firstName} ${reviewModal.leave.teacherId?.lastName || ''}`} 
            onClose={() => setReviewModal(null)} 
          />
          <ModalBody className="space-y-4">
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 text-xs space-y-1">
              <p><span className="font-bold">Leave Type:</span> {reviewModal.leave.leaveType}</p>
              <p><span className="font-bold">Dates:</span> {new Date(reviewModal.leave.startDate).toLocaleDateString('en-IN')} to {new Date(reviewModal.leave.endDate).toLocaleDateString('en-IN')}</p>
              <p><span className="font-bold">Reason:</span> "{reviewModal.leave.reason}"</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Review Note / Reason (Optional)
              </label>
              <textarea
                className="w-full p-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs min-h-20 resize-none focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                placeholder={reviewModal.action === 'APPROVED' ? "e.g. Approved. Please ensure sub teacher covers Class 10." : "e.g. Cannot approve due to scheduled examination on this date."}
                value={reviewModal.note}
                onChange={e => setReviewModal({ ...reviewModal, note: e.target.value })}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setReviewModal(null)}>Cancel</Button>
            <Button
              variant={reviewModal.action === 'APPROVED' ? 'primary' : 'danger'}
              loading={reviewing}
              className={`font-bold ${reviewModal.action === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
              onClick={handleReviewLeaveSubmit}
            >
              Confirm {reviewModal.action === 'APPROVED' ? 'Approval' : 'Rejection'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* MODAL: MANUAL ATTENDANCE MARKING */}
      {markModalOpen && currentBatch && (
        <Modal isOpen={markModalOpen} onClose={() => setMarkModalOpen(false)} size="xl">
          <ModalHeader 
            title="Mark Attendance Register" 
            subtitle={`${currentBatch.name} ${currentBatch.section ? `· Section ${currentBatch.section}` : ''}`} 
            onClose={() => setMarkModalOpen(false)} 
          />
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={markDate}
                  onChange={e => setMarkDate(e.target.value)}
                  className="w-full p-2 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  value={markSubject}
                  onChange={e => setMarkSubject(e.target.value)}
                  placeholder="e.g. Physics - Laws of Motion"
                  className="w-full p-2 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-surface-100 dark:border-surface-800">
              <span className="text-xs font-bold text-surface-500">
                Marking {Object.keys(markRecords).length} enrolled students
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-emerald-700"
                  onClick={() => {
                    const next: any = {};
                    Object.keys(markRecords).forEach(k => { next[k] = 'present'; });
                    setMarkRecords(next);
                  }}
                >
                  All Present
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-red-700"
                  onClick={() => {
                    const next: any = {};
                    Object.keys(markRecords).forEach(k => { next[k] = 'absent'; });
                    setMarkRecords(next);
                  }}
                >
                  All Absent
                </Button>
              </div>
            </div>

            {/* Students List */}
            <div className="max-h-72 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-xl divide-y divide-surface-100 dark:divide-surface-800">
              {Object.keys(markRecords).map(sId => {
                const sObj = studentMap.get(sId);
                const sName = sObj ? `${sObj.firstName || ''} ${sObj.lastName || ''}`.trim() : 'Student';
                const status = markRecords[sId];

                return (
                  <div key={sId} className="p-3 flex items-center justify-between gap-3 hover:bg-surface-50 dark:hover:bg-surface-800/40">
                    <div className="flex items-center gap-2">
                      <Avatar name={sName} size="xs" />
                      <span className="font-bold text-xs text-surface-900 dark:text-white">{sName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMarkRecords({ ...markRecords, [sId]: 'present' })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          status === 'present'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarkRecords({ ...markRecords, [sId]: 'late' })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          status === 'late'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                        }`}
                      >
                        Late
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarkRecords({ ...markRecords, [sId]: 'absent' })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          status === 'absent'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setMarkModalOpen(false)}>Cancel</Button>
            <Button 
              variant="primary" 
              loading={savingAttendance}
              className="bg-[#1a7a35] text-white font-bold"
              onClick={handleSaveManualAttendance}
            >
              Save Register
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
