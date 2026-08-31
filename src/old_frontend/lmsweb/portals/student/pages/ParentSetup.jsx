import { useState } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { FormField, Input } from '../../../components/forms/index.jsx';
import { UserPlus, Link2 } from 'lucide-react';
import { studentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function ParentSetup() {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [setupResult, setSetupResult] = useState(null);

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('First Name, Last Name and Email are required');
      return;
    }
    
    setLoading(true);
    try {
      const res = await studentAPI.setupParent(formData);
      setSetupResult(res.data);
      toast.success('Parent profile successfully created and linked! A temporary password has been set.');
      setFormData({ firstName: '', lastName: '', email: '', phone: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to setup parent profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <PageHeader 
        title="Parent Setup" 
        subtitle="Invite your parent/guardian to monitor your academic progress" 
      />
      
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Link Parent Account</h3>
            <p className="text-surface-500 mt-1">
              Provide your parent's email address or phone number. We will send them an invitation link to create their parent portal account which will be automatically linked to your profile.
            </p>
          </div>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Parent First Name *">
              <Input 
                placeholder="Enter parent's first name" 
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </FormField>
            
            <FormField label="Parent Last Name *">
              <Input 
                placeholder="Enter parent's last name" 
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Parent Email Address *">
              <Input 
                type="email" 
                placeholder="parent@example.com" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </FormField>
            
            <FormField label="Parent Phone Number">
              <Input 
                type="tel" 
                placeholder="+1234567890" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading} className="gap-2">
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating Parent Profile...' : 'Setup Parent Account'}
            </Button>
          </div>
        </form>

        {setupResult && (
          <div className="mt-8 p-4 bg-success/10 border border-success/20 rounded-xl">
            <h4 className="font-medium text-success-700">Parent Profile Created & Linked!</h4>
            <p className="text-sm text-success-600 mt-1">
              Your parent can now login to the Parent Portal using their Email ID (<b>{setupResult.data?.email || 'email'}</b>). 
              <br/><br/>
              <b>Important:</b> Their temporary password is exactly the same as your (the student's) current password. They can login and change it later.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
