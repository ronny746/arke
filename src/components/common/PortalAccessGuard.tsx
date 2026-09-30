"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

type StoredUser = { role?: string };

export function PortalAccessGuard({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "missing" | "forbidden" | "allowed">("checking");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        if (!stored || !token) {
          setStatus("missing");
          return;
        }
        const user = JSON.parse(stored) as StoredUser;
        setStatus(allowedRoles.includes(String(user.role || "").toLowerCase()) ? "allowed" : "forbidden");
      } catch {
        setStatus("missing");
      }
    });
  }, [allowedRoles]);

  if (status === "allowed") return <>{children}</>;

  const isChecking = status === "checking";
  const isMissing = status === "missing";
  return (
    <main className="min-h-dvh grid place-items-center bg-surface-50 p-6">
      <section className="max-w-md rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-warning-600" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-surface-900">
          {isChecking ? "Checking access" : isMissing ? "Sign in required" : "You do not have access to this portal"}
        </h1>
        {!isChecking && <p className="mt-2 text-sm text-surface-600">{isMissing ? "Please sign in with the account assigned to this portal." : "Use the portal assigned to your account, or contact an administrator if this seems incorrect."}</p>}
        {!isChecking && <Link href="/" className="btn-primary mt-6 inline-flex">Return to home</Link>}
      </section>
    </main>
  );
}
