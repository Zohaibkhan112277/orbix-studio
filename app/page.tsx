
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Client = {
  id: string;
  name: string;
  company: string;
  email: string | null;
  created_at: string;
};

type Project = {
  id: string;
  project_name: string;
  client_name: string;
  created_at: string;
  status: "Planning" | "In Progress" | "Completed" | "On Hold";
  progress: number;
};

type Invoice = {
  id: string;
  total: number | string | null;
  status: string;
};

type Section = "Overview" | "Projects" | "Clients" | "Invoices" | "Analytics";
type ModalType = "client" | "project" | null;

const navItems: { label: Section; icon: string }[] = [
  { label: "Overview", icon: "⌂" },
  { label: "Projects", icon: "▦" },
  { label: "Clients", icon: "♙" },
  { label: "Invoices", icon: "▤" },
  { label: "Analytics", icon: "⌁" },
];

const avatarColors = [
  "bg-amber-600",
  "bg-violet-600",
  "bg-sky-600",
  "bg-rose-600",
  "bg-emerald-600",
];

const projectStatuses: Project["status"][] = [
  "Planning",
  "In Progress",
  "Completed",
  "On Hold",
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusColor(status: Project["status"]) {
  switch (status) {
    case "Completed":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "Planning":
      return "border-sky-400/20 bg-sky-400/10 text-sky-300";
    case "On Hold":
      return "border-rose-400/20 bg-rose-400/10 text-rose-300";
    default:
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [section, setSection] = useState<Section>("Overview");
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalType>(null);

  const [clientName, setClientName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectClient, setProjectClient] = useState("");

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email || "");
      setUserName(
        user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User"
      );

      setAvatarUrl(
        user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          ""
      );

      const [clientResult, projectResult, invoiceResult] =
        await Promise.all([
          supabase
            .from("clients")
            .select("id,name,company,email,created_at")
            .order("created_at", { ascending: false }),

          supabase
            .from("projects")
            .select("id,project_name,client_name,created_at,status,progress")
            .order("created_at", { ascending: false }),

          supabase
            .from("invoices")
            .select("id,total,status"),
        ]);

      if (!active) return;

      if (clientResult.error || projectResult.error) {
        setError(
          clientResult.error?.message ||
            projectResult.error?.message ||
            "Could not load your workspace."
        );
        setLoading(false);
        return;
      }

      setClients((clientResult.data || []) as Client[]);
      setProjects((projectResult.data || []) as Project[]);

      if (invoiceResult.error) {
        setInvoices([]);
        setError(
          "Invoice analytics could not load: " +
            invoiceResult.error.message
        );
      } else {
        setInvoices((invoiceResult.data || []) as Invoice[]);
      }

      setLoading(false);
    }

    loadWorkspace();

    return () => {
      active = false;
    };
  }, [supabase, router]);

  async function saveItem() {
    if (saving) return;

    setError("");

    if (modal === "client" && (!clientName.trim() || !company.trim())) {
      setError("Please enter the client name and company.");
      return;
    }

    if (
      modal === "project" &&
      (!projectName.trim() || !projectClient.trim())
    ) {
      setError("Please enter the project name and select a client.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setSaving(false);
      router.replace("/login");
      return;
    }

    if (modal === "client") {
      const { data, error: insertError } = await supabase
        .from("clients")
        .insert({
          name: clientName.trim(),
          company: company.trim(),
          email: email.trim() || null,
          user_id: user.id,
        })
        .select("id,name,company,email,created_at")
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setClients((previous) => [data as Client, ...previous]);
      setClientName("");
      setCompany("");
      setEmail("");
      setSection("Clients");
    }

    if (modal === "project") {
      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          project_name: projectName.trim(),
          client_name: projectClient,
          user_id: user.id,
          status: "In Progress",
          progress: 0,
        })
        .select("id,project_name,client_name,created_at,status,progress")
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setProjects((previous) => [data as Project, ...previous]);
      setProjectName("");
      setProjectClient("");
      setSection("Projects");
    }

    setModal(null);
    setSaving(false);
  }

  async function updateProject(
    projectId: string,
    updates: Partial<Pick<Project, "status" | "progress">>
  ) {
    setError("");

    const { data, error: updateError } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .select("id,project_name,client_name,created_at,status,progress")
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProjects((previous) =>
      previous.map((project) =>
        project.id === projectId ? (data as Project) : project
      )
    );
  }

  async function deleteClient(client: Client) {
    const confirmed = window.confirm(`Delete ${client.name}?`);
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("id", client.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setClients((previous) =>
      previous.filter((item) => item.id !== client.id)
    );
  }

  async function deleteProject(project: Project) {
    const confirmed = window.confirm(
      `Delete ${project.project_name}?`
    );
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setProjects((previous) =>
      previous.filter((item) => item.id !== project.id)
    );
  }

  async function logout() {
    setProfileOpen(false);

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    router.replace("/login");
  }

  const filteredClients = clients.filter((client) =>
    `${client.name} ${client.company} ${client.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredProjects = projects.filter((project) =>
    `${project.project_name} ${project.client_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const completedProjects = projects.filter(
    (project) => project.status === "Completed"
  ).length;

  const paidInvoices = invoices.filter(
    (invoice) => invoice.status.toLowerCase() === "paid"
  );

  const paidRevenue = paidInvoices.reduce(
    (total, invoice) => total + Number(invoice.total || 0),
    0
  );

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status.toLowerCase() !== "paid"
  );

  const outstandingRevenue = unpaidInvoices.reduce(
    (total, invoice) => total + Number(invoice.total || 0),
    0
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090a0d] text-amber-200">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-sm tracking-[0.25em]">ORBIX STUDIO</p>
          <p className="mt-2 text-xs text-zinc-500">
            Preparing your workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090a0d] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0d0e12] px-5 py-7 lg:flex">
          <div className="mb-12 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200 to-amber-600 text-lg font-black text-black">
              O
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-[0.13em]">
                ORBIX
              </p>
              <p className="text-[9px] tracking-[0.34em] text-amber-400">
                STUDIO
              </p>
            </div>
          </div>

          <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
            Workspace
          </p>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.label === "Invoices") {
                    router.push("/invoices");
                    return;
                  }

                  setSection(item.label);
                  setSearch("");
                }}
                className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm transition ${
                  section === item.label
                    ? "border border-amber-400/20 bg-amber-400/[0.09] text-amber-300"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
                {section === item.label && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-amber-300/10 bg-gradient-to-br from-amber-300/[0.08] to-transparent p-4">
            <p className="text-xs font-semibold text-amber-200">
              Your workspace
            </p>
            <p className="mt-2 text-[11px] leading-5 text-zinc-500">
              Your clients and projects are stored in your account.
            </p>
          </div>

          <button
            onClick={logout}
            className="mt-5 rounded-xl px-4 py-3 text-left text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-red-300"
          >
            ↗ Sign out
          </button>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] bg-[#090a0d]/95 px-5 py-5 backdrop-blur-xl md:px-9">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400">
                Orbix / Workspace
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
                {section}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 sm:flex">
                <span className="text-lg text-zinc-500">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search workspace..."
                  className="w-36 bg-transparent text-xs text-white outline-none placeholder:text-zinc-600 md:w-48"
                />
              </div>

              <button
                onClick={() => {
                  setError("");
                  setModal("client");
                }}
                className="rounded-xl bg-gradient-to-r from-amber-200 to-amber-500 px-4 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/10 transition hover:brightness-110"
              >
                + New client
              </button>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-label="Open account menu"
                  aria-expanded={profileOpen}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1.5 pr-3 transition hover:border-amber-400/40 hover:bg-white/[0.07]"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-9 w-9 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-200 to-amber-600 text-xs font-bold text-black">
                      {getInitials(userName)}
                    </div>
                  )}
                  <span className="hidden max-w-28 truncate text-xs font-medium sm:block">
                    {userName}
                  </span>
                  <span className="text-xs text-zinc-500">⌄</span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#15161c] shadow-2xl shadow-black/60">
                    <div className="border-b border-white/[0.07] p-4">
                      <div className="flex items-center gap-3">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Profile"
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200 to-amber-600 font-bold text-black">
                            {getInitials(userName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {userName}
                          </p>
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            {userEmail}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <div className="rounded-xl px-3 py-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                          Account status
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="text-xs text-zinc-300">
                            Signed in
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          setSection("Overview");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        <span className="text-base">♙</span>
                        Account overview
                      </button>

                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs text-red-300 transition hover:bg-red-500/10"
                      >
                        <span className="text-base">↗</span>
                        Sign out
                      </button>
                    </div>

                    <div className="border-t border-white/[0.07] px-4 py-3">
                      <p className="text-[10px] text-zinc-600">
                        Orbix Studio · Your workspace account
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-7 px-5 py-8 pb-24 md:px-9">
            {error && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <span>{error}</span>
                <button onClick={() => setError("")}>✕</button>
              </div>
            )}

            {section === "Overview" && (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-zinc-500">
                      Your business, beautifully organized.
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
                      Welcome, {userName}
                      <span className="text-amber-400">.</span>
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setError("");
                      setModal("project");
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/30 hover:text-amber-300"
                  >
                    + Create project
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Total clients",
                      value: clients.length,
                      icon: "♙",
                      note: "Saved in your workspace",
                    },
                    {
                      label: "Total projects",
                      value: projects.length,
                      icon: "▦",
                      note: "Saved in your workspace",
                    },
                    {
                      label: "Completed projects",
                      value: completedProjects,
                      icon: "✓",
                      note: "Projects marked as completed",
                    },
                    {
                      label: "Total revenue",
                      value: formatMoney(paidRevenue),
                      icon: "$",
                      note: "Revenue from paid invoices",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/[0.07] bg-[#111217] p-5 transition hover:border-amber-400/20"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500">{stat.label}</p>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300/[0.08] text-lg text-amber-300">
                          {stat.icon}
                        </span>
                      </div>
                      <p className="mt-5 break-words text-2xl font-semibold tracking-tight">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-[11px] text-zinc-600">
                        {stat.note}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
                  <div className="rounded-2xl border border-white/[0.07] bg-[#111217] p-5 md:p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Recent projects</h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          Your latest workspace activity
                        </p>
                      </div>
                      <button
                        onClick={() => setSection("Projects")}
                        className="text-xs text-amber-300 hover:text-amber-200"
                      >
                        View all →
                      </button>
                    </div>

                    {projects.length === 0 ? (
                      <EmptyState
                        title="Your first project starts here"
                        description="Create a project and keep your client work organized."
                        action="Create project"
                        onClick={() => setModal("project")}
                      />
                    ) : (
                      <div className="space-y-3">
                        {projects.slice(0, 5).map((project) => (
                          <div
                            key={project.id}
                            className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {project.project_name}
                                </p>
                                <p className="mt-1 truncate text-xs text-zinc-500">
                                  {project.client_name}
                                </p>
                              </div>
                              <span
                                className={`rounded-lg border px-2.5 py-1.5 text-[10px] ${getStatusColor(project.status)}`}
                              >
                                {project.status}
                              </span>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-200 to-amber-500 transition-all"
                                  style={{
                                    width: `${project.progress}%`,
                                  }}
                                />
                              </div>
                              <span className="w-10 text-right text-[10px] text-zinc-400">
                                {project.progress}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-[#111217] p-5 md:p-6">
                    <div className="mb-6">
                      <h3 className="font-semibold">Client directory</h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        Your latest clients
                      </p>
                    </div>

                    {clients.length === 0 ? (
                      <EmptyState
                        title="No clients yet"
                        description="Add your first client to get started."
                        action="Add client"
                        onClick={() => setModal("client")}
                      />
                    ) : (
                      <div className="space-y-4">
                        {clients.slice(0, 5).map((client, index) => (
                          <div key={client.id} className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${avatarColors[index % avatarColors.length]}`}
                            >
                              {getInitials(client.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {client.name}
                              </p>
                              <p className="truncate text-xs text-zinc-500">
                                {client.company}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.07] bg-[#111217] p-5">
                    <p className="text-xs text-zinc-500">Paid invoices</p>
                    <p className="mt-3 text-3xl font-semibold text-emerald-300">
                      {paidInvoices.length}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      Successfully paid invoices
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-[#111217] p-5">
                    <p className="text-xs text-zinc-500">Outstanding payments</p>
                    <p className="mt-3 break-words text-2xl font-semibold text-amber-300">
                      {formatMoney(outstandingRevenue)}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      Invoices not marked as paid
                    </p>
                  </div>
                </div>
              </>
            )}

            {section === "Clients" && (
              <ContentPanel
                title="Client directory"
                description="Manage the relationships behind your business."
                action="Add client"
                onAction={() => {
                  setError("");
                  setModal("client");
                }}
              >
                {filteredClients.length === 0 ? (
                  <EmptyState
                    title="No matching clients"
                    description="Add a client or try another search."
                    action="Add client"
                    onClick={() => setModal("client")}
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredClients.map((client, index) => (
                      <div
                        key={client.id}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold ${avatarColors[index % avatarColors.length]}`}
                          >
                            {getInitials(client.name)}
                          </div>
                          <button
                            onClick={() => deleteClient(client)}
                            className="text-xs text-zinc-600 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                        <h3 className="mt-5 font-semibold">{client.name}</h3>
                        <p className="mt-1 text-xs text-amber-300">
                          {client.company}
                        </p>
                        <p className="mt-4 truncate text-xs text-zinc-500">
                          {client.email || "No email added"}
                        </p>
                        <p className="mt-3 text-[10px] text-zinc-600">
                          Added {formatDate(client.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ContentPanel>
            )}

            {section === "Projects" && (
              <ContentPanel
                title="Project portfolio"
                description="A clear view of every project in your workspace."
                action="New project"
                onAction={() => {
                  setError("");
                  setModal("project");
                }}
              >
                {filteredProjects.length === 0 ? (
                  <EmptyState
                    title="No matching projects"
                    description="Create your first project to get started."
                    action="Create project"
                    onClick={() => setModal("project")}
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold">
                              {project.project_name}
                            </h3>
                            <p className="mt-1 text-xs text-zinc-500">
                              Client: {project.client_name}
                            </p>
                            <p className="mt-2 text-[10px] text-zinc-600">
                              Created {formatDate(project.created_at)}
                            </p>
                          </div>

                          <button
                            onClick={() => deleteProject(project)}
                            className="text-xs text-zinc-600 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-xs text-zinc-400">
                              Project status
                            </label>
                            <select
                              value={project.status}
                              onChange={(event) =>
                                updateProject(project.id, {
                                  status: event.target.value as Project["status"],
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-[#1a1b21] px-4 py-3 text-xs text-white outline-none transition focus:border-amber-400/50"
                            >
                              {projectStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <label className="text-xs text-zinc-400">
                                Project progress
                              </label>
                              <span className="text-xs font-semibold text-amber-300">
                                {project.progress}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={project.progress}
                              onChange={(event) =>
                                updateProject(project.id, {
                                  progress: Number(event.target.value),
                                })
                              }
                              className="w-full cursor-pointer accent-amber-400"
                            />
                            <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
                              <span>0%</span>
                              <span>50%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-200 to-amber-500 transition-all duration-300"
                            style={{
                              width: `${project.progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ContentPanel>
            )}

            {section === "Invoices" && (
              <ContentPanel
                title="Invoice center"
                description="Manage invoices, payments and billing records."
                action="Open invoice manager"
                onAction={() => router.push("/invoices")}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                    <p className="text-xs text-zinc-500">Total invoices</p>
                    <p className="mt-3 text-3xl font-semibold">
                      {invoices.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                    <p className="text-xs text-zinc-500">Paid revenue</p>
                    <p className="mt-3 break-words text-2xl font-semibold text-emerald-300">
                      {formatMoney(paidRevenue)}
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-sm text-zinc-400">
                  Open the invoice manager to create, print, update or delete
                  your invoices.
                </p>
              </ContentPanel>
            )}

            {section === "Analytics" && (
              <ContentPanel
                title="Business intelligence"
                description="Your workspace activity at a glance."
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <AnalyticsCard
                    label="Clients"
                    value={clients.length.toString()}
                    note="Total saved clients"
                  />
                  <AnalyticsCard
                    label="Projects"
                    value={projects.length.toString()}
                    note="Total saved projects"
                  />
                  <AnalyticsCard
                    label="Completed projects"
                    value={completedProjects.toString()}
                    note="Successfully completed projects"
                  />
                  <AnalyticsCard
                    label="Total invoices"
                    value={invoices.length.toString()}
                    note="Invoices in your workspace"
                  />
                  <AnalyticsCard
                    label="Paid revenue"
                    value={formatMoney(paidRevenue)}
                    note="Revenue from paid invoices"
                  />
                  <AnalyticsCard
                    label="Outstanding payments"
                    value={formatMoney(outstandingRevenue)}
                    note="Invoices not marked as paid"
                  />
                </div>
              </ContentPanel>
            )}

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-[10px] text-zinc-600">
              <p>© 2026 Orbix Studio. Built for ambitious businesses.</p>
              <p className="tracking-[0.15em]">CRAFTED WITH PRECISION</p>
            </footer>
          </div>
        </section>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-amber-300/15 bg-[#131419] p-6 shadow-2xl shadow-black/50">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-amber-400">
                  Orbix Studio
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {modal === "client" ? "Add a new client" : "Create a project"}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Save information to your secure workspace.
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-white/5 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {modal === "client" ? (
                <>
                  <Field
                    label="Full name"
                    value={clientName}
                    onChange={setClientName}
                    placeholder="e.g. Alex Morgan"
                  />
                  <Field
                    label="Company"
                    value={company}
                    onChange={setCompany}
                    placeholder="e.g. Vertex Digital"
                  />
                  <Field
                    label="Email address"
                    value={email}
                    onChange={setEmail}
                    placeholder="alex@company.com"
                    type="email"
                  />
                </>
              ) : (
                <>
                  <Field
                    label="Project name"
                    value={projectName}
                    onChange={setProjectName}
                    placeholder="e.g. Website redesign"
                  />
                  <div>
                    <label className="mb-2 block text-xs text-zinc-400">
                      Client
                    </label>
                    <select
                      value={projectClient}
                      onChange={(event) => setProjectClient(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#1a1b21] px-4 py-3 text-sm text-white outline-none focus:border-amber-400/50"
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.company}>
                          {client.company}
                        </option>
                      ))}
                    </select>
                    {clients.length === 0 && (
                      <p className="mt-2 text-[11px] text-amber-300">
                        Add a client first to link it to a project.
                      </p>
                    )}
                  </div>
                </>
              )}

              {error && (
                <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-300">
                  {error}
                </p>
              )}

              <button
                onClick={saveItem}
                disabled={
                  saving || (modal === "project" && clients.length === 0)
                }
                className="w-full rounded-xl bg-gradient-to-r from-amber-200 to-amber-500 py-3.5 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save to workspace"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-white/10 bg-[#101116]/95 py-2 backdrop-blur-xl lg:hidden">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              if (item.label === "Invoices") {
                router.push("/invoices");
                return;
              }

              setSection(item.label);
              setSearch("");
            }}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] ${
              section === item.label ? "text-amber-300" : "text-zinc-500"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </main>
  );
}

function AnalyticsCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-3 break-words text-2xl font-semibold text-amber-300">
        {value}
      </p>
      <p className="mt-2 text-xs text-zinc-600">{note}</p>
    </div>
  );
}

function ContentPanel({
  title,
  description,
  action,
  onAction,
  children,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111217] p-5 md:p-7">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        </div>
        {action && onAction && (
          <button
            onClick={onAction}
            className="rounded-xl bg-gradient-to-r from-amber-200 to-amber-500 px-4 py-2.5 text-xs font-bold text-black transition hover:brightness-110"
          >
            + {action}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
  onClick,
}: {
  title: string;
  description: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-5 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] text-xl text-amber-300">
        ✦
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-xs text-xs leading-5 text-zinc-500">
        {description}
      </p>
      {action && onClick && (
        <button
          onClick={onClick}
          className="mt-4 text-xs font-semibold text-amber-300 hover:text-amber-200"
        >
          + {action}
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/50"
      />
    </div>
  );
}
