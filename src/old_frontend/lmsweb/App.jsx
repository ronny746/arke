import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useThemeStore } from './store/index.js';

// Auth
import Login from './portals/auth/Login.jsx';

// Super Admin
import SuperAdminLayout from './portals/super-admin/layout/SuperAdminLayout.jsx';
import SuperAdminDashboard from './portals/super-admin/pages/Dashboard.jsx';
import Institutes from './portals/super-admin/pages/Institutes.jsx';
import UserManagement from './portals/super-admin/pages/UserManagement.jsx';
import PlatformSettings from './portals/super-admin/pages/PlatformSettings.jsx';
import Integrations from './portals/super-admin/pages/Integrations.jsx';
import Backups from './portals/super-admin/pages/Backups.jsx';
import AuditLogs from './portals/super-admin/pages/AuditLogs.jsx';

// Admin
import AdminLayout from './portals/admin/layout/AdminLayout.jsx';
import AdminDashboard from './portals/admin/pages/Dashboard.jsx';
import Students from './portals/admin/pages/Students.jsx';
import Teachers from './portals/admin/pages/Teachers.jsx';
import Parents from './portals/admin/pages/Parents.jsx';
import Staff from './portals/admin/pages/Staff.jsx';
import Academics from './portals/admin/pages/Academics.jsx';
import Notifications from './portals/admin/pages/Notifications.jsx';
import FeesAndPayments from './portals/admin/pages/FeesAndPayments.jsx';
import Inventory from './portals/admin/pages/Inventory.jsx';
import PTMBooking from './portals/admin/pages/PTMBooking.jsx';
import InstituteSettings from './portals/admin/pages/InstituteSettings.jsx';
import Timetable from './portals/admin/pages/Timetable.jsx';
import AdminExams from './portals/admin/pages/ExamsAndResults.jsx';
import ExamBuilder from './portals/admin/pages/ExamBuilder.jsx';
import QuestionBanks from './portals/admin/pages/QuestionBanks.jsx';
import QuestionBankBuilder from './portals/admin/pages/QuestionBankBuilder.jsx';
import LiveMonitor from './portals/admin/pages/LiveMonitor.jsx';
import ExamResults from './portals/admin/pages/ExamResults.jsx';
import AdminExamAnalysis from './portals/admin/pages/AdminExamAnalysis.jsx';
import AttendanceOverview from './portals/admin/pages/AttendanceOverview.jsx';
import LiveClasses from './portals/admin/pages/LiveClasses.jsx';
import Reports from './portals/admin/pages/Reports.jsx';
import AdminCommunication from './portals/admin/pages/Communication.jsx';
import AdminLeadManagement from './portals/admin/pages/LeadManagement.jsx';
import AdminAssignments from './portals/admin/pages/Assignments.jsx';
import AdminResources from './portals/admin/pages/Resources.jsx';
import Forms from './portals/admin/pages/Forms.jsx';
import FormBuilder from './portals/admin/pages/FormBuilder.jsx';
import FormLeads from './portals/admin/pages/FormLeads.jsx';

// Public Pages
import PublicForm from './pages/PublicForm.jsx';
import PublicExam from './pages/PublicExam.jsx';

// Teacher
import TeacherLayout from './portals/teacher/layout/TeacherLayout.jsx';
import TeacherDashboard from './portals/teacher/pages/Dashboard.jsx';
import MyClasses from './portals/teacher/pages/MyClasses.jsx';
import StudentRoster from './portals/teacher/pages/StudentRoster.jsx';
import Attendance from './portals/teacher/pages/Attendance.jsx';
import Assignments from './portals/teacher/pages/Assignments.jsx';
import Resources from './portals/teacher/pages/Resources.jsx';
import ExamManagement from './portals/teacher/pages/ExamManagement.jsx';
import TeacherCommunication from './portals/teacher/pages/Communication.jsx';
import TeacherDoubtSessions from './portals/teacher/pages/DoubtSessions.jsx';
import TeacherLiveClasses from './portals/teacher/pages/LiveClasses.jsx';
import TeacherPTM from './portals/teacher/pages/PTM.jsx';

// Student
import StudentLayout from './portals/student/layout/StudentLayout.jsx';
import StudentDashboard from './portals/student/pages/Dashboard.jsx';
import StudentExams from './portals/student/pages/StudentExams.jsx';
import ExamPlayer from './portals/student/pages/ExamPlayer.jsx';
import ExamAnalysis from './portals/student/pages/ExamAnalysis.jsx';
import StudentSchedule from './portals/student/pages/MySchedule.jsx';
import StudentAcademics from './portals/student/pages/Academics.jsx';
import StudentLiveClasses from './portals/student/pages/LiveClasses.jsx';
import StudentResults from './portals/student/pages/Results.jsx';
import ParentSetup from './portals/student/pages/ParentSetup.jsx';
import StudentMessages from './portals/student/pages/Messages.jsx';
import StudentResources from './portals/student/pages/Resources.jsx';

// Parent
import ParentLayout from './portals/parent/layout/ParentLayout.jsx';
import ParentDashboard from './portals/parent/pages/Dashboard.jsx';
import ParentAcademics from './portals/parent/pages/Academics.jsx';
import ParentPTMBooking from './portals/parent/pages/PTMBooking.jsx';
import ParentExams from './portals/parent/pages/ParentExams.jsx';
import ParentExamAnalysis from './portals/parent/pages/ParentExamAnalysis.jsx';
import ParentFees from './portals/parent/pages/Fees.jsx';
import ParentMessages from './portals/parent/pages/Messages.jsx';
import ParentAssignments from './portals/parent/pages/Assignments.jsx';
import ParentLiveClasses from './portals/parent/pages/LiveClasses.jsx';

