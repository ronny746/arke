import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function TermsAndConditions() {
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
          <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight mb-4">Terms & Conditions</h1>
          <p className="text-primary-100 text-lg md:text-xl">Website Terms of Use & Enrollment Agreement</p>
          <p className="text-primary-200 text-sm mt-4">Last Updated: June 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 text-gray-700 text-lg leading-relaxed">
        <p className="mb-8">
          Welcome to <strong className="text-gray-900">ARKE Scholars</strong> ("Institute," "we," "us," or "our"). By accessing our website, enrolling in our courses, or utilizing our educational services, you agree to comply with and be bound by the following Terms and Conditions. Please read them carefully.
        </p>
        
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">1.1 Eligibility & Enrollment</h2>
        <ul className="list-disc pl-8 mb-8 space-y-3">
          <li><strong className="text-gray-900">Age Requirement:</strong> Students under the age of 18 must have the consent of a parent or legal guardian to enroll in courses and use this website.</li>
          <li><strong className="text-gray-900">Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your login credentials. Any activity occurring under your account is your sole responsibility.</li>
          <li><strong className="text-gray-900">Accuracy of Information:</strong> You agree to provide accurate, current, and complete information during the registration process.</li>
        </ul>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">1.2 Intellectual Property Rights</h2>
        <ul className="list-disc pl-8 mb-8 space-y-3">
          <li><strong className="text-gray-900">Proprietary Materials:</strong> All study materials, videos, lectures, quizzes, notes, graphics, and software provided by the Institute are the exclusive intellectual property of ARKE Scholars.</li>
          <li><strong className="text-gray-900">Limited License:</strong> Enrolled students are granted a single, non-transferable, revocable license to access materials for personal, educational use only.</li>
          <li><strong className="text-gray-900">Prohibited Actions:</strong> You may not record, download (unless explicitly permitted), modify, replicate, distribute, or commercially exploit any course content. Sharing account access with non-enrolled individuals will result in immediate termination of access without a refund.</li>
        </ul>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">1.3 Code of Conduct</h2>
        <p className="mb-4">
          Students are expected to maintain a respectful learning environment. We reserve the right to suspend or terminate website access or course enrollment without notice if a student engages in:
        </p>
        <ul className="list-disc pl-8 mb-8 space-y-3">
          <li>Cyberbullying, harassment, or defamatory comments toward instructors or fellow students.</li>
          <li>Cheating, plagiarism, or disrupting live online sessions.</li>
          <li>Attempting to reverse-engineer the website or deploy harmful code/malware.</li>
        </ul>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">1.4 Limitation of Liability</h2>
        <p className="mb-4">
          While we strive for excellence, the Institute does not guarantee specific exam results, grades, or career outcomes. Educational progress depends entirely on individual student effort. Services are provided on an "as-is" and "as-available" basis.
        </p>
        <p className="mb-8">
          These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of India.
        </p>
      </div>
    </div>
  );
}
