"use client";

import { useEffect, useMemo, useState } from 'react';
import { BookMarked, Loader2, Pencil, Plus, Search, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/api/admin';

type Subject = {
  _id: string;
  name: string;
  icon?: string;
  code?: string;
  description?: string;
  teacherId?: { _id: string; firstName?: string; lastName?: string } | string | null;
  chaptersCount?: number;
  dppsCount?: number;
  testsCount?: number;
};

type Teacher = { _id: string; firstName?: string; lastName?: string };
type SubjectForm = {
  name: string; icon: string; code: string; description: string; teacherId: string;
  chaptersCount: string | number; dppsCount: string | number; testsCount: string | number;
};

const EMPTY_FORM = {
  name: '', icon: '📖', code: '', description: '', teacherId: '',
  chaptersCount: '', dppsCount: '', testsCount: ''
};

export default function SubjectLibraryPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState<SubjectForm>(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const [subjectRes, teacherRes] = await Promise.all([
        adminAPI.getSubjects({ libraryOnly: true }),
        adminAPI.getUsers({ role: 'teacher' })
      ]);
      setSubjects(subjectRes.data?.data || []);
      setTeachers(teacherRes.data?.data || []);
    } catch {
      toast.error('Could not load the Subject Library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subjects;
    return subjects.filter(subject => [subject.name, subject.code, subject.description]
      .filter(Boolean).some(value => String(value).toLowerCase().includes(query)));
  }, [subjects, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsEditorOpen(true);
  };

  const openEdit = (subject: Subject) => {
    const teacherId = typeof subject.teacherId === 'object' ? subject.teacherId?._id : subject.teacherId;
    setEditing(subject);
    setIsEditorOpen(true);
    setForm({
      name: subject.name || '', icon: subject.icon || '📖', code: subject.code || '',
      description: subject.description || '', teacherId: teacherId || '',
      chaptersCount: subject.chaptersCount ?? '', dppsCount: subject.dppsCount ?? '', testsCount: subject.testsCount ?? ''
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Subject name is required.');
    setSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      teacherId: form.teacherId || null,
      chaptersCount: Number(form.chaptersCount) || 0,
      dppsCount: Number(form.dppsCount) || 0,
      testsCount: Number(form.testsCount) || 0,
      isLibrarySubject: true
    };
    try {
      if (editing) {
        await adminAPI.updateSubject(editing._id, payload);
        toast.success('Subject library entry updated.');
      } else {
        await adminAPI.createSubject(payload);
        toast.success('Subject added to the library.');
      }
      setEditing(null);
      setForm(EMPTY_FORM);
      setIsEditorOpen(false);
      await load();
    } catch {
      toast.error('Could not save the subject.');
    } finally {
      setSaving(false);
    }
  };

  const assignedTeacher = (subject: Subject) => {
    if (!subject.teacherId || typeof subject.teacherId === 'string') return 'Unassigned';
    return [subject.teacherId.firstName, subject.teacherId.lastName].filter(Boolean).join(' ') || 'Unassigned';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <header className="rounded-3xl bg-[#0B132B] px-6 py-7 md:px-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#E5BE58]">
              <BookMarked size={14} /> Academic catalog
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight">Subject Library</h1>
            <p className="mt-1 text-sm text-white/70">Create reusable subjects once, assign a teacher, and add them to any course or upload flow.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C99A2E] px-4 py-3 text-xs font-black text-[#0B132B] shadow-sm hover:bg-[#E5BE58]">
            <Plus size={16} /> Add subject
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search subjects" className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm font-medium outline-none focus:border-[#0B132B]" />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#0B132B]" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSubjects.map(subject => (
            <article key={subject._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#C99A2E]/70 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl">{subject.icon || '📖'}</span><div className="min-w-0"><h2 className="truncate font-black text-gray-900">{subject.name}</h2><p className="text-xs text-gray-500">{subject.code || 'No subject code'}</p></div></div>
                <button onClick={() => openEdit(subject)} aria-label={`Edit ${subject.name}`} className="rounded-lg p-2 text-gray-400 hover:bg-amber-50 hover:text-[#9A6E1C]"><Pencil size={15} /></button>
              </div>
              <p className="mt-4 min-h-8 text-xs leading-relaxed text-gray-500">{subject.description || 'No description added.'}</p>
              <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs font-semibold text-gray-700"><UserRound size={14} className="text-[#C99A2E]" /> {assignedTeacher(subject)}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]"><div className="rounded-lg bg-slate-50 p-2"><b className="block text-sm text-slate-800">{subject.chaptersCount || 0}</b>Chapters</div><div className="rounded-lg bg-blue-50 p-2"><b className="block text-sm text-blue-800">{subject.dppsCount || 0}</b>DPPs</div><div className="rounded-lg bg-emerald-50 p-2"><b className="block text-sm text-emerald-800">{subject.testsCount || 0}</b>Tests</div></div>
            </article>
          ))}
          {filteredSubjects.length === 0 && <div className="col-span-full rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center"><BookMarked className="mx-auto text-gray-300" /><p className="mt-3 text-sm font-bold text-gray-700">No library subjects yet</p><button onClick={openCreate} className="mt-3 text-xs font-bold text-[#0B132B] underline">Add your first subject</button></div>}
        </div>
      )}

      {isEditorOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={save} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black text-gray-900">{editing ? 'Edit subject' : 'Add library subject'}</h2><p className="text-xs text-gray-500">This subject will be available across courses and uploads.</p></div><button type="button" onClick={() => { setEditing(null); setForm(EMPTY_FORM); setIsEditorOpen(false); }} className="text-xs font-bold text-gray-500">Cancel</button></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-4"><input value={form.icon} onChange={event => setForm({ ...form, icon: event.target.value })} className="rounded-xl border border-gray-200 px-3 py-2.5 text-center" aria-label="Subject icon" /><input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Subject name" className="sm:col-span-3 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold" /><input value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} placeholder="Subject code (optional)" className="sm:col-span-4 rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /><select value={form.teacherId} onChange={event => setForm({ ...form, teacherId: event.target.value })} className="sm:col-span-4 rounded-xl border border-gray-200 px-3 py-2.5 text-sm"><option value="">Assign teacher later</option>{teachers.map(teacher => <option key={teacher._id} value={teacher._id}>{teacher.firstName} {teacher.lastName}</option>)}</select><textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="What will this subject cover?" className="sm:col-span-4 min-h-20 rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /><input type="number" min="0" value={form.chaptersCount} onChange={event => setForm({ ...form, chaptersCount: event.target.value })} placeholder="Chapters" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /><input type="number" min="0" value={form.dppsCount} onChange={event => setForm({ ...form, dppsCount: event.target.value })} placeholder="DPP sets" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /><input type="number" min="0" value={form.testsCount} onChange={event => setForm({ ...form, testsCount: event.target.value })} placeholder="Mock tests" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /></div><button disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B132B] py-3 text-sm font-black text-white disabled:opacity-50">{saving && <Loader2 size={15} className="animate-spin" />}{editing ? 'Save changes' : 'Add to Subject Library'}</button></form></div>}
    </div>
  );
}
