import { useState, useEffect } from 'react';
import { Plus, BookOpen, Users, Clock } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI, axiosInstance } from '../../../api/index.js';
import { cn } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';

const tabs = ['Classes & Sections', 'Subjects'];
const timetableColors = ['bg-primary-100 text-primary-700', 'bg-secondary-100 text-secondary-700', 'bg-accent-100 text-accent-700', 'bg-success-100 text-success-700', 'bg-warning-100 text-warning-700', 'bg-danger-100 text-danger-700'];

export default function Academics() {
  const [activeTab, setActiveTab] = useState('Classes & Sections');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjectsData, setSubjectsData] = useState([]);
  const [form, setForm] = useState({ name: '', section: '', type: 'offline', classId: '', subjectName: '', subjectCode: '', credits: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Admin APIs (we might need to use superAdminAPI if the user is a super admin, but let's assume adminAPI works for AcadOps)
      // the endpoint is the same /academic-classes and /subjects 
      const [classesRes, subjectsRes] = await Promise.all([
        adminAPI.getAcademicClasses(),
        adminAPI.getSubjects()
      ]);
      setClasses(classesRes.data?.data?.classes || classesRes.data?.data || classesRes.data?.classes || []);
      setSubjectsData(subjectsRes.data?.data?.subjects || subjectsRes.data?.data || subjectsRes.data?.subjects || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load academic data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Academic Management"
        subtitle="Configure classes, subjects, timetables and more"
        breadcrumbs={['Home', 'Academics']}
        actions={<Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>Add</Button>}
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all', activeTab === tab ? 'bg-white dark:bg-surface-700 text-primary shadow-sm' : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Classes & Sections */}
      {activeTab === 'Classes & Sections' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {classes.map(cls => (
            <Card key={cls._id || cls.id} className="p-5 hover:shadow-card-hover cursor-pointer" hover>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold">
                  {cls.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-surface-800 dark:text-white">{cls.name}</p>
                  <p className="text-xs text-surface-400">Section: {cls.section || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-surface-500 dark:text-surface-400">
                <div className="flex justify-between"><span className="flex items-center gap-1"><Users size={11} /> Students</span><span className="font-medium text-surface-700 dark:text-surface-200">{cls.students?.length || 0}</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-1"><BookOpen size={11} /> Type</span><span className="font-medium text-surface-700 dark:text-surface-200 capitalize">{cls.type || 'offline'}</span></div>
                <div className="flex justify-between"><span>Status</span><span className="font-medium text-surface-700 dark:text-surface-200 truncate ml-2 text-right">{cls.isActive ? 'Active' : 'Inactive'}</span></div>
              </div>
            </Card>
          ))}
          {classes.length === 0 && <p className="text-sm text-surface-500">No classes found.</p>}
        </div>
      )}



      {/* Subjects */}
      {activeTab === 'Subjects' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {subjectsData.map((sub, i) => (
            <Card key={sub._id || sub.id} className="p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold', timetableColors[i % timetableColors.length])}>{sub.name.slice(0, 2).toUpperCase()}</div>
              <div><p className="font-medium text-surface-800 dark:text-white text-sm">{sub.name}</p><p className="text-xs text-surface-400">Code: {sub.code || 'N/A'}</p></div>
            </Card>
          ))}
          {subjectsData.length === 0 && <p className="text-sm text-surface-500">No subjects found.</p>}
        </div>
      )}



      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="md">
        <ModalHeader title={`Add ${activeTab.slice(0, -1) || 'Item'}`} onClose={() => setShowAdd(false)} />
        <ModalBody className="space-y-4">
          
          {activeTab === 'Classes & Sections' && (
            <>
              <FormField label="Class Name" required><Input placeholder="e.g. Grade 10" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></FormField>
              <FormField label="Section"><Input placeholder="e.g. A" value={form.section} onChange={e => setForm(f => ({...f, section: e.target.value}))} /></FormField>
              <FormField label="Type">
                <Select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </Select>
              </FormField>
            </>
          )}

          {activeTab === 'Subjects' && (
            <>
              <FormField label="Subject Name" required><Input placeholder="e.g. Mathematics" value={form.subjectName} onChange={e => setForm(f => ({...f, subjectName: e.target.value}))} /></FormField>
              <FormField label="Subject Code"><Input placeholder="e.g. MATH101" value={form.subjectCode} onChange={e => setForm(f => ({...f, subjectCode: e.target.value}))} /></FormField>
              <FormField label="Class" required>
                <Select value={form.classId} onChange={e => setForm(f => ({...f, classId: e.target.value}))}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.section}</option>)}
                </Select>
              </FormField>
            </>
          )}


        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="gradient" loading={loading} onClick={async () => {
            setLoading(true); 
            try {
              if (activeTab === 'Classes & Sections') {
                if (!form.name) throw new Error("Name is required");
                await adminAPI.createAcademicClass({ name: form.name, section: form.section, type: form.type });
                toast.success('Class added!');
              } else if (activeTab === 'Subjects') {
                if (!form.subjectName || !form.classId) throw new Error("Subject Name and Class are required");
                await adminAPI.createSubject({ name: form.subjectName, code: form.subjectCode, classId: form.classId });
                toast.success('Subject added!');
              }
              setShowAdd(false); 
              setForm({ name: '', section: '', type: 'offline', classId: '', subjectName: '', subjectCode: '', credits: '' });
              await fetchData();
            } catch (err) {
              toast.error(err.message || err.response?.data?.message || 'Failed to add item');
            } finally {
              setLoading(false);
            }
          }}>Add Item</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
