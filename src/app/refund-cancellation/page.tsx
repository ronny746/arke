import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function RefundCancellation() {
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
          <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight mb-4">Refund & Cancellation Policy</h1>
          <p className="text-primary-100 text-lg md:text-xl">RBI (Regulation of Payment Aggregators) Directions, 2025</p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <span className="bg-primary-800 px-3 py-1.5 rounded-full font-medium">Effective Date: 02 June 2026</span>
            <span className="bg-primary-800 px-3 py-1.5 rounded-full font-medium">Refund Window: 7 Calendar Days</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 text-gray-700 text-lg leading-relaxed">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-8 mb-6">1. Scope & Applicability</h2>
        <p className="mb-6">
          This Refund & Cancellation Policy applies to all fee payments made by students, parents, or guardians of ARKE Scholars (hereinafter "the Institute") for courses, programs, test series, study materials, or any other services offered through online payment modes including UPI, credit/debit card, net banking, and digital wallets processed via Easebuzz, our RBI-authorised Payment Aggregator partner.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-8 rounded-r-lg">
          <p className="text-blue-900 m-0">
            <strong className="font-bold">RBI Compliance Notice:</strong> As mandated under the RBI Master Direction on Regulation of Payment Aggregators, 2025, refund policies must be disclosed upfront to payers before the transaction is initiated. By proceeding with payment on https://arke.pro, the payer confirms they have read and accepted this policy in full.
          </p>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">2. Refund Eligibility & Amounts</h2>
        <p className="mb-6">Refund requests must be submitted within 7 calendar days from the date of successful payment. Eligibility is determined based on the timing of the request and the number of sessions attended:</p>
        
        <div className="overflow-x-auto my-8 border border-gray-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 font-semibold text-gray-900">Situation</th>
                <th className="p-4 font-semibold text-gray-900">Refund Amount</th>
                <th className="p-4 font-semibold text-gray-900">Conditions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4">Within 7 days, before batch start</td>
                <td className="p-4 font-bold text-gray-900">100% of course fee</td>
                <td className="p-4 text-gray-500">Less processing fee up to ₹500</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4">Within 7 days, 1–2 classes attended</td>
                <td className="p-4 font-bold text-gray-900">75% of course fee</td>
                <td className="p-4 text-gray-500">Of net fee paid</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4">After 7 days or 3+ classes attended</td>
                <td className="p-4 font-bold text-red-600">No Refund</td>
                <td className="p-4 text-gray-500">Except under special circumstances</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4">Failed / duplicate transaction</td>
                <td className="p-4 font-bold text-green-600">100% Refund</td>
                <td className="p-4 text-gray-500">Auto-processed within 5–7 business days</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">3. RBI-Mandated Refund Routing</h2>
        <ul className="list-disc pl-8 mb-8 space-y-3">
          <li>All approved refunds will be credited exclusively to the original payment source — the same card, UPI ID, bank account, or wallet used at the time of the original payment. Refund to any alternate instrument or account is not permitted under RBI guidelines.</li>
          <li>Payment gateway convenience fees, transaction charges, or GST levied at the time of payment are non-refundable.</li>
          <li>The Institute shall not offer cash refunds for payments made through online/digital modes.</li>
          <li>Where a transaction has failed but the payer's account has been debited, the amount shall be reversed automatically by Easebuzz within the RBI-prescribed turnaround time.</li>
          <li>Delayed refunds beyond prescribed settlement timelines may attract penal interest as mandated by RBI 2024 guidelines.</li>
        </ul>
        <div className="bg-gray-50 border border-gray-200 p-6 my-8 rounded-xl">
          <p className="text-gray-700 m-0 text-base">
            <strong className="text-gray-900">Security Notice:</strong> All payment data is processed by Easebuzz, an RBI-authorised Payment Aggregator compliant with PCI-DSS/PA-DSS standards and RBI Cyber Resilience & Digital Payment Security Directions, 2024. The Institute does not store any card number, CVV, UPI credentials, or net banking details on its servers. All payment system data is stored within India per RBI data localisation circular, 2018.
          </p>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">4. Non-Refundable Situations</h2>
        <p className="mb-4">Refunds will not be issued under the following circumstances:</p>
        <ul className="list-disc pl-8 mb-8 space-y-3">
          <li>Refund request submitted after the 7-day window has elapsed from the date of payment.</li>
          <li>Student has attended 3 or more sessions/classes of the enrolled course.</li>
          <li>Study materials, digital content, recorded lectures, or e-books have been accessed or downloaded.</li>
          <li>Fees paid for scholarship seats, discounted batches, subsidised programs, or promotional offers.</li>
          <li>Exam registration fees, mock test fees, or test series subscription fees.</li>
          <li>Voluntary non-attendance or personal change of decision after the refund period.</li>
          <li>Fees for short-term workshops, seminars, crash courses, or single-day events.</li>
        </ul>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">5. Refund Process & Timelines</h2>
        <div className="space-y-6 my-8">
          <div className="flex border-l-4 border-primary-500 pl-6 py-2 bg-primary-50 rounded-r-lg">
            <div>
              <h3 className="font-bold text-gray-900 text-xl">Step 1: Submit Request</h3>
              <p className="text-gray-600 mt-1">Email within 7 days with payment receipt & enrollment details</p>
            </div>
          </div>
          <div className="flex border-l-4 border-primary-500 pl-6 py-2 bg-primary-50 rounded-r-lg">
            <div>
              <h3 className="font-bold text-gray-900 text-xl">Step 2: Verification (2–3 days)</h3>
              <p className="text-gray-600 mt-1">Team verifies eligibility as per this policy</p>
            </div>
          </div>
          <div className="flex border-l-4 border-primary-500 pl-6 py-2 bg-primary-50 rounded-r-lg">
            <div>
              <h3 className="font-bold text-gray-900 text-xl">Step 3: Approval Notice (1 day)</h3>
              <p className="text-gray-600 mt-1">Written confirmation sent to registered email</p>
            </div>
          </div>
          <div className="flex border-l-4 border-primary-500 pl-6 py-2 bg-primary-50 rounded-r-lg">
            <div>
              <h3 className="font-bold text-gray-900 text-xl">Step 4: Credit to Source (5–7 days)</h3>
              <p className="text-gray-600 mt-1">Refund credited to original payment instrument via Easebuzz</p>
            </div>
          </div>
        </div>
        <p className="text-base italic text-gray-500 mb-8">
          <strong className="text-gray-700">Timeline Notice:</strong> Total refund turnaround is approximately 10–12 business days from the date of approval. Actual credit to the payer's account may vary based on the student's bank or card issuer processing timelines. Easebuzz settlement timelines are governed by RBI's prescribed T+n framework.
        </p>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">6. Dispute Resolution & Grievance Redressal</h2>
        <p className="mb-6">As required by the RBI Master Direction 2025, a documented 3-level dispute resolution mechanism is in place:</p>
        
        <div className="space-y-6 my-8">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-gray-900 text-xl">Level 1 — Institute Grievance Officer</h3>
            <p className="text-gray-600 mt-2">Contact the Institute's Grievance Officer within 30 days of the transaction date.</p>
            <ul className="mt-4 space-y-2">
              <li><strong className="text-gray-900">Grievance Officer:</strong> Sushant Kumar</li>
              <li><strong className="text-gray-900">Email:</strong> <a href="mailto:contact@arke.pro" className="text-primary-600 hover:underline">contact@arke.pro</a></li>
              <li><strong className="text-gray-900">Phone:</strong> +91 8764 809 537</li>
              <li><strong className="text-gray-900">Hours:</strong> Monday to Saturday, 9:00 AM to 6:00 PM IST</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-gray-900 text-xl">Level 2 — Payment Gateway Escalation</h3>
            <p className="text-gray-600 mt-2">If unresolved within 15 business days by the Institute, escalate to Easebuzz merchant support channel with your transaction ID and complaint reference number.</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-gray-900 text-xl">Level 3 — RBI Ombudsman</h3>
            <p className="text-gray-600 mt-2">If the dispute remains unresolved after Level 2, the payer may file a complaint with the RBI Ombudsman for Digital Transactions at: <a href="https://cms.rbi.org.in" className="text-primary-600 font-semibold hover:underline" target="_blank" rel="noopener noreferrer">cms.rbi.org.in</a></p>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">7. Special Circumstances & Exceptions</h2>
        <p className="mb-4">Exceptions outside the standard 7-day refund window may be considered at the sole discretion of the management in the following cases:</p>
        <ul className="list-disc pl-8 mb-6 space-y-3">
          <li>Documented medical emergency of the student (original doctor's certificate or hospital records required).</li>
          <li>Batch or course cancelled or materially altered (change of subject, faculty, or schedule beyond 50%) by the Institute.</li>
          <li>Proven technical failure in online payment processing or course access directly attributable to the Institute or its platform.</li>
        </ul>
        <p className="mb-8">In such cases, the Institute may offer a full refund, partial refund, or course transfer credit. The decision of the management is final and binding.</p>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">8. Course Transfer Policy</h2>
        <p className="mb-12">
          As an alternative to a monetary refund, students may opt to transfer enrollment to a different batch or course of equal or lesser value within 15 days of the original payment date. A one-time administrative transfer fee of ₹200 may apply. Transfer requests are subject to seat availability.
        </p>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">Declaration & Acceptance</h2>
        <div className="bg-gray-100 p-8 rounded-xl border border-gray-200 text-gray-800">
          <p className="mb-0 leading-relaxed">
            By completing payment on https://arke.pro, the student and/or guardian acknowledges having read, understood, and accepted this Refund Policy in its entirety. This policy is subject to revision; the latest version is always available on our official website. All disputes are subject to the jurisdiction of courts in India & UAE.
          </p>
        </div>
      </div>
    </div>
  );
}
