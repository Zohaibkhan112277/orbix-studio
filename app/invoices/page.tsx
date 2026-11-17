
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Client = {
  id: string;
  name: string;
  company: string;
  email: string | null;
};

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  client_id: string | null;
  clients?: {
    name: string;
    company: string;
  } | null;
  invoice_items?: InvoiceItem[];
};

const money = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const statusStyles: Record<string, string> = {
  Draft: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  Sent: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Overdue: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function InvoicesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [clientId, setClientId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");

  const subtotal =
    Math.max(0, Number(quantity) || 0) *
    Math.max(0, Number(unitPrice) || 0);

  const taxAmount = subtotal * (Math.max(0, Number(tax) || 0) / 100);
  const total = subtotal + taxAmount;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError("Please sign in to view your invoices.");
      setLoading(false);
      return;
    }

    setUserId(authData.user.id);

    const [clientResult, invoiceResult] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, company, email")
        .order("created_at", { ascending: false }),

      supabase
        .from("invoices")
        .select(
          "id, invoice_number, issue_date, due_date, status, currency, subtotal, tax, total, notes, client_id, clients(name, company), invoice_items(id, description, quantity, unit_price, amount)"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (clientResult.error) {
      setError(clientResult.error.message);
    } else {
      setClients((clientResult.data || []) as Client[]);
    }

    if (invoiceResult.error) {
      setError(invoiceResult.error.message);
    } else {
      setInvoices((invoiceResult.data || []) as unknown as Invoice[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function resetForm() {
    setClientId("");
    setInvoiceNumber("");
    setDueDate("");
    setDescription("");
    setQuantity("1");
    setUnitPrice("");
    setTax("0");
    setNotes("");
    setShowForm(false);
  }

  async function createInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("Please sign in first.");
      return;
    }

    if (!clientId || !description.trim() || !invoiceNumber.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    if (Number(quantity) <= 0 || Number(unitPrice) < 0) {
      setError("Enter a valid quantity and price.");
      return;
    }

    setSaving(true);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        client_id: clientId,
        invoice_number: invoiceNumber.trim(),
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: dueDate || null,
        status: "Draft",
        currency: "PKR",
        subtotal,
        tax: taxAmount,
        total,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      setError(invoiceError?.message || "Could not create invoice.");
      setSaving(false);
      return;
    }

    const { error: itemError } = await supabase
      .from("invoice_items")
      .insert({
        invoice_id: invoice.id,
        description: description.trim(),
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        amount: subtotal,
      });

    if (itemError) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      setError(itemError.message);
      setSaving(false);
      return;
    }

    setSuccess("Invoice created successfully!");
    resetForm();
    await loadData();
    setSaving(false);
  }

  async function updateStatus(id: string, status: Invoice["status"]) {
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Invoice status updated.");
    await loadData();
  }

  async function deleteInvoice(id: string) {
    if (!window.confirm("Are you sure you want to delete this invoice?")) {
      return;
    }

    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSuccess("Invoice deleted.");
    await loadData();
  }

  function printInvoice(invoice: Invoice) {
    const client = clients.find((c) => c.id === invoice.client_id);

    const safe = (value: string) =>
      value.replace(/[&<>"']/g, (char) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };
        return entities[char];
      });

    const itemRows = (invoice.invoice_items || [])
      .map(
        (item) => `
          <tr>
            <td>${safe(item.description)}</td>
            <td>${item.quantity}</td>
            <td>${money(Number(item.unit_price))}</td>
            <td>${money(Number(item.amount))}</td>
          </tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setError("Please allow pop-ups to print invoices.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${safe(invoice.invoice_number)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
          h1 { font-size: 32px; }
          .muted { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th, td { padding: 14px; border-bottom: 1px solid #ddd; text-align: left; }
          .total { margin-top: 30px; text-align: right; font-size: 20px; }
          .notes { margin-top: 40px; }
        </style>
      </head>
      <body>
        <h1>ORBIX STUDIO</h1>
        <p class="muted">Professional Invoice</p>
        <hr />
        <h2>INVOICE ${safe(invoice.invoice_number)}</h2>
        <p><strong>Client:</strong> ${safe(client?.name || "Client")}</p>
        <p><strong>Company:</strong> ${safe(client?.company || "")}</p>
        <p><strong>Issue Date:</strong> ${safe(invoice.issue_date)}</p>
        <p><strong>Due Date:</strong> ${safe(invoice.due_date || "Not specified")}</p>
        <table>
          <thead>
            <tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div class="total">
          <p>Subtotal: ${money(Number(invoice.subtotal))}</p>
          <p>Tax: ${money(Number(invoice.tax))}</p>
          <h2>Total: ${money(Number(invoice.total))}</h2>
        </div>
        <div class="notes">
          <strong>Notes:</strong>
          <p>${safe(invoice.notes || "Thank you for your business.")}</p>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const term = search.toLowerCase();
    const client = clients.find((c) => c.id === invoice.client_id);

    return (
      invoice.invoice_number.toLowerCase().includes(term) ||
      (client?.name || "").toLowerCase().includes(term) ||
      invoice.status.toLowerCase().includes(term)
    );
  });

  const paidTotal = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);

  const pendingTotal = invoices
    .filter((invoice) => invoice.status === "Sent")
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);

  const outstandingTotal = invoices
    .filter(
      (invoice) =>
        invoice.status === "Sent" || invoice.status === "Overdue"
    )
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);

  return (
    <main className="min-h-screen bg-[#080b14] px-4 py-8 text-white sm:px-8 lg:px-10">
      <div className="fixed right-4 top-4 z-[9999] rounded-lg bg-green-600 p-3 text-white">
  INVOICE ROUTE LOADED
</div>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
              Orbix Studio / Finance
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Invoices
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Create, manage and track your client payments.
            </p>
          </div>

          <button
            onClick={() => {
              setError("");
              setSuccess("");
              setShowForm(!showForm);
            }}
            className="rounded-xl bg-violet-600 px-6 py-3 font-semibold shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"
          >
            {showForm ? "Close Form" : "+ Create Invoice"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Invoices", value: invoices.length.toString() },
            { label: "Paid Revenue", value: money(paidTotal) },
            { label: "Sent Invoices", value: money(pendingTotal) },
            { label: "Outstanding", value: money(outstandingTotal) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/[0.07] bg-[#111725] p-5"
            >
              <p className="text-sm text-slate-400">{stat.label}</p>
              <p className="mt-3 break-words text-2xl font-bold">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {showForm && (
          <form
            onSubmit={createInvoice}
            className="mb-8 rounded-2xl border border-violet-500/20 bg-[#111725] p-5 sm:p-7"
          >
            <h2 className="mb-6 text-xl font-bold">Create New Invoice</h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Invoice Number *
                </label>
                <input
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-001"
                  className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Select Client *
                </label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 outline-none focus:border-violet-500"
                >
                  <option value="">Choose a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} — {client.company}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="mt-2 text-xs text-amber-300">
                    Add a client first from your Clients page.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Service / Description *
                </label>
                <input
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Website development"
                  className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Unit Price (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="10000"
                  className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Tax (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Notes
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Thank you for your business"
                  className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-[#080b14] p-5">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="mt-3 flex justify-between text-sm text-slate-400">
                <span>Tax</span>
                <span>{money(taxAmount)}</span>
              </div>
              <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-lg font-bold">
                <span>Total</span>
                <span className="text-violet-300">{money(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || clients.length === 0}
              className="mt-6 w-full rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Creating..." : "Save Invoice"}
            </button>
          </form>
        )}

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111725]">
          <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold">All Invoices</h2>
              <p className="mt-1 text-sm text-slate-400">
                Your invoice history and payment status.
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none focus:border-violet-500 sm:max-w-xs"
            />
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              Loading invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl">
                $
              </div>
              <h3 className="text-lg font-semibold">No invoices found</h3>
              <p className="mt-2 text-sm text-slate-400">
                Create your first invoice to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Client</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredInvoices.map((invoice) => {
                    const client = clients.find(
                      (c) => c.id === invoice.client_id
                    );

                    return (
                      <tr key={invoice.id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-5 font-semibold">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-5 py-5">
                          <p>{client?.name || "Unknown client"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {client?.company || ""}
                          </p>
                        </td>
                        <td className="px-5 py-5 text-slate-400">
                          {invoice.issue_date}
                        </td>
                        <td className="px-5 py-5 font-semibold">
                          {money(Number(invoice.total))}
                        </td>
                        <td className="px-5 py-5">
                          <select
                            value={invoice.status}
                            onChange={(e) =>
                              updateStatus(
                                invoice.id,
                                e.target.value as Invoice["status"]
                              )
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none ${statusStyles[invoice.status]}`}
                          >
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Paid">Paid</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        </td>
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => printInvoice(invoice)}
                              className="font-medium text-violet-300 hover:text-violet-200"
                            >
                              Print
                            </button>
                            <button
                              onClick={() => deleteInvoice(invoice.id)}
                              className="font-medium text-rose-400 hover:text-rose-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-white/[0.06] py-6 text-center text-xs text-slate-500">
          © 2026 Orbix Studio. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
