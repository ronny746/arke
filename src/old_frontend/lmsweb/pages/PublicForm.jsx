import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/index.jsx';
import { Button } from '../components/ui/Button.jsx';
import { FormField, Input, Select } from '../components/forms/index.jsx';
import toast from 'react-hot-toast';
import axios from 'axios';

// We use raw axios instead of axiosInstance because this is public and doesn't need an auth token
const publicAPI = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
});

export default function PublicForm() {
  const { publicId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formConfig, setFormConfig] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await publicAPI.get(`/forms/public/${publicId}`);
        setFormConfig(res.data.data);
        
        // Initialize form state
        const initialData = {};
        res.data.data.fields.forEach(f => {
          initialData[f.id] = '';
        });
        setFormData(initialData);
      } catch (err) {
        toast.error('Form not found or is no longer active');
      } finally {
        setLoading(false);
      }
    };
    if (publicId) fetchForm();
  }, [publicId]);

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Format data for backend submission
    const submissionData = formConfig.fields.map(f => ({
      fieldId: f.id,
      label: f.label,
      value: formData[f.id]
    }));

    try {
      await publicAPI.post(`/form-submissions/public/${publicId}/submit`, { data: submissionData });
      setIsSuccess(true);
    } catch (err) {
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">Loading form...</div>;
  }

  if (!formConfig) {
    return <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">Form not available.</div>;
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-success-100 text-success-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Success!</h2>
          <p className="text-surface-600 dark:text-surface-300">
            {formConfig.successMessage || 'Thank you! Your submission has been received.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex justify-center p-4 sm:p-8">
      <Card className="max-w-2xl w-full p-6 sm:p-10 self-start animate-fade-in shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-white mb-2">{formConfig.title}</h1>
          {formConfig.description && (
            <p className="text-surface-600 dark:text-surface-400">{formConfig.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {formConfig.fields.map(field => (
            <FormField key={field.id} label={field.label} required={field.required}>
              {field.type === 'textarea' ? (
                <textarea 
                  className="input-field min-h-[100px]"
                  placeholder={field.placeholder}
                  required={field.required}
                  value={formData[field.id]}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              ) : field.type === 'select' ? (
                <Select
                  required={field.required}
                  value={formData[field.id]}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  options={[
                    { value: '', label: 'Select an option' },
                    ...(field.options || []).map(opt => ({ value: opt, label: opt }))
                  ]}
                />
              ) : (
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={formData[field.id]}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              )}
            </FormField>
          ))}

          <div className="pt-6">
            <Button type="submit" variant="gradient" className="w-full" size="lg" loading={submitting}>
              Submit
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
