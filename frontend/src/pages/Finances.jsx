import { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout";
import { getAppointments } from "../services/api";
import { supabase } from "../services/supabase";
import "../styles/Finances.css";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const categories = ["Advertising", "Auto and mileage", "Bank and payment fees", "Business insurance", "Contract labor", "Education and training", "Equipment", "Meals", "Office supplies", "Professional services", "Rent and utilities", "Repairs and maintenance", "Software and subscriptions", "Travel", "Other"];
const emptyForm = { expense_date: new Date().toISOString().slice(0, 10), vendor: "", description: "", category: "Other", amount: "", business_use_percent: "100", deductible: true, payment_method: "", notes: "" };
const palette = ["#2463a6", "#d97706", "#16836b", "#b83280", "#7048a8", "#c24135", "#64748b", "#8b7a16", "#0e7490", "#6d4c41", "#4d7c0f", "#a21caf"];
const amountOf = (value) => Number(String(value ?? 0).replace(/[$,]/g, "")) || 0;
const dateLabel = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString() : "—";
const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

function Finances() {
  const [tab, setTab] = useState("income");
  const [appointments, setAppointments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("year");
  const [groupBy, setGroupBy] = useState("month");
  const [sortOrder, setSortOrder] = useState("amount-desc");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true); setError("");
    try {
      const [appointmentRows, expenseResult] = await Promise.all([
        getAppointments(),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      ]);
      if (expenseResult.error) throw expenseResult.error;
      setAppointments(appointmentRows || []);
      setExpenses(expenseResult.data || []);
    } catch (err) {
      console.error("Failed to load financial data:", err);
      setError(err.message || "Unable to load financial records.");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const range = useMemo(() => {
    const today = new Date();
    if (period === "year") return { start: `${today.getFullYear()}-01-01`, end: today.toISOString().slice(0, 10) };
    if (period === "12months") return { start: new Date(today.getFullYear(), today.getMonth() - 11, 1).toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
    return { start: "", end: "9999-12-31" };
  }, [period]);

  const incomeRows = useMemo(() => {
    const groups = new Map();
    appointments.filter((a) => a.status?.toLowerCase() !== "cancelled" && amountOf(a.payment) > 0 && (!range.start || String(a.start_time).slice(0, 10) >= range.start) && String(a.start_time).slice(0, 10) <= range.end)
      .forEach((a) => {
        const date = new Date(a.start_time);
        let labels;
        switch (groupBy) {
          case "year": labels = [String(date.getFullYear())]; break;
          case "client": labels = [a.client?.name || "Unknown client"]; break;
          case "type": labels = [a.client?.type || "Unknown client type"]; break;
          case "city": labels = [a.client_address?.city || a.client?.city || "No town recorded"]; break;
          case "zip": labels = [a.client_address?.zip || a.client?.zip || "No ZIP code"]; break;
          case "payment": labels = [a.payment_type || "Unspecified payment type"]; break;
          case "service": labels = [[...new Set((a.appointment_pianos || []).map((p) => p.service?.trim()).filter(Boolean))].join(", ") || "No service recorded"]; break;
          default: labels = [date.toLocaleDateString("en-US", { month: "long", year: "numeric" })];
        }
        labels.forEach((label) => {
          const key = groupBy === "month" ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : label;
          const row = groups.get(key) || { label, amount: 0, count: 0, sortKey: key };
          row.amount += amountOf(a.payment) / labels.length; row.count += 1 / labels.length; groups.set(key, row);
        });
      });
    return [...groups.values()].sort((a, b) => {
      if (sortOrder === "amount-desc") return b.amount - a.amount;
      if (sortOrder === "amount-asc") return a.amount - b.amount;
      if (sortOrder === "label-desc") return b.label.localeCompare(a.label);
      if (sortOrder === "label-asc") return a.label.localeCompare(b.label);
      return String(b.sortKey).localeCompare(String(a.sortKey));
    });
  }, [appointments, range, groupBy, sortOrder]);

  const visibleExpenses = useMemo(() => expenses.filter((e) =>
    (!range.start || e.expense_date >= range.start) && e.expense_date <= range.end &&
    `${e.vendor} ${e.description} ${e.category} ${e.notes}`.toLowerCase().includes(search.toLowerCase())
  ), [expenses, range, search]);

  const incomeTotal = useMemo(() => appointments.filter((a) =>
    a.status?.toLowerCase() !== "cancelled" && amountOf(a.payment) > 0 &&
    (!range.start || String(a.start_time).slice(0, 10) >= range.start) && String(a.start_time).slice(0, 10) <= range.end
  ).reduce((sum, a) => sum + amountOf(a.payment), 0), [appointments, range]);
  const expenseTotal = visibleExpenses.reduce((sum, e) => sum + amountOf(e.amount), 0);
  const deductibleTotal = visibleExpenses.reduce((sum, e) => sum + (e.deductible ? amountOf(e.amount) * Math.min(100, Math.max(0, Number(e.business_use_percent ?? 100))) / 100 : 0), 0);
  const pieTotal = incomeRows.reduce((sum, row) => sum + row.amount, 0);
  let cursor = 0;
  const pieStops = incomeRows.map((row, i) => { const start = cursor; cursor += pieTotal ? row.amount / pieTotal * 100 : 0; return `${palette[i % palette.length]} ${start}% ${cursor}%`; }).join(", ");
  const cashflowRows = useMemo(() => [
    ...appointments.filter((a) => a.status?.toLowerCase() !== "cancelled" && amountOf(a.payment) > 0 && (!range.start || String(a.start_time).slice(0, 10) >= range.start) && String(a.start_time).slice(0, 10) <= range.end)
      .map((a) => ({ date: String(a.start_time).slice(0, 10), description: a.client?.name ? `Appointment — ${a.client.name}` : "Appointment income", category: "Income", income: amountOf(a.payment), expense: 0, kind: "income" })),
    ...visibleExpenses.map((e) => ({ date: e.expense_date, description: [e.vendor, e.description].filter(Boolean).join(" — ") || e.category, category: e.category, income: 0, expense: amountOf(e.amount), kind: "expense" })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [appointments, visibleExpenses, range]);

  function startNew() { setEditing(null); setForm({ ...emptyForm, expense_date: new Date().toISOString().slice(0, 10) }); setReceiptFile(null); setShowForm(true); }
  function startEdit(expense) { setEditing(expense); setForm({ ...emptyForm, ...expense, amount: String(expense.amount), business_use_percent: String(expense.business_use_percent ?? 100), deductible: expense.deductible ?? true }); setReceiptFile(null); setShowForm(true); }

  async function saveExpense(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const payload = { ...form, amount: Number(form.amount), business_use_percent: Number(form.business_use_percent), owner_id: user.id, updated_at: new Date().toISOString() };
      delete payload.id; delete payload.created_at; delete payload.receipt_path; delete payload.receipt_name; delete payload.receipt_type;
      let result;
      if (editing) result = await supabase.from("expenses").update(payload).eq("id", editing.id).select().single();
      else result = await supabase.from("expenses").insert(payload).select().single();
      if (result.error) throw result.error;
      let receiptFields = {};
      if (receiptFile) {
        const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
        if (!allowed.includes(receiptFile.type)) throw new Error("Receipt must be a PDF, JPG, PNG, WebP, or HEIC image.");
        if (receiptFile.size > 12 * 1024 * 1024) throw new Error("Receipt files must be 12 MB or smaller.");
        if (editing?.receipt_path) await supabase.storage.from("expense-receipts").remove([editing.receipt_path]);
        const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${result.data.id}/${Date.now()}-${safeName}`;
        const upload = await supabase.storage.from("expense-receipts").upload(path, receiptFile, { contentType: receiptFile.type, upsert: false });
        if (upload.error) throw upload.error;
        receiptFields = { receipt_path: path, receipt_name: receiptFile.name, receipt_type: receiptFile.type };
        const update = await supabase.from("expenses").update(receiptFields).eq("id", result.data.id);
        if (update.error) throw update.error;
      }
      setShowForm(false); setEditing(null); await loadData();
    } catch (err) { console.error("Could not save expense:", err); setError(err.message || "Could not save expense."); }
    finally { setSaving(false); }
  }

  async function openReceipt(expense) {
    if (!expense.receipt_path) return;
    const { data, error: receiptError } = await supabase.storage.from("expense-receipts").createSignedUrl(expense.receipt_path, 60);
    if (receiptError) { setError(receiptError.message); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteExpense(expense) {
    if (!window.confirm(`Delete the expense “${expense.vendor || expense.description || expense.category}”?`)) return;
    setError("");
    try {
      if (expense.receipt_path) {
        const { error: storageError } = await supabase.storage.from("expense-receipts").remove([expense.receipt_path]);
        if (storageError) throw storageError;
      }
      const { error: deleteError } = await supabase.from("expenses").delete().eq("id", expense.id);
      if (deleteError) throw deleteError;
      await loadData();
    } catch (err) { setError(err.message || "Could not delete expense."); }
  }

  function exportExpenses() {
    downloadCsv("schedapp-expenses.csv", [["Date", "Vendor", "Description", "Category", "Amount", "Business use %", "Potential deductible amount", "Deductible flag", "Payment method", "Notes", "Receipt filename"],
      ...visibleExpenses.map((e) => [e.expense_date, e.vendor, e.description, e.category, e.amount, e.business_use_percent, e.deductible ? amountOf(e.amount) * Number(e.business_use_percent ?? 100) / 100 : 0, e.deductible ? "Yes" : "No", e.payment_method, e.notes, e.receipt_name])]);
  }
  function exportCashflow() {
    downloadCsv("schedapp-cash-flow.csv", [["Date", "Description", "Category", "Income", "Expense", "Net"], ...cashflowRows.map((r) => [r.date, r.description, r.category, r.income, r.expense, r.income - r.expense])]);
  }

  return <PageLayout title="Finances">
    <div className="finances">
      <div className="finances-tabs" role="tablist" aria-label="Financial reports">
        {["income", "expenses", "cashflow"].map((key) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{key === "cashflow" ? "Cash Flow" : key[0].toUpperCase() + key.slice(1)}</button>)}
      </div>
      <div className="finances-toolbar">
        <label>Period<select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="year">This year</option><option value="12months">Last 12 months</option><option value="all">All time</option></select></label>
        {tab === "income" && <><label>Group by<select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}><option value="month">Month</option><option value="year">Year</option><option value="type">Client type</option><option value="city">Town / city</option><option value="zip">ZIP code</option><option value="service">Service type</option><option value="client">Client</option><option value="payment">Payment type</option></select></label><label>Sort order<select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}><option value="amount-desc">Amount: high to low</option><option value="amount-asc">Amount: low to high</option><option value="label-asc">Name: A to Z</option><option value="label-desc">Name: Z to A</option><option value="date-desc">Date: newest first</option></select></label></>}
        {tab === "expenses" && <><label className="finances-search">Search<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Vendor, category, notes…" /></label><button className="finances-primary" type="button" onClick={startNew}>+ Add expense</button><button type="button" onClick={exportExpenses}>Export CSV</button></>}
        {tab === "cashflow" && <button type="button" onClick={exportCashflow}>Export CSV</button>}
      </div>
      {error && <div className="finances-error" role="alert">{error}</div>}
      {loading ? <div className="finances-empty">Loading financial records…</div> : <>
        {tab === "income" && <><div className="finances-metrics"><article><span>Recorded income</span><strong>{currency.format(incomeTotal)}</strong><small>Cancelled appointments excluded</small></article><article><span>Paid appointments</span><strong>{appointments.filter((a) => a.status?.toLowerCase() !== "cancelled" && amountOf(a.payment) > 0 && (!range.start || String(a.start_time).slice(0, 10) >= range.start) && String(a.start_time).slice(0, 10) <= range.end).length}</strong><small>Based on appointment dates</small></article></div>
          <section className="finances-panel"><h2>Income by {({ month: "month", year: "year", type: "client type", city: "town / city", zip: "ZIP code", service: "service", client: "client", payment: "payment type" })[groupBy]}</h2>
            {incomeRows.length ? <><div className="finances-chart-layout">{["month", "year"].includes(groupBy) ? <div className="finances-line-chart"><svg viewBox={`0 0 720 240`} role="img" aria-label="Income trend chart"><line x1="56" x2="700" y1="196" y2="196" className="finances-axis"/><line x1="56" x2="700" y1="130" y2="130" className="finances-grid"/><line x1="56" x2="700" y1="64" y2="64" className="finances-grid"/><polyline points={incomeRows.slice().reverse().map((r, i, arr) => `${70 + (arr.length <= 1 ? 0 : i * 620 / (arr.length - 1))},${190 - (r.amount / Math.max(1, ...incomeRows.map(x => x.amount))) * 150}`).join(" ")} className="finances-line"/>{incomeRows.slice().reverse().map((r, i, arr) => <g key={r.sortKey}><circle cx={70 + (arr.length <= 1 ? 0 : i * 620 / (arr.length - 1))} cy={190 - (r.amount / Math.max(1, ...incomeRows.map(x => x.amount))) * 150} r="4" className="finances-point"/><text x={70 + (arr.length <= 1 ? 0 : i * 620 / (arr.length - 1))} y="218" textAnchor="middle" className="finances-chart-label">{r.label.slice(0, 10)}</text></g>)}</svg></div> : <div className="finances-pie-wrap"><div className="finances-pie" style={{ background: `conic-gradient(${pieStops})` }} role="img" aria-label={`Income breakdown by ${groupBy}`}><div><strong>{currency.format(pieTotal)}</strong><span>Total</span></div></div></div>}
              <div className="finances-breakdown">{incomeRows.map((r, i) => <div className="finances-breakdown-row" key={r.sortKey}><span className="finances-dot" style={{ background: palette[i % palette.length] }} /><div><strong>{r.label}</strong><small>{r.count.toLocaleString(undefined, { maximumFractionDigits: 1 })} appointment{r.count === 1 ? "" : "s"} · {pieTotal ? (r.amount / pieTotal * 100).toFixed(1) : "0.0"}%</small></div><b>{currency.format(r.amount)}</b></div>)}</div></div></> : <p className="finances-empty">No recorded income for this period.</p>}
          </section></>}
        {tab === "expenses" && <><div className="finances-metrics"><article><span>Total expenses</span><strong>{currency.format(expenseTotal)}</strong><small>{visibleExpenses.length} records in this period</small></article><article><span>Potential deductible total</span><strong>{currency.format(deductibleTotal)}</strong><small>Based on your deductible flag and business-use percentage; confirm with your tax professional.</small></article></div>
          <section className="finances-panel"><h2>Expense ledger</h2>{visibleExpenses.length ? <div className="finances-expense-list">{visibleExpenses.map((e) => <article className="finances-expense" key={e.id}><div className="finances-expense-main"><strong>{e.vendor || e.description || e.category}</strong><span>{dateLabel(e.expense_date)} · {e.category}</span>{e.description && e.vendor && <p>{e.description}</p>}{e.notes && <p>{e.notes}</p>}<small>{e.deductible ? `Potentially deductible · ${e.business_use_percent ?? 100}% business use` : "Marked non-deductible"}{e.receipt_name ? ` · Receipt: ${e.receipt_name}` : " · No receipt attached"}</small></div><div className="finances-expense-actions"><strong>{currency.format(amountOf(e.amount))}</strong>{e.receipt_path && <button type="button" onClick={() => openReceipt(e)}>View receipt</button>}<button type="button" onClick={() => startEdit(e)}>Edit</button><button type="button" className="finances-danger" onClick={() => deleteExpense(e)}>Delete</button></div></article>)}</div> : <p className="finances-empty">No expenses found for this period. Add your first expense to start your ledger.</p>}</section></>}
        {tab === "cashflow" && <><div className="finances-metrics"><article><span>Income</span><strong>{currency.format(incomeTotal)}</strong><small>Recorded appointment payments</small></article><article><span>Expenses</span><strong>{currency.format(expenseTotal)}</strong><small>Recorded expenses</small></article><article><span>Net cash flow</span><strong className={incomeTotal - expenseTotal < 0 ? "is-negative" : ""}>{currency.format(incomeTotal - expenseTotal)}</strong><small>Income minus expenses; not a bank balance</small></article></div>
          <section className="finances-panel"><div className="finances-panel-heading"><h2>Cash flow ledger</h2><span>Newest first</span></div>{cashflowRows.length ? <div className="finances-table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Income</th><th>Expense</th><th>Net</th></tr></thead><tbody>{cashflowRows.map((r, i) => <tr key={`${r.kind}-${r.date}-${i}`}><td>{dateLabel(r.date)}</td><td>{r.description}</td><td>{r.category}</td><td>{r.income ? currency.format(r.income) : "—"}</td><td>{r.expense ? currency.format(r.expense) : "—"}</td><td className={r.income - r.expense < 0 ? "is-negative" : ""}>{currency.format(r.income - r.expense)}</td></tr>)}</tbody></table></div> : <p className="finances-empty">No income or expenses in this period.</p>}</section></>}
      </>}
      {showForm && <div className="finances-modal-backdrop" role="presentation"><section className="finances-modal" role="dialog" aria-modal="true" aria-labelledby="expense-form-title"><div className="finances-modal-header"><h2 id="expense-form-title">{editing ? "Edit expense" : "Add expense"}</h2><button type="button" onClick={() => setShowForm(false)} aria-label="Close">×</button></div><form onSubmit={saveExpense}><div className="finances-form-grid">
        <label>Date<input type="date" required value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })}/></label>
        <label>Amount ($)<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}/></label>
        <label>Vendor<input value={form.vendor || ""} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Store or supplier"/></label>
        <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="finances-form-wide">Description<input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was purchased?"/></label>
        <label>Business use (%)<input type="number" min="0" max="100" step="1" value={form.business_use_percent} onChange={(e) => setForm({ ...form, business_use_percent: e.target.value })}/></label>
        <label>Payment method<input value={form.payment_method || ""} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="Card, cash, etc."/></label>
        <label className="finances-form-wide">Notes<input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Tax notes or business purpose"/></label>
        <label className="finances-check"><input type="checkbox" checked={Boolean(form.deductible)} onChange={(e) => setForm({ ...form, deductible: e.target.checked })}/> Mark as potentially deductible</label>
        <label className="finances-form-wide">Receipt (PDF, JPG, PNG, WebP, HEIC; max 12 MB)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}/>{editing?.receipt_name && !receiptFile && <small>Current receipt: {editing.receipt_name}</small>}</label>
      </div><div className="finances-modal-actions"><button type="button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="finances-primary" disabled={saving}>{saving ? "Saving…" : "Save expense"}</button></div></form></section></div>}
    </div>
  </PageLayout>;
}

export default Finances;
