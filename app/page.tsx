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
  user_id?: string;
};

type Project = {
  id: string;
  project_name: string;
  client_name: string;
  created_at: string;
  status: "Planning" | "In Progress" | "Completed" | "On Hold";
  progress: number;
  user_id?: string;
};

type Invoice = {
  id: string;
  total: number | string | null;
  status: string;
};

type Section = "Overview" | "Projects" | "Clients" | "Analytics";
type ModalType = "client" | "project" | null;

const navItems: { label: Section | "Invoices" | "Pricing"; icon: string }[] = [
  { label: "Overview", icon: "⌂" },
  { label: "Projects", icon: "▦" },
  { label: "Clients", icon: "♙" },
  { label: "Invoices", icon: "▤" },
  { label: "Analytics", icon: "⌁" },
  { label: "Pricing", icon: "★" },
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

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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

function ContentPanel({
  title,
  description,
  action,
  onAction,
  children,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold md:text-3xl">{title}</h2>
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        </div>
        <button
          onClick={onAction}
          className="rounded-xl bg-gradient-to-r from-amber-200 to-amber-500 px-4 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/10 transition hover:brightness-110"
        >
          {action}
        </button>
      </div>
      {children}
    </div>
  );
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

      setUserName(
        user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User"
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
            "Workspace data load karne mein masla aaya hai."
        );
        setLoading(false);
        return;
      }

      setClients((clientResult.data || []) as Client[]);
      setProjects((projectResult.data || []) as Project[]);

      if (!invoiceResult.error) {
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
      setError("Please enter client name and company.");
      return;
    }

    if (modal === "project" && (!projectName.trim() || !projectClient.trim())) {
      setError("Please enter project name and select a client.");
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

    setProjects((previous) =>
      previous.map((project) =>
        project.id === projectId ? { ...project, ...updates } : project
      )
    );

    const { error: updateError } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId);

    if (updateError) {
      setError(updateError.message);
    }
  }

  async function deleteClient(client: Client) {
    const hasProjects = projects.some(
      (p) => p.client_name.toLowerCase() === client.company.toLowerCase()
    );

    if (hasProjects) {
      const forceDelete = window.confirm(
        `Warning: ${client.company} has associated projects. Delete anyway?`
      );
      if (!forceDelete) return;
    } else {
      const confirmed = window.confirm(`Delete client ${client.name}?`);
      if (!confirmed) return;
    }

    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("id", client.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setClients((previous) => previous.filter((item) => item.id !== client.id));
  }

  async function deleteProject(project: Project) {
    const confirmed = window.confirm(`Delete project ${project.project_name}?`);
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setProjects((previous) => previous.filter((item) => item.id !== project.id));
  }

  async function logout() {
    await supabase.auth.signOut();
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090a0d] text-amber-200">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-sm tracking-[0.25em]">ORBIX STUDIO</p>
          <p className="mt-2 text-xs text-zinc-500">Loading workspace...</p>
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
              <p className="text-[15px] font-bold tracking-[0.13em]">ORBIX</p>
              <p className="text-[9px] tracking-[0.34em] text-amber-400">STUDIO</p>
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
                  if (item.label === "Pricing") {
                    router.push("/pricing");
                    return;
                  }
                  setSection(item.label as Section);
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
              </button>
            ))}
          </nav>

          <button
            onClick={logout}
            className="mt-auto rounded-xl px-4 py-3 text-left text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-red-300"
          >
            ↗ Sign out
          </button>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-35 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] bg-[#090a0d]/95 px-5 py-5 backdrop-blur-xl md:px-9">
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
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
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
                    <p className="text-sm text-zinc-500">Aapka business data, ek jagah par.</p>
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
                    { label: "Total clients", value: clients.length, icon: "♙", note: "Saved in workspace" },
                    { label: "Total projects", value: projects.length, icon: "▦", note: "Active & completed" },
                    { label: "Completed projects", value: completedProjects, icon: "✓", note: "Finished work" },
                    { label: "Paid revenue", value: formatMoney(paidRevenue), icon: "$", note: "Total earnings" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/[0.07] bg-[#111217] p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500">{stat.label}</p>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300/[0.08] text-lg text-amber-300">
                          {stat.icon}
                        </span>
                      </div>
                      <p className="mt-5 text-2xl font-semibold tracking-tight">{stat.value}</p>
                      <p className="mt-2 text-[11px] text-zinc-600">{stat.note}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {section === "Clients" && (
              <ContentPanel
                title="Client Directory"
                description="Apne clients ko manage karein."
                action="Add client"
                onAction={() => {
                  setError("");
                  setModal("client");
                }}
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredClients.map((client, index) => (
                    <div key={client.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                      <div className="flex items-start justify-between">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold ${avatarColors[index % avatarColors.length]}`}>
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
                      <p className="mt-1 text-xs text-amber-300">{client.company}</p>
                      <p className="mt-4 truncate text-xs text-zinc-500">{client.email || "No email"}</p>
                    </div>
                  ))}
                </div>
              </ContentPanel>
            )}

            {section === "Projects" && (
              <ContentPanel
                title="Project Portfolio"
                description="Apne projects aur unki progress track karein."
                action="New project"
                onAction={() => {
                  setError("");
                  setModal("project");
                }}
              >
                <div className="space-y-3">
                  {filteredProjects.map((project) => (
                    <div key={project.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{project.project_name}</p>
                          <p className="mt-1 text-xs text-zinc-500">{project.client_name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={project.status}
                            onChange={(e) => updateProject(project.id, { status: e.target.value as Project["status"] })}
                            className={`rounded-lg border px-2.5 py-1.5 text-[10px] bg-black text-white ${getStatusColor(project.status)}`}
                          >
                            {projectStatuses.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => deleteProject(project)}
                            className="text-xs text-zinc-600 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={project.progress}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setProjects((prev) =>
                              prev.map((p) => (p.id === project.id ? { ...p, progress: val } : p))
                            );
                          }}
                          onMouseUp={(e) => {
                            const val = Number((e.target as HTMLInputElement).value);
                            updateProject(project.id, { progress: val });
                          }}
                          onTouchEnd={(e) => {
                            const val = Number((e.target as HTMLInputElement).value);
                            updateProject(project.id, { progress: val });
                          }}
                          className="flex-1 accent-amber-400 cursor-pointer"
                        />
                        <span className="w-10 text-right text-[10px] text-zinc-400">{project.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ContentPanel>
            )}
          </div>
        </section>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#15161c] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold">
              {modal === "client" ? "Add New Client" : "Create New Project"}
            </h3>

            {modal === "client" && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs text-zinc-400">Client Name</label>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Ali Khan"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Company Name</label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Email (Optional)</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ali@acme.com"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {modal === "project" && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs text-zinc-400">Project Name</label>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. E-Commerce Redesign"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Select Client Company</label>
                  <select
                    value={projectClient}
                    onChange={(e) => setProjectClient(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  >
                    <option value="">-- Choose client company --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.company}>
                        {c.company} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="rounded-xl px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                disabled={saving}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}