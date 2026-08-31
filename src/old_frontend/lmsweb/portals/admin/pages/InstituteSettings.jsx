import { useState, useEffect } from 'react';
import { Settings, Save, Building2, MapPin, Mail, Phone } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { FormField, Input, Textarea } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/index.js';

export default function InstituteSettings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });

  useEffect(() => {
    // Optionally fetch existing institute data if needed, but usually admin configures it
  }, []);

  const handleSave = async () => {
    if (!user?.instituteId) {
      toast.error('No institute ID found for this admin');
      return;
    }
    setLoading(true);
    try {
      await adminAPI.updateInstitute(user.instituteId, form);
      toast.success('Settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Institute Settings"
        subtitle="Manage your institute profile and configuration"
        breadcrumbs={['Home', 'Settings']}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold text-surface-800 dark:text-white mb-5 flex items-center gap-2">
            <Building2 size={18} className="text-primary" /> Profile Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Institute Name" className="md:col-span-2">
              <Input placeholder="Academy Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </FormField>
            <FormField label="Contact Email">
              <Input type="email" placeholder="admin@academy.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </FormField>
            <FormField label="Contact Phone">
              <Input type="tel" placeholder="+91..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </FormField>
            <FormField label="Address" className="md:col-span-2">
              <Textarea placeholder="Full address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={3} />
            </FormField>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="gradient" icon={Save} loading={loading} onClick={handleSave}>Save Changes</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
