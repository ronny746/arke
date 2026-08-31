import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, ArrowLeft, GripVertical } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { FormField, Input, Select } from '../../../components/forms/index.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formDetails, setFormDetails] = useState({
    title: '',
    description: '',
    successMessage: 'Thank you! Your submission has been received.'
  });

  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (id) {
      const fetchForm = async () => {
        try {
          const res = await adminAPI.getFormById(id);
          const f = res.data?.data;
          if (f) {
            setFormDetails({
              title: f.title,
              description: f.description || '',
              successMessage: f.successMessage || 'Thank you! Your submission has been received.'
            });
            setFields(f.fields.map(field => ({
              ...field,
              options: field.options ? field.options.join(', ') : ''
            })));
          }
        } catch (err) {
          toast.error('Failed to load form details');
        }
      };
      fetchForm();
    }
  }, [id]);

  const addField = () => {
    setFields([
      ...fields, 
      { id: `field_${Date.now()}`, label: '', type: 'text', required: false, placeholder: '', options: '' }
    ]);
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id, key, value) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const handleSave = async () => {
    if (!formDetails.title) {
      toast.error('Form title is required');
      return;
    }
    if (fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    // Format options for select fields
    const formattedFields = fields.map(f => ({
      id: f.id,
      label: f.label || 'Untitled Field',
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
      options: f.type === 'select' ? f.options.split(',').map(o => o.trim()).filter(Boolean) : []
    }));

    setLoading(true);
    try {
      if (id) {
        await adminAPI.updateForm(id, {
          ...formDetails,
          fields: formattedFields
        });
        toast.success('Form updated successfully!');
      } else {
        await adminAPI.createForm({
          ...formDetails,
          fields: formattedFields
        });
        toast.success('Form created successfully!');
      }
      navigate('/admin/forms');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Form Builder"
        subtitle="Design your custom form"
        breadcrumbs={['Home', 'Forms', 'Builder']}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/forms')}>Back</Button>
            <Button variant="gradient" icon={Save} onClick={handleSave} loading={loading}>
              {id ? 'Update Form' : 'Save Form'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-lg mb-4">Form Details</h3>
            <div className="space-y-4">
              <FormField label="Form Title" required>
                <Input 
                  value={formDetails.title} 
                  onChange={(e) => setFormDetails({...formDetails, title: e.target.value})} 
                  placeholder="e.g. 2026 Admission Inquiry"
                />
              </FormField>
              <FormField label="Description">
                <textarea 
                  className="input-field min-h-[100px]"
                  value={formDetails.description} 
                  onChange={(e) => setFormDetails({...formDetails, description: e.target.value})}
                  placeholder="Instructions for filling the form..."
                />
              </FormField>
              <FormField label="Success Message">
                <Input 
                  value={formDetails.successMessage} 
                  onChange={(e) => setFormDetails({...formDetails, successMessage: e.target.value})} 
                />
              </FormField>
            </div>
          </Card>
        </div>

        {/* Fields Builder */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg">Form Fields</h3>
              <Button variant="outline" size="sm" icon={Plus} onClick={addField}>Add Field</Button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
                <p className="text-surface-500 mb-4">No fields added yet.</p>
                <Button variant="gradient" icon={Plus} onClick={addField}>Add First Field</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700 relative group">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-surface-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical size={20} />
                    </div>
                    
                    <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Field Label" required>
                        <Input 
                          value={field.label} 
                          onChange={(e) => updateField(field.id, 'label', e.target.value)} 
                          placeholder="e.g. Student Name"
                        />
                      </FormField>

                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <FormField label="Field Type">
                            <Select 
                              value={field.type} 
                              onChange={(e) => updateField(field.id, 'type', e.target.value)}
                              options={[
                                { value: 'text', label: 'Short Text' },
                                { value: 'textarea', label: 'Long Text' },
                                { value: 'email', label: 'Email' },
                                { value: 'number', label: 'Number' },
                                { value: 'select', label: 'Dropdown' },
                                { value: 'date', label: 'Date' }
                              ]}
                            />
                          </FormField>
                        </div>
                        <Button 
                          variant="outline" 
                          className="mb-1 text-danger border-danger hover:bg-danger-50" 
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>

                      {field.type === 'select' && (
                        <div className="md:col-span-2">
                          <FormField label="Dropdown Options (Comma separated)" required>
                            <Input 
                              value={field.options} 
                              onChange={(e) => updateField(field.id, 'options', e.target.value)} 
                              placeholder="Option 1, Option 2, Option 3"
                            />
                          </FormField>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" 
                          id={`req_${field.id}`}
                          checked={field.required}
                          onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                          className="rounded text-primary border-surface-300 focus:ring-primary"
                        />
                        <label htmlFor={`req_${field.id}`} className="text-sm text-surface-600 dark:text-surface-300">Required Field</label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