// Staff
import StaffLayout from './portals/staff/layout/StaffLayout.jsx';
import StaffDashboard from './portals/staff/pages/Dashboard.jsx';
import MyLeads from './portals/staff/pages/MyLeads.jsx';
import LeadPool from './portals/staff/pages/LeadPool.jsx';

// Shared
import ProfileViewer from './components/features/ProfileViewer.jsx';

export default function App() {
  const { applyTheme } = useThemeStore();

  const getDashboardRoute = (role) => {
    switch (role) {
      case 'super_admin': return '/super-admin/dashboard';
      case 'admin_operations':
      case 'admin_acadops': return '/admin/dashboard';
      case 'teacher': return '/teacher/dashboard';
      case 'student': return '/student/dashboard';
      case 'parent': return '/parent/dashboard';
      case 'staff': return '/staff/dashboard';
      default: return '/login';
    }
  };

  useEffect(() => {
    applyTheme();
    const params = new URLSearchParams(window.location.search);
    const impersonateId = params.get('impersonateId');
    if (impersonateId) {
      sessionStorage.setItem('impersonateId', impersonateId);
    }
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--toast-bg, #fff)',
            color: 'var(--toast-color, #1E293B)',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            fontSize: '13px',
            fontWeight: '500',
          },
        }}
      />
      <Routes>
        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<Login />} />
        <Route path="/f/:publicId" element={<PublicForm />} />
        <Route path="/e/:id" element={<PublicExam />} />

        {/* Super Admin Portal */}
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="institutes" element={<Institutes />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="settings" element={<PlatformSettings />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="backups" element={<Backups />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>

        {/* Admin Portal */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="parents" element={<Parents />} />
          <Route path="staff" element={<Staff />} />
          <Route path="academics" element={<Academics />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="fees" element={<FeesAndPayments />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="ptm" element={<PTMBooking />} />
          <Route path="settings" element={<InstituteSettings />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="exams" element={<AdminExams />} />
          <Route path="exams/create" element={<ExamBuilder />} />
          <Route path="exams/:id/edit" element={<ExamBuilder />} />
          <Route path="exams/:id/monitor" element={<LiveMonitor />} />
          <Route path="exams/:id/results" element={<ExamResults />} />
          <Route path="exams/:id/results/:submissionId/analysis" element={<AdminExamAnalysis />} />
          <Route path="question-banks" element={<QuestionBanks />} />
          <Route path="question-banks/create" element={<QuestionBankBuilder />} />
          <Route path="question-banks/:id/edit" element={<QuestionBankBuilder />} />
          <Route path="attendance" element={<AttendanceOverview />} />
          <Route path="live-classes" element={<LiveClasses />} />
          <Route path="reports" element={<Reports />} />
          <Route path="assignments" element={<AdminAssignments />} />
          <Route path="resources" element={<AdminResources />} />
          <Route path="communication" element={<AdminCommunication />} />
          <Route path="lead-management" element={<AdminLeadManagement />} />
          <Route path="forms" element={<Forms />} />
          <Route path="forms/builder" element={<FormBuilder />} />
          <Route path="forms/:id/edit" element={<FormBuilder />} />
          <Route path="forms/:id/leads" element={<FormLeads />} />
          <Route path="profile" element={<ProfileViewer />} />
        </Route>

        {/* Teacher Portal */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="classes" element={<MyClasses />} />
          <Route path="students" element={<StudentRoster />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="resources" element={<Resources />} />
          <Route path="exams" element={<ExamManagement />} />
          <Route path="exams/:id/monitor" element={<LiveMonitor />} />
          <Route path="exams/:id/results" element={<ExamResults />} />
          <Route path="exams/:id/results/:submissionId/analysis" element={<AdminExamAnalysis />} />
          <Route path="communication" element={<TeacherCommunication />} />
          <Route path="doubts" element={<TeacherDoubtSessions />} />
          <Route path="live-classes" element={<TeacherLiveClasses />} />
          <Route path="ptm" element={<TeacherPTM />} />
          <Route path="profile" element={<ProfileViewer />} />
        </Route>

        {/* Student Routes */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="schedule" element={<StudentSchedule />} />
          <Route path="academics" element={<StudentAcademics />} />
          <Route path="exams" element={<StudentExams />} />
          <Route path="exams/:id/analysis" element={<ExamAnalysis />} />
          <Route path="live-classes" element={<StudentLiveClasses />} />
          <Route path="resources" element={<StudentResources />} />
          <Route path="results" element={<StudentResults />} />
          <Route path="parent-setup" element={<ParentSetup />} />
          <Route path="messages" element={<StudentMessages />} />
          <Route path="profile" element={<ProfileViewer />} />
        </Route>

        {/* Fullscreen Student Routes (Outside layout for no sidebar) */}
        <Route path="/student/exams/:id/play" element={<ExamPlayer />} />

        {/* Staff Portal */}
        <Route path="/staff" element={<StaffLayout />}>
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="my-leads" element={<MyLeads />} />
          <Route path="pool" element={<LeadPool />} />
        </Route>

        {/* Parent Routes */}
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ParentDashboard />} />
          <Route path="academics" element={<ParentAcademics />} />
          <Route path="assignments" element={<ParentAssignments />} />
          <Route path="live-classes" element={<ParentLiveClasses />} />
          <Route path="ptm" element={<ParentPTMBooking />} />
          <Route path="exams" element={<ParentExams />} />
          <Route path="exams/:id/analysis/:childId" element={<ParentExamAnalysis />} />
          <Route path="fees" element={<ParentFees />} />
          <Route path="messages" element={<ParentMessages />} />
          <Route path="profile" element={<ProfileViewer />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
