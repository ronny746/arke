import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserRound, Link } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { Card, Avatar } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter, DeleteModal } from '../../../components/modals/index.jsx';
import { FormField, Input, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import toast from 'react-hot-toast';
import { adminAPI } from '../../../api/index.js';

export default function Parents() {
  const [parents, setParents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showMap, setShowMap] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '', occupation: '' });
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  const columns = [
    {
      header: 'Parent', accessorKey: 'name',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} size="sm" />
          <div>
            <p className="font-medium text-sm text-surface-800 dark:text-white">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-surface-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Occupation', accessorKey: 'occupation', cell: (r) => <span>{r.metadata?.occupation || '—'}</span> },
    { header: 'Children', accessorKey: 'totalChildren', cell: (r) => <span className="font-medium">{r.childrenIds?.length || 0} child{(r.childrenIds?.length || 0) !== 1 ? 'ren' : ''}</span> },
    { header: 'Mapped Students', key: 'children', cell: (r) => (
      <div className="flex flex-wrap gap-1">
        {(r.childrenIds || []).map((child, i) => <span key={i} className="badge badge-accent text-xs">Mapped</span>)}
      </div>
    )},
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => (
        <RowActions actions={[
          { label: 'Map Student', icon: Link, onClick: () => setShowMap(row) },
          { label: 'Edit', icon: Edit, onClick: () => setShowEdit(row) },
          { label: 'Delete', icon: Trash2, danger: true, onClick: () => setShowDelete(row) },
        ]} />
      ),
    },
  ];

  const fetchData = async () => {
    try {
      setFetching(true);
      const [parentsRes, studentsRes] = await Promise.all([
        adminAPI.getUsers({ role: 'parent' }),
        adminAPI.getUsers({ role: 'student' })
      ]);
      setParents(Array.isArray(parentsRes.data?.data) ? parentsRes.data.data : parentsRes.data?.data?.users || []);
      setStudentsList(Array.isArray(studentsRes.data?.data) ? studentsRes.data.data : studentsRes.data?.data?.users || []);
    } catch (error) {
      toast.error('Failed to load parents data');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Parent Management"
        subtitle="Manage parent/guardian accounts"
        breadcrumbs={['Home', 'Parents']}
        actions={<Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>Add Parent</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total Parents', value: parents.length, color: 'text-primary' },
          { label: 'Active', value: parents.filter(p => p.isActive !== false).length, color: 'text-success-600' },
          { label: 'Avg Children', value: parents.length ? Math.round(parents.reduce((a, p) => a + (p.childrenIds?.length || 0), 0) / parents.length) : 0, color: 'text-accent-600' },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-surface-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <DataTable data={parents} columns={columns} searchable searchPlaceholder="Search parents..." emptyTitle="No parents found" emptyIcon={UserRound} />
      </Card>
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="md">
        <ModalHeader title="Add Parent" onClose={() => setShowAdd(false)} />
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name" required><Input placeholder="Parent's first name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></FormField>
            <FormField label="Last Name" required><Input placeholder="Parent's last name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone" required><Input placeholder="+91 9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></FormField>
            <FormField label="Email"><Input type="email" placeholder="parent@mail.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Password" required><Input type="password" placeholder="Temp password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></FormField>
            <FormField label="Occupation"><Input placeholder="Occupation" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} /></FormField>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="gradient" loading={loading} onClick={async () => { 
            if (!form.firstName || !form.lastName || !form.phone || !form.password) {
              toast.error('First Name, Last Name, Phone, and Password are required');
              return;
            }
            setLoading(true); 
            try {
              const { occupation, ...restForm } = form;
              await adminAPI.createUser({
                ...restForm,
                role: 'parent',
                metadata: { occupation }
              });
              toast.success('Parent added successfully!');
              setShowAdd(false);
              setForm({ firstName: '', lastName: '', phone: '', email: '', password: '', occupation: '' });
              fetchData();
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to add parent');
            } finally {
              setLoading(false);
            }
          }}>Add Parent</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      {showEdit && (
        <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} size="md">
          <ModalHeader title="Edit Parent" subtitle={`Updating details for ${showEdit.firstName}`} onClose={() => setShowEdit(null)} />
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" required><Input value={showEdit.firstName || ''} onChange={e => setShowEdit(f => ({ ...f, firstName: e.target.value }))} /></FormField>
              <FormField label="Last Name" required><Input value={showEdit.lastName || ''} onChange={e => setShowEdit(f => ({ ...f, lastName: e.target.value }))} /></FormField>
            </div>
            <FormField label="Phone" required><Input value={showEdit.phone || ''} onChange={e => setShowEdit(f => ({ ...f, phone: e.target.value }))} /></FormField>
            <FormField label="Email"><Input type="email" value={showEdit.email || ''} onChange={e => setShowEdit(f => ({ ...f, email: e.target.value }))} /></FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              setLoading(true); 
              try {
                // await adminAPI.updateUser(showEdit._id, showEdit);
                toast.success('Parent updated! (Placeholder)');
                setShowEdit(null);
                fetchData();
              } catch (e) {
                toast.error('Failed to update parent');
              } finally {
                setLoading(false);
              }
            }}>Save Changes</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Map Student Modal */}
      {showMap && (
        <Modal isOpen={!!showMap} onClose={() => { setShowMap(null); setSelectedStudent(''); }} size="md">
          <ModalHeader title="Map Student" subtitle={`Link a student to ${showMap.firstName}`} onClose={() => { setShowMap(null); setSelectedStudent(''); }} />
          <ModalBody className="space-y-4">
            <FormField label="Select Student">
              <Select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
                <option value="">Select Student to Map</option>
                {studentsList.map(s => <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>)}
              </Select>
            </FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setShowMap(null); setSelectedStudent(''); }}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              if (!selectedStudent) {
                toast.error('Please select a student');
                return;
              }
              setLoading(true); 
              try {
                await adminAPI.linkParentStudent({ 
                  parentId: showMap._id, 
                  studentId: selectedStudent 
                });
                toast.success('Student mapped successfully!');
                setShowMap(null);
                setSelectedStudent('');
                fetchData();
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to map student');
              } finally {
                setLoading(false);
              }
            }}>Map Student</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Delete Modal */}
      <DeleteModal isOpen={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={async () => { 
        // await adminAPI.deleteUser(showDelete._id);
        setParents(p => p.filter(x => x._id !== showDelete._id)); 
        setShowDelete(null); 
        toast.success('Parent removed'); 
      }} itemName={`${showDelete?.firstName} ${showDelete?.lastName}`} />
    </div>
  );
}
