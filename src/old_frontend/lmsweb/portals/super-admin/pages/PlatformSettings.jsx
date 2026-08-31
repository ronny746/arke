import { useState, useEffect } from 'react';
import { Settings, Palette, Mail, MessageSquare, CreditCard, ToggleLeft, AlertTriangle, Save, Globe } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { FormField, Input, Select, Switch, Textarea } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { cn } from '../../../utils/helpers.js';
import { superAdminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'email', label: 'Email Settings', icon: Mail },
  { id: 'sms', label: 'SMS Settings', icon: MessageSquare },
  { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
  { id: 'features', label: 'Feature Flags', icon: ToggleLeft },
  { id: 'maintenance', label: 'Maintenance', icon: AlertTriangle },
];

export default function PlatformSettings() {
  const [activeTab, setActiveTab] = useState('branding');
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState(null);
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [activeTerm, setActiveTerm] = useState('Term 1');
  const [branding, setBranding] = useState({ name: 'LMS Platform', tagline: 'Empowering Education, Everywhere', primaryColor: '#6366F1', secondaryColor: '#8B5CF6', supportEmail: 'support@lms.com', supportPhone: '+91 1800-XXX-XXXX' });
  const [emailSettings, setEmailSettings] = useState({ host: 'smtp.gmail.com', port: '587', encryption: 'TLS', username: 'noreply@lms.com', password: '', fromName: 'LMS Platform' });
  const [smsSettings, setSmsSettings] = useState({ provider: 'Twilio', apiKey: '', apiSecret: '', senderId: 'LMSAPP' });
  const [paymentSettings, setPaymentSettings] = useState({ gateway: 'Razorpay', keyId: '', keySecret: '' });
  
  const [features, setFeatures] = useState({
    liveClasses: true, parentPortal: true, smsNotifications: false, aiFeatures: true,
    customBranding: false, apiAccess: true, reportGenerator: true, bulkImport: true,
  });
  const [maintenance, setMaintenance] = useState({ enabled: false, message: "We are currently performing scheduled maintenance. We'll be back soon!", duration: '2 hours' });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await superAdminAPI.getSystemConfig();
        const conf = res.data?.data;
        if (conf) {
          setConfigId(conf._id || conf.id);
          setAcademicYear(conf.academicYear || '2024-2025');
          setActiveTerm(conf.activeTerm || 'Term 1');
          if (conf.preferences) {
            if (conf.preferences.branding) setBranding(conf.preferences.branding);
            if (conf.preferences.emailSettings) setEmailSettings(conf.preferences.emailSettings);
            if (conf.preferences.smsSettings) setSmsSettings(conf.preferences.smsSettings);
            if (conf.preferences.paymentSettings) setPaymentSettings(conf.preferences.paymentSettings);
            if (conf.preferences.features) setFeatures(conf.preferences.features);
            if (conf.preferences.maintenance) setMaintenance(conf.preferences.maintenance);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load system config');
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        academicYear,
        activeTerm,
        preferences: {
          branding,
          emailSettings,
          smsSettings,
          paymentSettings,
          features,
          maintenance,
        }
      };
      await superAdminAPI.updateSystemConfig(payload);
      toast.success('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Platform Settings" subtitle="Configure global platform settings" breadcrumbs={['Home', 'Settings']} />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <Card className="p-3 h-fit lg:w-56 flex lg:flex-col gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left', activeTab === tab.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700')}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </Card>

        {/* Content */}
        <Card className="flex-1 p-6">
          {activeTab === 'branding' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-surface-800 dark:text-white">Global Branding</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Academic Year"><Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} /></FormField>
                <FormField label="Active Term"><Input value={activeTerm} onChange={e => setActiveTerm(e.target.value)} /></FormField>
              </div>
              <FormField label="Platform Name"><Input value={branding.name} onChange={e => setBranding(b => ({ ...b, name: e.target.value }))} /></FormField>
              <FormField label="Platform Tagline"><Input value={branding.tagline} onChange={e => setBranding(b => ({ ...b, tagline: e.target.value }))} /></FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Primary Color">
                  <div className="flex gap-3">
                    <input type="color" value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))} className="h-10 w-16 rounded-lg border border-surface-200 cursor-pointer" />
                    <Input value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))} />
                  </div>
                </FormField>
                <FormField label="Secondary Color">
                  <div className="flex gap-3">
                    <input type="color" value={branding.secondaryColor} onChange={e => setBranding(b => ({ ...b, secondaryColor: e.target.value }))} className="h-10 w-16 rounded-lg border border-surface-200 cursor-pointer" />
                    <Input value={branding.secondaryColor} onChange={e => setBranding(b => ({ ...b, secondaryColor: e.target.value }))} />
                  </div>
                </FormField>
              </div>
              <FormField label="Support Email"><Input type="email" value={branding.supportEmail} onChange={e => setBranding(b => ({ ...b, supportEmail: e.target.value }))} /></FormField>
              <FormField label="Support Phone"><Input value={branding.supportPhone} onChange={e => setBranding(b => ({ ...b, supportPhone: e.target.value }))} /></FormField>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-surface-800 dark:text-white">Email Configuration</h3>
              <FormField label="SMTP Host"><Input value={emailSettings.host} onChange={e => setEmailSettings(s => ({ ...s, host: e.target.value }))} /></FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="SMTP Port"><Input value={emailSettings.port} onChange={e => setEmailSettings(s => ({ ...s, port: e.target.value }))} /></FormField>
                <FormField label="Encryption"><Select value={emailSettings.encryption} onChange={e => setEmailSettings(s => ({ ...s, encryption: e.target.value }))}><option>TLS</option><option>SSL</option><option>None</option></Select></FormField>
              </div>
              <FormField label="SMTP Username"><Input value={emailSettings.username} onChange={e => setEmailSettings(s => ({ ...s, username: e.target.value }))} /></FormField>
              <FormField label="SMTP Password"><Input type="password" value={emailSettings.password} onChange={e => setEmailSettings(s => ({ ...s, password: e.target.value }))} /></FormField>
              <FormField label="From Name"><Input value={emailSettings.fromName} onChange={e => setEmailSettings(s => ({ ...s, fromName: e.target.value }))} /></FormField>
              <Button variant="outline" size="sm" onClick={() => toast.success('Test email sent!')}>Send Test Email</Button>
            </div>
          )}

          {activeTab === 'sms' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-surface-800 dark:text-white">SMS Configuration</h3>
              <FormField label="SMS Provider"><Select value={smsSettings.provider} onChange={e => setSmsSettings(s => ({ ...s, provider: e.target.value }))}><option>Twilio</option><option>MSG91</option><option>Nexmo</option><option>AWS SNS</option></Select></FormField>
              <FormField label="API Key"><Input value={smsSettings.apiKey} onChange={e => setSmsSettings(s => ({ ...s, apiKey: e.target.value }))} /></FormField>
              <FormField label="API Secret"><Input type="password" value={smsSettings.apiSecret} onChange={e => setSmsSettings(s => ({ ...s, apiSecret: e.target.value }))} /></FormField>
              <FormField label="Sender ID"><Input value={smsSettings.senderId} onChange={e => setSmsSettings(s => ({ ...s, senderId: e.target.value }))} /></FormField>
              <Button variant="outline" size="sm" onClick={() => toast.success('Test SMS sent!')}>Send Test SMS</Button>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-surface-800 dark:text-white">Payment Gateway</h3>
              <FormField label="Gateway"><Select value={paymentSettings.gateway} onChange={e => setPaymentSettings(s => ({ ...s, gateway: e.target.value }))}><option>Razorpay</option><option>Stripe</option><option>PayU</option><option>CCAvenue</option></Select></FormField>
              <FormField label="Key ID"><Input value={paymentSettings.keyId} onChange={e => setPaymentSettings(s => ({ ...s, keyId: e.target.value }))} /></FormField>
              <FormField label="Key Secret"><Input type="password" value={paymentSettings.keySecret} onChange={e => setPaymentSettings(s => ({ ...s, keySecret: e.target.value }))} /></FormField>
              <FormField label="Webhook URL"><Input defaultValue="https://api.lms.com/webhooks/payment" readOnly /></FormField>
              <div className="flex items-center gap-3 p-4 bg-success-50 dark:bg-success-900/10 rounded-xl">
                <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-sm text-success-700 dark:text-success-400 font-medium">Payment gateway connected</span>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-surface-800 dark:text-white">Feature Flags</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400">Enable or disable platform-wide features.</p>
              <div className="space-y-4">
                {Object.entries(features).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-surface-100 dark:border-surface-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-surface-700 dark:text-surface-200 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-xs text-surface-400">Toggle feature availability platform-wide</p>
                    </div>
                    <Switch checked={val} onChange={() => setFeatures(f => ({ ...f, [key]: !f[key] }))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-surface-800 dark:text-white">Maintenance Mode</h3>
              <div className={cn('p-5 rounded-2xl border-2', maintenance.enabled ? 'border-warning bg-warning-50 dark:bg-warning-900/10' : 'border-surface-200 dark:border-surface-700')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-surface-800 dark:text-white">Maintenance Mode</p>
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">When enabled, users will see a maintenance page. Super admins can still access the platform.</p>
                  </div>
                  <Switch checked={maintenance.enabled} onChange={() => { setMaintenance(m => ({ ...m, enabled: !m.enabled })); toast(!maintenance.enabled ? '⚠ Maintenance mode enabled!' : 'Maintenance mode disabled'); }} />
                </div>
              </div>
              <FormField label="Maintenance Message">
                <Textarea value={maintenance.message} onChange={e => setMaintenance(m => ({ ...m, message: e.target.value }))} rows={3} />
              </FormField>
              <FormField label="Expected Duration"><Input value={maintenance.duration} onChange={e => setMaintenance(m => ({ ...m, duration: e.target.value }))} /></FormField>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-700 flex justify-end gap-3">
            <Button variant="outline">Reset</Button>
            <Button variant="gradient" icon={Save} loading={loading} onClick={handleSave}>Save Changes</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
