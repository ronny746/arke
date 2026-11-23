import { CalendarDays, CheckCircle2, Clock3, Layers3, Trophy } from 'lucide-react';

type CoursePlannerProps = {
  targetExam?: string;
  courseName?: string;
};

const shaktiMonths = [
  { name: 'November 2026', label: 'GO-LIVE', items: [{ day: '25', code: 'LIVE', tone: 'gold' }, { day: '29', code: 'AIM', tone: 'gold' }] },
  { name: 'December 2026', label: 'PART TESTS', items: [{ day: '2', code: 'PT1', tone: 'blue' }, { day: '6', code: 'PT2', tone: 'blue' }, { day: '9', code: 'PT3', tone: 'blue' }, { day: '13', code: 'PT4', tone: 'blue' }, { day: '20', code: 'FT1', tone: 'green' }, { day: '25', code: 'FT2', tone: 'green' }, { day: '30', code: 'FT4', tone: 'green' }] },
  { name: 'January 2027', label: 'FULL MOCKS', items: [{ day: '2', code: 'FT5', tone: 'green' }, { day: '4', code: 'FT6', tone: 'green' }, { day: '8', code: 'FT8', tone: 'green' }, { day: '12', code: 'FT10', tone: 'green' }, { day: '20', code: 'JEE', tone: 'red' }, { day: '28', code: 'FT14', tone: 'green' }] },
  { name: 'March 2027', label: 'SESSION 2', items: [{ day: '14', code: 'FT16', tone: 'green' }, { day: '17', code: 'FT17', tone: 'green' }, { day: '20', code: 'FT18', tone: 'green' }, { day: '24', code: 'FT20', tone: 'green' }, { day: '28', code: 'FT22', tone: 'green' }, { day: '31', code: 'FT25', tone: 'green' }] },
];

const phases = [
  { level: '01', name: 'Spark', title: 'Launch and first look', range: '25 Nov', detail: '81 chapter tests open · take them in any order', tone: 'gold' },
  { level: '02', name: 'Charge', title: 'Revise by quarter', range: '2–13 Dec', detail: 'Four part tests cover the syllabus one quarter at a time', tone: 'blue' },
  { level: '03', name: 'Build', title: 'Second round and first mocks', range: '16–30 Dec', detail: 'Quarter tests at a step up, then the first full-syllabus mocks', tone: 'green' },
  { level: '04', name: 'Surge', title: 'Exam-condition practice', range: '2 Jan–7 Apr', detail: 'Full mocks every second day, planned around both JEE Main sessions', tone: 'navy' },
];

export default function CoursePlanner({ targetExam = 'JEE Main 2027', courseName }: CoursePlannerProps) {
  const isJee = /jee/i.test(targetExam) || /shakti/i.test(courseName || '');
  const examLabel = isJee ? 'JEE Main 2027' : targetExam;

  return (
    <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#D9E0EA] bg-[#FAF7EF] shadow-sm">
      <div className="bg-[#0B203C] px-5 py-8 text-white sm:px-8 lg:px-10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#D7A532]">{isJee ? 'Shakti schedule' : 'Course planner'} · {examLabel}</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Build your exam power, date by date.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#C8D4E7] sm:text-base">One ladder from chapter tests to part tests to full mocks, planned around both JEE Main sessions.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[350px]">
            {[
              ['81', 'Chapter tests'],
              ['10', 'Part tests'],
              ['25', 'Full mocks'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-3">
                <div className="text-2xl font-black text-[#D7A532]">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#C8D4E7]">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold">
          {['Series live · 25 Nov', 'Session 1 · 20–28 Jan', 'Session 2 · 2–7 Apr'].map((item) => (
            <span key={item} className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[#F4F7FB]">{item}</span>
          ))}
        </div>
      </div>

      <div className="px-5 py-7 sm:px-8 lg:px-10">
        <div className="mb-5 flex items-center gap-2 text-[#0B203C]">
          <CalendarDays size={20} className="text-[#C8992D]" />
          <h3 className="text-xl font-black">The {isJee ? 'Shakti' : 'course'} schedule</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {shaktiMonths.map((month) => (
            <div key={month.name} className="rounded-2xl border border-[#E3DCCB] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-black text-[#0B203C]">{month.name}</h4>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#68758A]">{month.label}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {month.items.map((item) => (
                  <div key={`${month.name}-${item.day}-${item.code}`} className={`rounded-xl border px-2 py-2 text-center ${item.tone === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : item.tone === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-700' : item.tone === 'red' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    <div className="text-sm font-black">{item.day}</div>
                    <div className="text-[10px] font-black">{item.code}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-6 text-[#68758A]">Every scheduled test opens at 10:00 IST on its date and stays available for practice. The ladder moves from chapter → part → full, so every attempt has a clear next step.</p>

        <div className="mt-8 grid gap-3">
          {phases.map((phase) => (
            <div key={phase.level} className="flex flex-col gap-3 rounded-2xl border border-[#E3DCCB] bg-white p-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex min-w-[145px] items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-black ${phase.tone === 'gold' ? 'bg-amber-100 text-amber-800' : phase.tone === 'blue' ? 'bg-blue-100 text-blue-700' : phase.tone === 'green' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#0B203C] text-white'}`}>{phase.level}</span>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-[#C8992D]">Level {phase.level} · {phase.name}</p><p className="font-black text-[#0B203C]">{phase.title}</p></div>
              </div>
              <div className="flex-1 text-sm text-[#43536B]">{phase.detail}</div>
              <div className="flex items-center gap-1.5 text-xs font-black text-[#0B203C]"><Clock3 size={15} className="text-[#C8992D]" /> {phase.range}</div>
            </div>
          ))}
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            [Layers3, 'Chapter tests', 'Fix weak topics with focused practice.'],
            [CheckCircle2, 'Part tests', 'Revise one quarter of the syllabus at a time.'],
            [Trophy, 'Full mocks', 'Build speed and accuracy in exam conditions.'],
          ].map(([Icon, title, text]) => {
            const IconComponent = Icon as typeof Layers3;
            return <div key={title as string} className="rounded-2xl border border-[#E3DCCB] bg-[#FFFDF8] p-4"><IconComponent size={20} className="text-[#C8992D]" /><h4 className="mt-3 font-black text-[#0B203C]">{title as string}</h4><p className="mt-1 text-xs leading-5 text-[#68758A]">{text as string}</p></div>;
          })}
        </div>
      </div>
    </section>
  );
}
