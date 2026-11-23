"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Compass, Loader2, Search, Sparkles } from "lucide-react";
import ArkeLogo from "@/components/ArkeLogo";

type Course = {
  _id: string;
  slug?: string;
  name: string;
  subtitle?: string;
  description?: string;
  fee?: number;
  actualFee?: number;
  duration?: string;
  targetExam?: string;
  targetClass?: string;
  medium?: string;
  badge?: string;
  color?: string;
  features?: string[];
  subjects?: { name?: string }[];
};

const slugFallback = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function ExploreCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [exam, setExam] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/public/courses")
      .then((response) => response.json())
      .then((payload) => setCourses(Array.isArray(payload?.data) ? payload.data : []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const exams = useMemo(() => ["ALL", ...Array.from(new Set(courses.map((course) => course.targetExam).filter((value): value is string => Boolean(value && value !== "ALL"))))], [courses]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesExam = exam === "ALL" || course.targetExam === exam || course.targetExam === "ALL";
      const haystack = [course.name, course.subtitle, course.description, course.targetExam, course.targetClass].filter(Boolean).join(" ").toLowerCase();
      return matchesExam && (!needle || haystack.includes(needle));
    });
  }, [courses, exam, query]);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0B132B]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B132B]/95 text-white shadow-lg backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" aria-label="ARKE Scholars home"><ArkeLogo variant="light" size="md" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/#courses" className="hidden text-sm font-bold text-white/75 transition hover:text-[#10B981] sm:inline">Back to home</Link>
            <Link href="/login" className="rounded-full bg-[#10B981] px-4 py-2 text-xs font-black text-white transition hover:bg-[#0C8044] sm:px-5 sm:text-sm">Sign in</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0B132B] px-4 pb-14 pt-14 text-white sm:px-6 sm:pt-20">
        <div className="absolute -right-28 -top-36 h-96 w-96 rounded-full border-[36px] border-[#C99A2E]/20" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C99A2E]/40 bg-[#C99A2E]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#F3C860]"><Sparkles size={14} /> Live learning catalog</p>
            <h1 className="font-display text-4xl font-black leading-tight tracking-tight sm:text-6xl">Find the course that moves your score.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">Explore every currently live ARKE course without signing in. Open a course to see its syllabus, test series, faculty and enrollment options.</p>
          </div>
          <div className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 focus-within:border-[#10B981]">
              <Search size={20} className="text-white/50" />
              <span className="sr-only">Search live courses</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search JEE, NEET, class or course name" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45" />
              {query && <button type="button" onClick={() => setQuery("")} className="text-xs font-bold text-white/60 hover:text-white" aria-label="Clear search">Clear</button>}
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {exams.map((value) => <button key={value} type="button" onClick={() => setExam(value)} className={`whitespace-nowrap rounded-2xl border px-4 py-3 text-xs font-black transition ${exam === value ? "border-[#10B981] bg-[#10B981] text-white" : "border-white/15 bg-white/10 text-white/75 hover:border-white/35"}`}>{value === "ALL" ? "All courses" : value}</button>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#0C8044]">Available now</p><h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">Live courses</h2></div><p className="text-sm font-bold text-slate-500">{loading ? "Loading…" : `${filtered.length} course${filtered.length === 1 ? "" : "s"}`}</p></div>
        {loading ? <div className="flex min-h-56 items-center justify-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="animate-spin text-[#0C8044]" /></div> : filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><BookOpen className="mx-auto text-slate-400" size={32} /><h3 className="mt-4 font-display text-xl font-black">No live course matches</h3><p className="mt-2 text-sm text-slate-500">Try another search or clear the exam filter.</p></div> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((course) => { const slug = course.slug || slugFallback(course.name); const accent = course.color || "#0C8044"; const discount = course.actualFee && course.fee && course.actualFee > course.fee ? Math.round(((course.actualFee - course.fee) / course.actualFee) * 100) : 0; return <article key={course._id} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#C99A2E] hover:shadow-xl"><div className="h-2" style={{ background: `linear-gradient(90deg, ${accent}, #C99A2E)` }} /><div className="flex flex-1 flex-col p-6"><div className="flex items-start justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B132B] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white"><Compass size={12} className="text-[#C99A2E]" /> {course.targetExam || "General"}</span>{course.badge && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{course.badge}</span>}</div><h3 className="mt-5 font-display text-xl font-black leading-tight">{course.name}</h3>{course.subtitle && <p className="mt-2 text-sm font-semibold text-slate-500">{course.subtitle}</p>}<p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{course.description || `Structured ${course.targetExam || "exam"} preparation with guided practice and test series.`}</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600">{course.targetClass && <span className="rounded-lg bg-slate-100 px-2.5 py-1">{course.targetClass}</span>}{course.duration && <span className="rounded-lg bg-slate-100 px-2.5 py-1">{course.duration}</span>}{course.subjects?.length ? <span className="rounded-lg bg-slate-100 px-2.5 py-1">{course.subjects.length} subjects</span> : null}</div><div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-5"><div><span className="text-2xl font-black">₹{(course.fee || 0).toLocaleString("en-IN")}</span>{discount > 0 && <span className="ml-2 text-xs font-bold text-emerald-700">{discount}% off</span>}</div><Link href={`/explore-courses/${slug}`} className="inline-flex items-center gap-2 rounded-xl bg-[#0B132B] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#0C8044]">View course <ArrowRight size={15} /></Link></div></div></article>; })}</div>}
      </section>
    </main>
  );
}
