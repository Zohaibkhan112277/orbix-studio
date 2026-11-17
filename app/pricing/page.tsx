"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Section = "Overview" | "Projects" | "Clients" | "Invoices" | "Analytics";

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");
  const [isPro, setIsPro] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("Overview");

  useEffect(() => {
    async function getUserData() {
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

      // Supabase profiles table se is_pro status check karna
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("id", user.id)
        .single();

      if (profile && profile.is_pro) {
        setIsPro(true);
      }

      setLoading(false);
    }
    getUserData();
  }, [supabase, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090a0d] text-amber-200">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-sm tracking-[0.25em]">LOADING ORBIX STUDIO...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0d] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#111217] p-6 hidden md:flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-8 rounded-xl bg-amber-400 flex items-center justify-center font-bold text-black text-sm">
              OS
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide">Orbix Studio</h1>
              <p className="text-[10px] text-zinc-400">Workspace Dashboard</p>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { label: "Overview", icon: "⌂" },
              { label: "Projects", icon: "▦" },
              { label: "Clients", icon: "♙" },
              { label: "Invoices", icon: "▤" },
              { label: "Analytics", icon: "⌁" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.label === "Invoices") {
                    router.push("/invoices");
                    return;
                  }
                  setActiveSection(item.label as Section);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium transition ${
                  activeSection === item.label
                    ? "bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/10"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}

            <button
              onClick={() => router.push("/pricing")}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-amber-400 border border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10 transition mt-4"
            >
              <span>✦</span>
              Pricing & Pro Plans
            </button>
          </nav>
        </div>

        {/* User Pro Status Box */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400">Account Plan</span>
            {isPro ? (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold text-black">PRO</span>
            ) : (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">FREE</span>
            )}
          </div>
          <p className="text-xs font-semibold truncate">{userName}</p>
          {!isPro && (
            <button
              onClick={() => router.push("/pricing")}
              className="mt-3 w-full rounded-lg bg-amber-400 py-1.5 text-[11px] font-bold text-black transition hover:brightness-110"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex items-center justify-between pb-6 border-b border-white/10 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back, {userName}!</h2>
            <p className="text-xs text-zinc-400 mt-1">Here is what is happening in your studio today.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Section View */}
        <div className="rounded-3xl border border-white/10 bg-[#111217] p-8">
          <h3 className="text-lg font-bold mb-4">{activeSection} Dashboard</h3>
          <p className="text-sm text-zinc-400">
            You are currently viewing the {activeSection.toLowerCase()} section of Orbix Studio. 
            {isPro ? " You have full access to all Pro features!" : " Upgrade to Pro to unlock unlimited power."}
          </p>

          {!isPro && (
            <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-amber-300 text-sm">Unlock Orbix Studio Pro</h4>
                <p className="text-xs text-zinc-300 mt-1">Get unlimited projects, advanced analytics, and priority support.</p>
              </div>
              <button
                onClick={() => router.push("/pricing")}
                className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/10 transition hover:brightness-110 shrink-0"
              >
                View Plans (PKR / USD)
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}