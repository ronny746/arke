"use client";

import { useState, useEffect } from 'react';
import { Calendar, Video, PlayCircle, Grid } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentLiveClassesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gridSchedules, setGridSchedules] = useState([]);
  const [activeClasses, setActiveClasses] = useState([]);
  const [timeColumns, setTimeColumns] = useState([]); // [{startTime, endTime}]
  
  const [showCellModal, setShowCellModal] = useState(false);
  const [cellData, setCellData] = useState({
    scheduleId: null,
    dayOfWeek: 0,
    startTime: '',
    endTime: '',
    subjectName: '',
    teacherName: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scheduleRes, liveRes] = await Promise.all([
        studentAPI.getMySchedule(), // Get all recurring schedules for the student's class
        studentAPI.getLiveClasses()
      ]);
      const scheds = scheduleRes.data?.data || [];
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
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJoinClass = (liveClass) => {
    if (liveClass.meetingLink && liveClass.meetingLink.includes('/class/')) {
      const roomCode = liveClass.meetingLink.split('/class/')[1];
      router.push(`/class/${roomCode}`);
    } else if (liveClass.meetingLink) {
      window.open(liveClass.meetingLink, '_blank');
    } else {
      toast.error("No meeting link available");
    }
  };

  const handleCellClick = (dayIndex, col) => {
    const cellSchedule = gridSchedules.find(s => s.dayOfWeek === dayIndex && s.startTime === col.startTime && s.endTime === col.endTime);
    if (cellSchedule) {
      setCellData({
        scheduleId: cellSchedule._id,
        dayOfWeek: dayIndex,
        startTime: col.startTime,
        endTime: col.endTime,
        subjectName: cellSchedule.subjectId?.name || 'No Subject',
        teacherName: `${cellSchedule.teacherId?.firstName} ${cellSchedule.teacherId?.lastName}`
      });
      setShowCellModal(true);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Live Classes & Timetable"
        subtitle="View your weekly schedule and join active classes"
        breadcrumbs={['Home', 'Academics', 'Live Classes']}
      />

      <Card className="p-5 overflow-x-auto">
        <div className="flex items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Grid className="text-primary-500" /> Weekly Timetable
          </h2>
        </div>

        <div className="min-w-[800px]">
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
                    No classes scheduled yet.
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
                    const active = cellSchedule && activeClasses.find(c => c.classScheduleId?._id === cellSchedule._id && c.status === 'ONGOING');
                    return (
                      <td 
                        key={colIndex} 
                        onClick={() => handleCellClick(dayIndex, col)}
                        className={`p-2 border border-surface-200 dark:border-surface-700 text-center transition-colors relative ${cellSchedule ? 'cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20' : ''}`}
                      >
                        {cellSchedule ? (
                          <div className={`p-2 rounded text-sm h-full flex flex-col justify-center ${active ? 'bg-success-100 text-success-800 border border-success-300' : 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-100'}`}>
                            <div className="font-semibold truncate">{cellSchedule.subjectId?.name || 'No Subject'}</div>
                            <div className="text-xs opacity-80 truncate mb-1">{cellSchedule.teacherId?.firstName} {cellSchedule.teacherId?.lastName}</div>
                            {active && (
                              <Button 
                                size="sm" 
                                variant="success" 
                                className="w-full mt-2" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJoinClass(active);
                                }}
                              >
                                <PlayCircle size={14} className="mr-1"/> Join
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="h-12 flex items-center justify-center"></div>
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
      </Card>

      {/* Class Details Modal */}
      {showCellModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-sm p-6 text-center relative">
             <button onClick={() => setShowCellModal(false)} className="absolute top-4 right-4 text-surface-400 hover:text-surface-600">×</button>
             <h2 className="text-xl font-bold mb-2">{cellData.subjectName}</h2>
             <p className="text-surface-500 mb-6">by {cellData.teacherName}</p>
             
             <div className="bg-surface-50 dark:bg-surface-900 p-4 rounded-lg mb-6 flex justify-around">
               <div>
                 <div className="text-xs text-surface-400">Day</div>
                 <div className="font-semibold">{DAYS[cellData.dayOfWeek]}</div>
               </div>
               <div>
                 <div className="text-xs text-surface-400">Time</div>
                 <div className="font-semibold">{cellData.startTime} - {cellData.endTime}</div>
               </div>
             </div>

             {(() => {
               const active = activeClasses.find(c => c.classScheduleId?._id === cellData.scheduleId && c.status === 'ONGOING');
               if (cellData.dayOfWeek === new Date().getDay() && active) {
                 return (
                   <Button variant="success" className="w-full" icon={PlayCircle} onClick={() => {
                     setShowCellModal(false);
                     handleJoinClass(active);
                   }}>
                     Join Live Class Now
                   </Button>
                 );
               } else {
                  return (
                    <div className="text-surface-500 italic text-sm">
                      {cellData.dayOfWeek === new Date().getDay() 
                        ? "Teacher hasn't started this class yet." 
                        : "This class is not scheduled for today."}
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
