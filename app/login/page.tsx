
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  async function socialLogin(provider: "google" | "facebook" | "twitter") {
    setLoading(provider);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading("");
    }
  }

  async function emailAuth() {
    setLoading("email");
    setMessage("");

    const { data, error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading("");

    if (error) {
      setMessage(error.message);
      return;
    }

    if (mode === "signup" && !data.session) {
      setMessage("Account created! Please check your email to confirm.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#080e1b] p-4 text-white sm:p-8">
      <div className="mx-auto grid min-h-[90vh] max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#101a2d] shadow-2xl lg:grid-cols-2">

        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#142039] p-12 lg:flex">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-[#c49b54]/20" />
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-[#c49b54]/20" />
          <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#c49b54]/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c49b54] text-xl font-black text-[#142039]">
              O
            </div>
            <span className="text-xl font-bold tracking-wide">
              ORBIX <span className="text-[#c49b54]">STUDIO</span>
            </span>
          </div>

          <div className="relative z-10 max-w-lg">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.35em] text-[#c49b54]">
              Your business. In control.
            </p>
            <h1 className="text-5xl font-bold leading-tight">
              Everything your agency needs.
              <span className="text-[#c49b54]"> One workspace.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-8 text-slate-300">
              Manage clients, track projects and build stronger business
              relationships from one beautifully organized workspace.
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-400">
            <span>© 2026 Orbix Studio</span>
            <span>Built for ambitious agencies.</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-12 sm:px-12">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c49b54] font-black text-[#142039]">
                  O
                </div>
                <span className="font-bold tracking-wide">
                  ORBIX <span className="text-[#c49b54]">STUDIO</span>
                </span>
              </div>
            </div>

            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c49b54]">
              Welcome to Orbix
            </p>
            <h2 className="text-3xl font-bold">
              {mode === "login" ? "Welcome back." : "Create your account."}
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              {mode === "login"
                ? "Sign in to continue to your workspace."
                : "Start managing your agency in one place."}
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <button
                onClick={() => socialLogin("google")}
                disabled={!!loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold transition hover:border-[#c49b54]/60 hover:bg-white/[0.08] disabled:opacity-50"
              >
                <span className="font-black text-lg text-[#4285F4]">G</span>
                Google
              </button>

              <button
                onClick={() => socialLogin("facebook")}
                disabled={!!loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold transition hover:border-[#c49b54]/60 hover:bg-white/[0.08] disabled:opacity-50"
              >
                <span className="font-black text-lg text-[#1877F2]">f</span>
                Facebook
              </button>

              <button
                onClick={() => socialLogin("twitter")}
                disabled={!!loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold transition hover:border-[#c49b54]/60 hover:bg-white/[0.08] disabled:opacity-50"
              >
                <span className="font-bold text-lg">𝕏</span>
                X
              </button>
            </div>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-500">OR CONTINUE WITH EMAIL</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-[#c49b54]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-[#c49b54]"
                />
              </div>

              {message && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {message}
                </p>
              )}

              <button
                onClick={emailAuth}
                disabled={!!loading || !email || !password}
                className="w-full rounded-xl bg-[#c49b54] py-4 text-sm font-bold text-[#101827] shadow-lg shadow-[#c49b54]/10 transition hover:bg-[#d6b16f] disabled:opacity-50"
              >
                {loading === "email"
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign In to Workspace →"
                    : "Create Account →"}
              </button>
            </div>

            <p className="mt-7 text-center text-sm text-slate-400">
              {mode === "login"
                ? "New to Orbix Studio? "
                : "Already have an account? "}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setMessage("");
                }}
                className="font-bold text-[#c49b54] hover:underline"
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>

            <p className="mt-10 text-center text-xs text-slate-600">
              Secure access · Your workspace, your control
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
