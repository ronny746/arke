"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Video, 
  PlayCircle, 
  Grid, 
  Clock, 
  BookOpen, 
  User, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Radio
} from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StudentTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [gridSchedules, setGridSchedules] = useState<any[]>([]);
  const [activeClasses, setActiveClasses] = useState<any[]>([]);
  const [timeColumns, setTimeColumns] = useState<Array<{ startTime: string; endTime: string }>>([]);
  
  const [showCellModal, setShowCellModal] = useState(false);
  const [cellData, setCellData] = useState<{
    scheduleId: any;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectName: string;
    teacherName: string;
    batchName?: string;
  }>({
    scheduleId: null,
    dayOfWeek: 0,
    startTime: '',
    endTime: '',
    subjectName: '',
    teacherName: '',
    batchName: ''
  });

  const todayIndex = new Date().getDay();
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchRes, scheduleRes, liveRes] = await Promise.all([
        studentAPI.getMyBatches().catch(() => ({ data: { data: [] } })),
        studentAPI.getMySchedule().catch(() => ({ data: { data: [] } })),
        studentAPI.getLiveClasses().catch(() => ({ data: { data: [] } }))
      ]);
      const fetchedBatches = batchRes.data?.data || [];
      const fetchedSchedules = scheduleRes.data?.data || [];
      const fetchedLive = liveRes.data?.data || [];

      setBatches(fetchedBatches);
      setGridSchedules(fetchedSchedules);
      setActiveClasses(fetchedLive);
    } catch (error) {
      toast.error('Failed to load timetable details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Compute time columns based on selected batch
  useEffect(() => {
    const filteredScheds = selectedBatchId === 'ALL'
      ? gridSchedules
      : gridSchedules.filter((s: any) => {
          const bId = s.batchId?._id || s.batchId;
          return bId === selectedBatchId;
        });

    const colMap = new Set<string>();
    const cols: Array<{ startTime: string; endTime: string }> = [];

    filteredScheds.forEach((s: any) => {
      if (s.startTime && s.endTime) {
        const key = `${s.startTime}-${s.endTime}`;
        if (!colMap.has(key)) {
          colMap.add(key);
          cols.push({ startTime: s.startTime, endTime: s.endTime });
        }
      }
    });

    cols.sort((a, b) => a.startTime.localeCompare(b.startTime));
    setTimeColumns(cols);
  }, [selectedBatchId, gridSchedules]);

  // Today's classes calculated from schedule
  const todayClasses = useMemo(() => {
    const filtered = (gridSchedules || []).filter((s: any) => {
      const matchDay = Number(s.dayOfWeek) === todayIndex;
      if (!matchDay) return false;
      if (selectedBatchId !== 'ALL') {
        const bId = s.batchId?._id || s.batchId;
        return bId === selectedBatchId;
      }
      return true;
    });

    return filtered.sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [gridSchedules, todayIndex, selectedBatchId]);

  const handleJoinClass = (liveClass: any) => {
    const link = liveClass?.meetingLink || liveClass?.startUrl;
    if (!link) {
      toast.error('No meeting link available yet');
      return;
    }

    if (link.includes('zoom.us') || (!link.includes('/class/') && link.startsWith('http'))) {
      window.open(link, '_blank');
    } else if (link.includes('/class/')) {
      const roomCode = link.split('/class/')[1]?.split(/[?#]/)[0];
      router.push(`/class/${roomCode}`);
    } else {
      window.open(link, '_blank');
    }
  };

  const getActiveClassForSchedule = (scheduleId: string) => {
    if (!scheduleId) return null;
    return activeClasses.find((c: any) => {
      const cId = c.classScheduleId?._id || c.classScheduleId;
      return cId === scheduleId && c.status === 'ONGOING';
    });
  };

  const handleCellClick = (dayIndex: number, col: { startTime: string; endTime: string }) => {
    const cellSchedule = gridSchedules.find((s: any) => {
      const bId = s.batchId?._id || s.batchId;
      const matchBatch = selectedBatchId === 'ALL' || bId === selectedBatchId;
      return matchBatch && Number(s.dayOfWeek) === dayIndex && s.startTime === col.startTime && s.endTime === col.endTime;
    });

    if (cellSchedule) {
      setCellData({
        scheduleId: cellSchedule._id,
        dayOfWeek: dayIndex,
        startTime: col.startTime,
        endTime: col.endTime,
        subjectName: cellSchedule.subjectId?.name || 'Subject',
        teacherName: cellSchedule.teacherId ? `${cellSchedule.teacherId.firstName} ${cellSchedule.teacherId.lastName || ''}`.trim() : 'Assigned Faculty',
        batchName: cellSchedule.batchId?.name || ''
      });
      setShowCellModal(true);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Class Timetable"
          subtitle="View your daily schedule, weekly timetable grid, and join live lectures"
          breadcrumbs={['Home', 'Academics', 'Timetable']}
        />

        {/* Batch Filter Selector */}
        {batches.length > 0 && (
          <div className="flex items-center gap-2 self-start md:self-auto bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-1.5 rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-surface-500 px-2 flex items-center gap-1.5">
              <Users size={14} className="text-[#1a7a35]" /> Batch:
            </span>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="bg-surface-50 dark:bg-surface-800 border-none rounded-xl text-xs font-bold px-3 py-1.5 text-surface-900 dark:text-white focus:ring-2 focus:ring-[#1a7a35] outline-none cursor-pointer"
            >
              <option value="ALL">All Enrolled Batches</option>
              {batches.map((b: any) => (
                <option key={b._id} value={b._id}>
                  {b.name}{b.section ? ` (${b.section})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TODAY'S TIMETABLE HERO SECTION */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-[#1a7a35]">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                Today's Timetable
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#1a7a35]">
                  {DAYS[todayIndex]}
                </span>
              </h2>
              <p className="text-xs text-surface-500">{todayFormatted}</p>
            </div>
          </div>

          <div className="text-xs font-medium text-surface-500 hidden sm:block">
            {todayClasses.length} class{todayClasses.length === 1 ? '' : 'es'} scheduled for today
          </div>
        </div>

        {todayClasses.length === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-emerald-50/40 via-white to-surface-50 dark:from-surface-900 dark:to-surface-800 border-dashed border-2 border-emerald-200/70 dark:border-surface-700">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-[#1a7a35] flex items-center justify-center shadow-inner">
              <Sparkles size={24} />
            </div>
            <h3 className="text-sm md:text-base font-bold text-surface-900 dark:text-white">
              No Classes Scheduled for Today!
            </h3>
            <p className="text-xs text-surface-500 max-w-md mx-auto mt-1">
              You have no live classes today on {DAYS[todayIndex]}. Use this time to review notes in Study Materials, attempt practice DPPs, or prepare for tests.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayClasses.map((item: any) => {
              const activeClass = getActiveClassForSchedule(item._id);
              const isOngoing = Boolean(activeClass);
              const teacherName = item.teacherId
                ? `${item.teacherId.firstName} ${item.teacherId.lastName || ''}`.trim()
                : 'Faculty Assigned';
              const subjectTitle = item.subjectId?.name || 'Class Subject';
              const batchName = item.batchId?.name || 'Main Batch';

              return (
                <div
                  key={item._id}
                  className={`relative rounded-2xl p-5 transition-all duration-200 border flex flex-col justify-between shadow-sm ${
                    isOngoing
                      ? 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 dark:from-emerald-950/40 dark:to-surface-900 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/20 shadow-emerald-500/10'
                      : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700'
                  }`}
                >
                  {/* Top Badges */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200">
                        <Clock size={13} className="text-[#1a7a35]" />
                        {item.startTime} - {item.endTime}
                      </span>

                      {isOngoing ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 animate-pulse">
                          <Radio size={12} /> LIVE NOW
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-500">
                          Scheduled
                        </span>
                      )}
                    </div>

                    {/* Subject & Batch */}
                    <div className="mb-3">
                      <h3 className="text-base font-bold text-surface-900 dark:text-white line-clamp-1">
                        {subjectTitle}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-surface-500 flex items-center gap-1">
                          <Users size={12} /> {batchName}
                        </span>
                        {item.room && (
                          <span className="text-[11px] text-surface-400 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded">
                            {item.room}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Teacher Info */}
                    <div className="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-300 mb-4 bg-surface-50/70 dark:bg-surface-800/60 p-2 rounded-xl">
                      <div className="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 flex items-center justify-center text-[10px] font-bold">
                        {teacherName.charAt(0)}
                      </div>
                      <span className="font-semibold truncate">{teacherName}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    {isOngoing ? (
                      <Button
                        variant="primary"
                        className="w-full font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleJoinClass(activeClass)}
                      >
                        <PlayCircle size={16} className="mr-2" /> Join Live Class Now
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-semibold"
                        onClick={() => {
                          setCellData({
                            scheduleId: item._id,
                            dayOfWeek: todayIndex,
                            startTime: item.startTime,
                            endTime: item.endTime,
                            subjectName: subjectTitle,
                            teacherName,
                            batchName
                          });
                          setShowCellModal(true);
                        }}
                      >
                        <Calendar size={14} className="mr-1.5" /> View Class Details
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* WEEKLY TIMETABLE MATRIX */}
      <section className="space-y-3.5 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600">
              <Grid size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                Full Weekly Schedule
              </h2>
              <p className="text-xs text-surface-500">
                Weekly recurring class schedule. The active day ({DAYS[todayIndex]}) is highlighted.
              </p>
            </div>
          </div>
        </div>

        <Card className="p-4 md:p-6 overflow-x-auto shadow-sm">
          <div className="min-w-[780px]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-bold text-xs text-surface-600 dark:text-surface-300 text-left w-32 sticky left-0 z-10">
                    Day / Time
                  </th>
                  {timeColumns.map((col, i) => (
                    <th
                      key={i}
                      className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-bold text-xs text-surface-700 dark:text-surface-200 text-center min-w-[150px]"
                    >
                      {col.startTime} - {col.endTime}
                    </th>
                  ))}
                  {timeColumns.length === 0 && (
                    <th className="p-4 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-normal text-xs text-surface-400 italic">
                      No time slots scheduled for the current selection.
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((dayName, dayIdx) => {
                  const isToday = dayIdx === todayIndex;

                  return (
                    <tr
                      key={dayIdx}
                      className={isToday ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}
                    >
                      {/* Day Label Column */}
                      <td
                        className={`p-3 border border-surface-200 dark:border-surface-700 font-bold text-xs sticky left-0 z-10 ${
                          isToday
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border-r-2 border-r-emerald-500'
                            : 'bg-surface-50 dark:bg-surface-800 text-surface-800 dark:text-surface-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>{dayName}</span>
                          {isToday && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Time Slots */}
                      {timeColumns.map((col, colIdx) => {
                        const cellSchedule = gridSchedules.find((s: any) => {
                          const bId = s.batchId?._id || s.batchId;
                          const matchBatch = selectedBatchId === 'ALL' || bId === selectedBatchId;
                          return (
                            matchBatch &&
                            Number(s.dayOfWeek) === dayIdx &&
                            s.startTime === col.startTime &&
                            s.endTime === col.endTime
                          );
                        });

                        const active = cellSchedule
                          ? activeClasses.find((c: any) => {
                              const cId = c.classScheduleId?._id || c.classScheduleId;
                              return cId === cellSchedule._id && c.status === 'ONGOING';
                            })
                          : null;

                        return (
                          <td
                            key={colIdx}
                            onClick={() => handleCellClick(dayIdx, col)}
                            className={`p-2 border border-surface-200 dark:border-surface-700 text-center transition-colors relative ${
                              cellSchedule
                                ? 'cursor-pointer hover:bg-surface-100/80 dark:hover:bg-surface-800/60'
                                : ''
                            }`}
                          >
                            {cellSchedule ? (
                              <div
                                className={`p-2.5 rounded-xl text-xs h-full flex flex-col justify-between transition-transform duration-150 hover:scale-[1.02] ${
                                  active
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                    : isToday
                                    ? 'bg-emerald-100/90 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-100'
                                }`}
                              >
                                <div>
                                  <div className="font-bold truncate text-[13px]">
                                    {cellSchedule.subjectId?.name || 'Class'}
                                  </div>
                                  <div className="text-[11px] opacity-80 truncate mt-0.5">
                                    {cellSchedule.teacherId
                                      ? `${cellSchedule.teacherId.firstName} ${cellSchedule.teacherId.lastName || ''}`.trim()
                                      : 'Faculty'}
                                  </div>
                                  {selectedBatchId === 'ALL' && cellSchedule.batchId?.name && (
                                    <div className="text-[10px] opacity-70 truncate font-semibold mt-0.5">
                                      {cellSchedule.batchId.name}
                                    </div>
                                  )}
                                </div>

                                {active && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJoinClass(active);
                                    }}
                                    className="mt-2 w-full py-1 px-2 rounded-lg bg-white text-emerald-700 font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-sm hover:bg-emerald-50"
                                  >
                                    <PlayCircle size={13} /> Join Live
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="h-14 flex items-center justify-center text-[10px] text-surface-300 dark:text-surface-700">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {timeColumns.length === 0 && (
                        <td className="p-3 border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50"></td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Class Details Modal */}
      {showCellModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-3xl w-full max-w-sm p-6 text-center relative shadow-2xl border border-surface-200 dark:border-surface-700 animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setShowCellModal(false)}
              className="absolute top-4 right-4 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-700"
            >
              ✕
            </button>

            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#ecfdf5] dark:bg-emerald-950/60 text-[#1a7a35] flex items-center justify-center">
              <BookOpen size={24} />
            </div>

            <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-1">
              {cellData.subjectName}
            </h2>
            <p className="text-xs text-surface-500 mb-5">Faculty: {cellData.teacherName}</p>

            <div className="bg-surface-50 dark:bg-surface-900/80 p-4 rounded-2xl mb-5 grid grid-cols-2 gap-3 text-left border border-surface-200 dark:border-surface-800">
              <div>
                <div className="text-[10px] uppercase font-bold text-surface-400">Day</div>
                <div className="font-bold text-xs text-surface-900 dark:text-white mt-0.5">
                  {DAYS[cellData.dayOfWeek]}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-surface-400">Timing</div>
                <div className="font-bold text-xs text-surface-900 dark:text-white mt-0.5">
                  {cellData.startTime} - {cellData.endTime}
                </div>
              </div>
              {cellData.batchName && (
                <div className="col-span-2 pt-2 border-t border-surface-200 dark:border-surface-800">
                  <div className="text-[10px] uppercase font-bold text-surface-400">Batch</div>
                  <div className="font-bold text-xs text-surface-900 dark:text-white mt-0.5">
                    {cellData.batchName}
                  </div>
                </div>
              )}
            </div>

            {(() => {
              const active = activeClasses.find((c: any) => {
                const cId = c.classScheduleId?._id || c.classScheduleId;
                return cId === cellData.scheduleId && c.status === 'ONGOING';
              });

              if (active) {
                return (
                  <Button
                    variant="primary"
                    className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    icon={PlayCircle}
                    onClick={() => {
                      setShowCellModal(false);
                      handleJoinClass(active);
                    }}
                  >
                    Join Live Class Now
                  </Button>
                );
              } else {
                return (
                  <div className="text-surface-500 italic text-xs bg-surface-50 dark:bg-surface-900 p-3 rounded-xl border border-surface-200 dark:border-surface-800">
                    {cellData.dayOfWeek === todayIndex
                      ? "This lecture hasn't started yet. Join button will activate when teacher begins."
                      : `This class is scheduled for every ${DAYS[cellData.dayOfWeek]}.`}
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
