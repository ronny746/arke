"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { publicAPI } from '@/api/publicAPI';
import { Card } from '@/components/ui';
import { Input } from '@/components/forms';
import { Button } from '@/components/ui/Button';
import { User, Mail, Phone, Clock, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PublicExamPlayer from './PublicExamPlayer';

export default function PublicExam() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchExamDetails();
  }, [id]);

  const fetchExamDetails = async () => {
    try {
      const res = await publicAPI.getExamDetails(id);
      setExam(res.data.data.exam);
      setQuestions(res.data.data.questions);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load exam details');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      return toast.error('Please fill all details.');
    }

    try {
      setSubmitting(true);
      const res = await publicAPI.startExam(id, formData);
      setSessionToken(res.data.data.token);
      setExamStarted(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start exam');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white p-6 text-center space-y-6">
        <ShieldAlert className="w-20 h-20 text-danger-500" />
        <h1 className="text-3xl font-bold">Mobile Access Restricted</h1>
        <p className="text-gray-300 max-w-md">This test cannot be taken on a mobile device. Please switch to a laptop, desktop, or a device with a larger screen to start the test.</p>
        <Button variant="primary" size="lg" onClick={() => router.push('/')}>Go to Homepage</Button>
      </div>
    );
  }

  if (!exam) return null;

  if (examStarted && sessionToken) {
    return (
      <PublicExamPlayer 
        exam={exam} 
        questions={questions} 
        token={sessionToken} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          {exam.institute?.logo && (
            <img src={exam.institute.logo} alt="Institute Logo" className="h-16 mx-auto mb-4" />
          )}
          <h2 className="text-3xl font-extrabold text-gray-900">{exam.title}</h2>
          <p className="mt-2 text-lg text-gray-600">{exam.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Exam Info */}
          <Card className="p-6 space-y-6">
            <h3 className="text-xl font-semibold">Exam Information</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <FileText className="w-5 h-5 text-primary-500 mt-0.5 mr-3" />
                <div>
                  <p className="font-medium">Total Questions</p>
                  <p className="text-sm text-gray-500">{questions.length} questions</p>
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-primary-500 mt-0.5 mr-3" />
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-sm text-gray-500">{exam.settings?.durationMinutes} minutes</p>
                </div>
              </div>
              {exam.settings?.passingMarks > 0 && (
                <div className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium">Passing Marks</p>
                    <p className="text-sm text-gray-500">{exam.settings.passingMarks}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-primary-50 p-4 rounded-lg">
              <h4 className="font-medium text-primary-900 mb-2">Instructions</h4>
              <ul className="list-disc list-inside text-sm text-primary-700 space-y-1">
                <li>Ensure you have a stable internet connection.</li>
                <li>Do not refresh the page during the exam.</li>
                {exam.security?.requireFullScreen && <li>This exam requires full screen mode.</li>}
                {exam.security?.disableCopyPaste && <li>Copy-pasting is disabled.</li>}
              </ul>
            </div>
          </Card>

          {/* Registration Form */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-6">Register to Start</h3>
            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="+1 234 567 890"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  variant="gradient" 
                  className="w-full justify-center" 
                  disabled={submitting}
                >
                  {submitting ? 'Starting...' : 'Start Exam'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
