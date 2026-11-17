"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function PricingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    async function checkAuth() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.replace("/login");
        return;
      }
      setUserName(
        user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User"
      );
      setLoading(false);
    }
    checkAuth();
  }, [supabase, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090a0d] text-amber-200">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-sm tracking-[0.25em]">ORBIX STUDIO</p>
        </div>
      </main>
    );
  }

  const whatsappNumber = "923000000000"; // Apna WhatsApp number yahan likhein
  const localMessage = encodeURIComponent(
    `Hello! Main Orbix Studio ka Local Pro Plan (PKR 2,500) kharidna chahta hoon. Mera naam ${userName} hai.`
  );
  const globalMessage = encodeURIComponent(
    `Hello! Main Orbix Studio ka International Pro Plan ($9) kharidna chahta hoon. Mera naam ${userName} hai.`
  );

  return (
    <main className="min-h-screen bg-[#090a0d] px-4 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-amber-400 hover:underline mb-4 inline-block"
          >
            ← Back to Dashboard
          </button>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
            Orbix Studio Global Pricing
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Choose Your Workspace Plan
          </h1>
          <p className="mt-3 text-sm text-zinc-400 max-w-lg mx-auto">
            Flexible pricing for local professionals and international agencies.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {/* Free Starter Plan */}
          <div className="rounded-3xl border border-white/10 bg-[#111217] p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Starter</p>
              <h3 className="mt-2 text-2xl font-bold">Free Plan</h3>
              <p className="mt-2 text-xs text-zinc-400">For trying out the dashboard.</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">$0</span>
                <span className="text-xs text-zinc-500">/ forever</span>
              </div>

              <ul className="mt-8 space-y-4 text-sm text-zinc-300">
                <li className="flex items-center gap-3">
                  <span className="text-amber-400">✓</span> Basic Dashboard
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-amber-400">✓</span> Manage Clients & Projects
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-amber-400">✓</span> Standard Invoices
                </li>
              </ul>
            </div>

            <button
              onClick={() => router.push("/")}
              className="mt-10 w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-xs font-bold text-zinc-300 transition hover:bg-white/[0.08]"
            >
              Current Plan
            </button>
          </div>

          {/* Pakistan Local Pro Plan */}
          <div className="rounded-3xl border border-white/10 bg-[#111217] p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-sky-400 font-semibold">Pakistan Only</p>
              <h3 className="mt-2 text-2xl font-bold">Local Pro</h3>
              <p className="mt-2 text-xs text-zinc-400">For Pakistani freelancers & agencies.</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">PKR 2,500</span>
                <span className="text-xs text-zinc-500">/ month</span>
              </div>

              <ul className="mt-8 space-y-4 text-sm text-zinc-300">
                <li className="flex items-center gap-3">
                  <span className="text-amber-400">✓</span> Unlimited Clients & Projects
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-amber-400">✓</span> Unlimited Invoices & PDF Print
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-amber-400">✓</span> JazzCash / EasyPaisa / Bank
                </li>
              </ul>
            </div>

            <a
              href={`https://wa.me/${whatsappNumber}?text=${localMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 block text-center rounded-xl border border-sky-400/40 bg-sky-400/10 py-3 text-xs font-bold text-sky-300 transition hover:bg-sky-400/20"
            >
              Pay via JazzCash / WhatsApp
            </a>
          </div>

          {/* International Pro Plan */}
          <div className="relative rounded-3xl border border-amber-400/40 bg-gradient-to-b from-amber-400/[0.08] to-[#111217] p-8 flex flex-col justify-between shadow-2xl shadow-amber-500/5">
            <div className="absolute -top-3 right-8 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
              Global
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-amber-400 font-semibold">International</p>
              <h3 className="mt-2 text-2xl font-bold">Global Pro</h3>
              <p className="mt-2 text-xs text-zinc-400">For international clients & agencies.</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">$9</span>
                <span className="text-xs text-zinc-400">/ month</span>
              </div>

              <ul className="mt-8 space-y-4 text-sm text-zinc-200">
                <li className="flex items-center gap-3">
                  <span className="text-amber-400">✓</span> Unlimited Everything
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-amber-400">✓</span> Custom Invoice Branding
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-amber-400">✓</span> Credit Card / PayPal Support
                </li>
              </ul>
            </div>

            <a
              href={`https://wa.me/${whatsappNumber}?text=${globalMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 block text-center rounded-xl bg-gradient-to-r from-amber-200 to-amber-500 py-3 text-xs font-bold text-black shadow-lg shadow-amber-500/20 transition hover:brightness-110"
            >
              Upgrade via Card / Global
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}