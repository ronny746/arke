import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white font-inter">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 py-16 px-4 md:px-8 relative text-white">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 mb-8 -ml-2" icon={ArrowLeft}>
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-primary-100 text-lg md:text-xl">Data Protection & Privacy Commitment</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 text-gray-700 text-lg leading-relaxed">
        <p className="mb-6">
          Your privacy is paramount. This policy explains how we collect, use, and safeguard your personal data when you interact with our coaching platform.
        </p>
        
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">3.1 Information We Collect</h2>
        <p className="mb-4">We collect information to provide a personalized and secure learning experience:</p>
        <ul className="list-disc pl-8 mb-8 space-y-3">
          <li><strong className="text-gray-900">Personal Identifiers:</strong> Name, email address, phone number, and physical billing address.</li>
          <li><strong className="text-gray-900">Academic Details:</strong> Target exams, educational background, and performance/quiz results on our platform.</li>
          <li><strong className="text-gray-900">Technical Data:</strong> IP address, browser type, device information, and cookies to analyze website traffic and improve user experience.</li>
          <li><strong className="text-gray-900">Payment Details:</strong> Financial transactions are processed via secure, encrypted third-party payment gateways. We do not store your credit card or bank details on our servers.</li>
        </ul>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">3.2 How We Use Your Data</h2>
        <p className="mb-4">We use your information solely to:</p>
        <ul className="list-disc pl-8 mb-8 space-y-3">
          <li>Administer your courses, track your progress, and issue certificates.</li>
          <li>Send essential updates, such as schedule changes, exam alerts, and homework reminders.</li>
          <li>Send promotional offers or newsletters, which you can opt out of at any time.</li>
          <li>Comply with legal obligations and prevent fraudulent activity.</li>
        </ul>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">3.3 Data Sharing & Third Parties</h2>
        <p className="mb-4">
          We do not sell, rent, or trade student data to third-party marketers. We only share data with trusted service providers necessary to run our institute, such as:
        </p>
        <ul className="list-disc pl-8 mb-8 space-y-3">
          <li>Cloud hosting and Learning Management Systems (LMS).</li>
          <li>Secure payment processors.</li>
          <li>Automated email/SMS delivery systems.</li>
        </ul>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">3.4 Data Security</h2>
        <p className="mb-8">
          We implement industry-standard administrative, technical, and physical security measures, including SSL encryption, to protect your data from unauthorized access, loss, or alteration.
        </p>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">3.5 Your Rights</h2>
        <p className="mb-8">
          Depending on your location, you have the right to access the personal data we hold about you, request corrections to inaccurate information, or request the deletion of your account and data, subject to legal or administrative bookkeeping overrides. For data requests, contact <a href="mailto:skdnsci02@gmail.com" className="text-primary-600 font-semibold hover:underline">skdnsci02@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
