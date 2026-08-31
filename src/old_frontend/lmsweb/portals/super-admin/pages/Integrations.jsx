import { useState, useEffect } from 'react';
import { Settings, Cloud, Video, CreditCard, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { FormField, Input, Switch } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { cn } from '../../../utils/helpers.js';
import { superAdminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

const providers = [
  { id: 'aws', label: 'AWS (Storage)', icon: Cloud, description: 'Amazon Web Services for S3 file storage' },
  { id: 'zoom', label: 'Zoom (Live Classes)', icon: Video, description: 'Zoom API integration for automatic meeting links' },
  { id: 'razorpay', label: 'Razorpay (Payments)', icon: CreditCard, description: 'Payment gateway for online fee collection' },
];

export default function Integrations() {
  const [activeTab, setActiveTab] = useState('aws');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [configs, setConfigs] = useState({
    aws: { isActive: false, config: { bucketName: '', region: '', accessKey: '', secretKey: '' } },
    zoom: { isActive: false, config: { accountId: '', clientId: '', clientSecret: '' } },
    razorpay: { isActive: false, config: { keyId: '', keySecret: '' } },
  });

  const fetchIntegrations = async () => {
    try {
      const res = await superAdminAPI.getIntegrations();
      if (res.data?.data) {
        const newConfigs = { ...configs };
        res.data.data.forEach(item => {
          if (newConfigs[item.provider]) {
            newConfigs[item.provider] = {
              isActive: item.isActive,
              config: item.config || newConfigs[item.provider].config
            };
          }
        });
        setConfigs(newConfigs);
      }
    } catch (err) {
      console.error("Failed to fetch integrations", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const activeConfig = configs[activeTab];
      await superAdminAPI.configureIntegration({
        provider: activeTab,
        isActive: activeConfig.isActive,
        config: activeConfig.config
      });
      toast.success(`${providers.find(p => p.id === activeTab).label} integration saved!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save integration');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (key, value) => {
    setConfigs(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        config: {
          ...prev[activeTab].config,
          [key]: value
        }
      }
    }));
  };

  if (fetching) return <div className="p-8 text-center text-surface-500">Loading integrations...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="3rd-Party Integrations" 
          subtitle="Configure external APIs for payments, storage, and live classes"
          breadcrumbs={['Home', 'Settings', 'Integrations']} 
        />
        <Button onClick={handleSave} disabled={loading} className="gap-2 shrink-0">
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          {providers.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isConfigured = configs[tab.id].isActive;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-surface-400')} />
                  {tab.label}
                </div>
                {isConfigured && (
                  <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-white" : "bg-success")} />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-surface-200 dark:border-surface-700">
              <div>
                <h3 className="text-lg font-bold text-surface-800 dark:text-white">
                  {providers.find(p => p.id === activeTab)?.label} Configuration
                </h3>
                <p className="text-sm text-surface-500 mt-1">
                  {providers.find(p => p.id === activeTab)?.description}
                </p>
              </div>
              <div className="flex items-center gap-3 bg-surface-50 dark:bg-surface-800 px-4 py-2 rounded-xl">
                <span className="text-sm font-medium text-surface-600 dark:text-surface-300">Enable Integration</span>
                <Switch 
                  checked={configs[activeTab].isActive} 
                  onChange={(val) => setConfigs(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], isActive: val } }))} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
              {activeTab === 'aws' && (
                <>
                  <FormField label="S3 Bucket Name">
                    <Input 
                      placeholder="e.g., my-lms-storage" 
                      value={configs.aws.config.bucketName} 
                      onChange={(e) => updateConfig('bucketName', e.target.value)} 
                    />
                  </FormField>
                  <FormField label="AWS Region">
                    <Input 
                      placeholder="e.g., ap-south-1" 
                      value={configs.aws.config.region} 
                      onChange={(e) => updateConfig('region', e.target.value)} 
                    />
                  </FormField>
                  <FormField label="Access Key ID">
                    <Input 
                      type="password" 
                      placeholder="AKIA..." 
                      value={configs.aws.config.accessKey} 
                      onChange={(e) => updateConfig('accessKey', e.target.value)} 
                    />
                  </FormField>
                  <FormField label="Secret Access Key">
                    <Input 
                      type="password" 
                      placeholder="Enter secret key" 
                      value={configs.aws.config.secretKey} 
                      onChange={(e) => updateConfig('secretKey', e.target.value)} 
                    />
                  </FormField>
                </>
              )}

              {activeTab === 'zoom' && (
                <>
                  <FormField label="Zoom Account ID">
                    <Input 
                      placeholder="Enter Account ID" 
                      value={configs.zoom.config.accountId} 
                      onChange={(e) => updateConfig('accountId', e.target.value)} 
                    />
                  </FormField>
                  <FormField label="Client ID">
                    <Input 
                      placeholder="Enter Client ID" 
                      value={configs.zoom.config.clientId} 
                      onChange={(e) => updateConfig('clientId', e.target.value)} 
                    />
                  </FormField>
                  <FormField label="Client Secret" className="md:col-span-2">
                    <Input 
                      type="password" 
                      placeholder="Enter Client Secret" 
                      value={configs.zoom.config.clientSecret} 
                      onChange={(e) => updateConfig('clientSecret', e.target.value)} 
                    />
                  </FormField>
                </>
              )}

              {activeTab === 'razorpay' && (
                <>
                  <FormField label="Key ID">
                    <Input 
                      placeholder="rzp_live_..." 
                      value={configs.razorpay.config.keyId} 
                      onChange={(e) => updateConfig('keyId', e.target.value)} 
                    />
                  </FormField>
                  <FormField label="Key Secret">
                    <Input 
                      type="password" 
                      placeholder="Enter Secret" 
                      value={configs.razorpay.config.keySecret} 
                      onChange={(e) => updateConfig('keySecret', e.target.value)} 
                    />
                  </FormField>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
