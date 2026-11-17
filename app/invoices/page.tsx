"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Invoice = {
  id: string;
  client_name: string;
  project_name: string;
  total: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  due_date: string;
  created_at: string;
  user_id?: string;
};

export default function InvoicesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [total, setTotal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<Invoice["status"]>("Sent");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadInvoices() {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setInvoices(data || []);
      }
      setLoading(false);
    }
    loadInvoices();
  }, [supabase, router]);

  async function createInvoice() {
    if (!clientName.trim() || !projectName.trim() || !total) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("invoices")
      .insert({
        client_name: clientName.trim(),
        project_name: projectName.trim(),
        total: Number(total),
        status,
        due_date: dueDate || new Date().toISOString().split("T")[0],
        user_id: user.id,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setInvoices([data, ...invoices]);
    setShowModal(false);
    setClientName("");
    setProjectName("");
    setTotal("");
    setDueDate("");
    setSaving(false);
  }

  async function deleteInvoice(id: string) {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;

    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }

    setInvoices(invoices.filter((inv) => inv.id !== id));
  }

  function printInvoice(invoice: Invoice) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoice.client_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #c49b54; }
            .invoice-details { margin-top: 30px; }
            table { width: 100%; margin-top: 30px; border-collapse: collapse; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f9f9f9; }
            .total { margin-top: 30px; text-align: right; font-size: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">ORBIX STUDIO</div>
              <p>Professional Agency Workspace</p>
            </div>
            <div>
              <h2>INVOICE</h2>
              <p>Status: <b>${invoice.status}</b></p>
              <p>Due Date: ${invoice.due_date}</p>
            </div>
          </div>
          <div class="invoice-details">
            <h3>Billed To:</h3>
            <p><b>Client:</b> ${invoice.client_name}</p>
            <p><b>Project:</b> ${invoice.project_name}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Professional Services (${invoice.project_name})</td>
                <td>$${Number(invoice.total).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <div class="total">
            Total Due: $${Number(invoice.total).toLocaleString()}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090a0d] text-amber-200">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-sm tracking-[0.25em]">LOADING INVOICES...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090a0d] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <button
              onClick={() => router.push("/")}
              className="text-xs text-amber-400 hover:underline mb-2 inline-block"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold sm:text-3xl">Invoice Manager</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Create and manage professional invoices for your clients.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="rounded-xl bg-gradient-to-r from-amber-200 to-amber-500 px-4 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/10 transition hover:brightness-110"
            >
              + Create Invoice
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {invoices.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#111217] p-12 text-center text-zinc-500">
              No invoices found. Create your first professional invoice!
            </div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#111217] p-5 transition hover:border-amber-400/30"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-base">{inv.client_name}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        inv.status === "Paid"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : inv.status === "Sent"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Project: <span className="text-white">{inv.project_name}</span> · Due: {inv.due_date}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-400">
                      ${Number(inv.total).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => printInvoice(inv)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    📥 Download PDF
                  </button>
                  <button
                    onClick={() => deleteInvoice(inv.id)}
                    className="text-xs text-zinc-500 hover:text-red-400 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#15161c] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Create New Invoice</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400">Client Name</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400">Project Name</label>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Website Development"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400">Total Amount ($ USD)</label>
                <input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="e.g. 1500"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Invoice["status"])}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(value => !value)}
                className="rounded-xl px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={createInvoice}
                disabled={saving}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}