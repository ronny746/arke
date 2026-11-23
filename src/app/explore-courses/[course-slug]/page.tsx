"use client";

import { useParams } from "next/navigation";
import PublicCourseOverviewPage from "@/app/course/[id]/page";

export default function ExploreCourseDetailPage() {
  const params = useParams<{ "course-slug": string }>();
  const slug = params?.["course-slug"];
  return <PublicCourseOverviewPage identifier={Array.isArray(slug) ? slug[0] : slug} />;
}
