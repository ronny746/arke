"use client";

import { Phone, MessageCircle, Mail, Globe, LifeBuoy, ArrowUpRight } from 'lucide-react';

// Same contacts as the app's Help & Support screen and the site footer.
const HELPLINE = '+917607151617';
const HELPLINE_LABEL = '+91 76071 51617';
const WHATSAPP = '917607151617';
const EMAIL = 'Contact@arkescholars.com';

const channels = [
  {
    icon: Phone,
    title: 'Call Helpline',
    detail: HELPLINE_LABEL,
    href: `tel:${HELPLINE}`,
    color: '#0284C7',
    bg: '#E0F2FE',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Support',
    detail: HELPLINE_LABEL,
    href: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hello ARKE Scholars Team')}`,
    color: '#16A34A',
    bg: '#DCFCE7',
    external: true,
  },
  {
    icon: Mail,
    title: 'Email Helpdesk',
    detail: EMAIL,
    href: `mailto:${EMAIL}?subject=${encodeURIComponent('ARKE Scholars Support Request')}`,
    color: '#EA580C',
    bg: '#FFEDD5',
  },
  {
    icon: Globe,
    title: 'Official Website',
    detail: 'arkescholar.com',
    href: 'https://arkescholar.com/',
    color: '#0033A0',
    bg: '#EEF2FF',
    external: true,
  },
];

export default function StudentHelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#0033A0] to-[#1E40AF] text-white p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <LifeBuoy size={26} />
          <h1 className="text-xl sm:text-2xl font-bold">Help &amp; Support</h1>
        </div>
        <p className="text-sm text-blue-100 max-w-xl">
          Questions about a course, payment, test or login? Call or WhatsApp our helpline.
        </p>
        <a
          href={`tel:${HELPLINE}`}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white text-[#0033A0] px-5 py-3 font-bold text-base sm:text-lg hover:bg-blue-50 transition-colors"
        >
          <Phone size={18} /> {HELPLINE_LABEL}
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {channels.map(({ icon: Icon, title, detail, href, color, bg, external }) => (
          <a
            key={title}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: bg, color }}>
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-gray-900 text-sm sm:text-base">{title}</span>
              <span className="block truncate text-sm text-gray-500">{detail}</span>
            </span>
            <ArrowUpRight size={18} className="text-gray-400 group-hover:text-gray-700 shrink-0" />
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 text-sm text-gray-600 space-y-2">
        <h2 className="font-semibold text-gray-900 text-base">Payment done but course not unlocked?</h2>
        <p>
          {`Call or WhatsApp ${HELPLINE_LABEL} with your transaction ID (shown under Transactions & Fees). We will sort it out quickly.`}
        </p>
      </div>
    </div>
  );
}
