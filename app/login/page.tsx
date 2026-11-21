import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-12 sm:px-6">
      {/* The form reads ?next= from the URL to return you where you were. */}
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
