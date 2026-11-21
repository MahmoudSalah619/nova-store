"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAccount } from "@/components/account-provider";

type Mode = "signin" | "signup";

export function LoginForm() {
  const { signIn, signUp, user, signOut } = useAccount();
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next");
  // Only allow same-site paths as a redirect target.
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/wishlist";

  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", rePassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && form.password !== form.rePassword) {
      setError("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") await signIn(form.email, form.password);
      else await signUp(form);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center">
        <p className="text-lg font-medium">Signed in as {user.name}</p>
        <p className="mt-1 text-sm text-muted">{user.email}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => router.push(next)} className="btn-primary">
            Continue
          </button>
          <button onClick={signOut} className="btn-secondary">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{mode === "signin" ? "Welcome back" : "Create an account"}</h1>
      <p className="mt-2 text-muted">Sign in to save favorites, place orders and track them.</p>

      <div className="mt-8 grid grid-cols-2 rounded-full bg-surface p-1 text-sm" role="tablist">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`rounded-full py-2 transition-colors ${mode === m ? "bg-background font-medium shadow-sm" : "text-muted"}`}
          >
            {m === "signin" ? "Sign in" : "Register"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <Field label="Full name">
            <input className="input" required minLength={3} value={form.name} onChange={set("name")} autoComplete="name" />
          </Field>
        )}
        <Field label="Email">
          <input className="input" type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
        </Field>
        {mode === "signup" && (
          <Field label="Phone (Egyptian mobile)">
            <input
              className="input"
              type="tel"
              required
              pattern="01[0125][0-9]{8}"
              title="An Egyptian mobile number, e.g. 01012345678"
              value={form.phone}
              onChange={set("phone")}
              autoComplete="tel"
              placeholder="01012345678"
            />
          </Field>
        )}
        <Field label="Password">
          <input
            className="input"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={set("password")}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </Field>
        {mode === "signup" && (
          <Field label="Confirm password">
            <input className="input" type="password" required value={form.rePassword} onChange={set("rePassword")} autoComplete="new-password" />
          </Field>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm">{label}</span>
      {children}
    </label>
  );
}
