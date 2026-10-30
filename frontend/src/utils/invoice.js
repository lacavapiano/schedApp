import html2pdf from "html2pdf.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function formatAddress(address) {
  if (!address) return "";
  const street = [escapeHtml(address.address), address.apt ? `Apt ${escapeHtml(address.apt)}` : null].filter(Boolean).join(", ");
  const locality = [address.city, address.state, address.zip].map(escapeHtml).filter(Boolean).join(", ");
  return [street, locality].filter(Boolean).join("<br>");
}

export function getInvoiceNumber(appointment) {
  return appointment?.invoice?.trim()
    || `INV-${new Date(appointment.start_time).toISOString().slice(0, 10).replaceAll("-", "")}-${String(appointment.id).slice(0, 6).toUpperCase()}`;
}

export function buildInvoiceDocument({ appointment, client, address, charges, settings = {} }) {
  const invoiceNumber = getInvoiceNumber(appointment);
  const pianoById = new Map((appointment.appointment_pianos || []).map((item) => [item.id, item]));
  const lineItems = (charges || []).map((charge) => {
    const piano = pianoById.get(charge.appointment_piano_id);
    const instrument = piano?.piano
      ? [piano.piano.make, piano.piano.model].filter(Boolean).join(" ")
      : "Piano service";
    const serial = piano?.piano?.serial || "";
    const pianoIdentity = [piano?.piano?.make, piano?.piano?.model, serial].filter(Boolean).join(" ");
    const description = [charge.service_name || "Service", pianoIdentity || instrument].filter(Boolean).join(" — ");
    const quantity = charge.pricing_method === "hourly" ? Number(charge.billable_hours || 0) : 1;
    const unit = Number(charge.unit_price || 0);
    const base = Number(charge.base_amount ?? (unit * quantity));
    const discount = Number(charge.discount_amount || 0);
    const total = Number(charge.final_amount ?? (base - discount));
    return `<tr>
      <td><strong>${escapeHtml(description)}</strong>${charge.pricing_method === "hourly" ? `<div class="muted">${quantity.toFixed(2)} hours</div>` : ""}</td>
      <td class="number">${quantity.toFixed(charge.pricing_method === "hourly" ? 2 : 0)}</td>
      <td class="number">${money(unit)}</td>
      <td class="number">${money(base)}</td>
      <td class="number">${discount > 0 ? "−" + money(discount) : "—"}</td>
      <td class="number"><strong>${money(total)}</strong></td>
    </tr>`;
  }).join("");
  const subtotal = (charges || []).reduce((sum, item) => sum + Number(item.base_amount || 0), 0);
  const discountTotal = (charges || []).reduce((sum, item) => sum + Number(item.discount_amount || 0), 0);
  const total = (charges || []).reduce((sum, item) => sum + Number(item.final_amount || 0), 0);
  const paid = Math.max(0, Number(appointment.payment || 0));
  const balance = Math.max(0, total - paid);
  const status = paid >= total ? "Complete" : "Incomplete";
  const issueDate = new Date();
  const dueDays = Math.max(0, Number(settings.invoice_due_days ?? 30));
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + dueDays);
  const businessAddress = settings.business_address || "";
  const businessEmail = settings.business_email || "";
  const businessPhone = settings.business_phone || "";
  const businessContact = [businessAddress, businessEmail, businessPhone].filter(Boolean);
  const customerName = client?.name || appointment.client?.name || "Client";
  const addressHtml = formatAddress(address);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${escapeHtml(invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 36px; color: #202020; background: #f1f1f1; font: 13px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .sheet { width: 100%; max-width: 850px; min-height: 900px; margin: 0 auto; padding: 52px 56px; background: #fff; box-shadow: 0 5px 28px #00000012; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; padding-bottom: 26px; border-bottom: 2px solid #222; }
  .brand { font-size: 23px; font-weight: 750; letter-spacing: -.7px; }
  .business-contact { margin-top: 7px; line-height: 1.65; }
  .invoice-heading { flex: 0 0 auto; min-width: 190px; text-align: right; }
  h1 { margin: -5px 0 7px; font-size: 31px; line-height: 1.15; font-weight: 750; letter-spacing: 1.4px; }
  .invoice-meta { color: #666; font-size: 12px; line-height: 1.8; }
  .invoice-meta strong { color: #202020; font-size: 14px; }
  .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 42px; padding: 30px 0 32px; }
  .label { margin-bottom: 10px; color: #777; font-size: 10px; font-weight: 750; letter-spacing: 1.3px; text-transform: uppercase; }
  .address-name { margin-bottom: 3px; font-size: 15px; font-weight: 700; }
  .muted { color: #707070; font-size: 11px; }
  .service-panel { padding: 14px 16px; border: 1px solid #e2e2e2; border-radius: 4px; background: #fafafa; }
  .service-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
  .service-row + .service-row { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e8e8e8; }
  .service-label { color: #707070; font-size: 11px; }
  .service-value { font-size: 12px; font-weight: 650; text-align: right; }
  .payment-status { display: inline-block; padding: 3px 8px; border: 1px solid #c9c9c9; border-radius: 3px; background: #fff; color: #333; font-size: 9px; font-weight: 750; letter-spacing: .65px; text-transform: uppercase; white-space: nowrap; }
  .items { margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { padding: 10px 7px; border-bottom: 1px solid #222; background: #f5f5f5; color: #555; font-size: 9px; font-weight: 750; letter-spacing: .65px; text-align: left; text-transform: uppercase; }
  td { padding: 13px 7px; border-bottom: 1px solid #e8e8e8; vertical-align: top; font-size: 11px; }
  th:first-child, td:first-child { width: 34%; padding-left: 10px; }
  th:not(:first-child), td:not(:first-child) { width: 13.2%; }
  .number { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals { width: 310px; max-width: 100%; margin: 24px 0 0 auto; font-variant-numeric: tabular-nums; }
  .total-row { display: flex; justify-content: space-between; gap: 20px; padding: 5px 0; }
  .grand { margin-top: 7px; padding: 11px 0 8px; border-top: 1.5px solid #222; font-size: 16px; font-weight: 750; }
  .balance { margin-top: 10px; padding: 12px 14px; border: 1px solid #e2e2e2; border-radius: 4px; background: #f6f6f6; font-size: 15px; font-weight: 750; }
  .balance .total-row { padding: 0; }
  .notes { margin-top: 34px; padding-top: 15px; border-top: 1px solid #e2e2e2; color: #666; font-size: 11px; }
  .notes strong { display: block; margin-bottom: 4px; color: #333; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
  .actions { max-width: 850px; margin: 16px auto; text-align: right; }
  button { padding: 10px 18px; border: 0; border-radius: 4px; background: #202020; color: #fff; font: inherit; cursor: pointer; }
  @media (max-width: 650px) {
    body { padding: 0; background: #fff; }
    .sheet { min-height: 0; padding: 28px 18px; box-shadow: none; }
    .top { gap: 14px; padding-bottom: 20px; }
    .brand { font-size: 18px; }
    .invoice-heading { min-width: 0; }
    h1 { font-size: 24px; }
    .invoice-meta { font-size: 10px; }
    .invoice-meta strong { font-size: 11px; }
    .addresses { gap: 16px; padding: 22px 0; }
    .address-name { font-size: 13px; }
    .service-panel { padding: 11px; }
    .service-row { align-items: flex-start; gap: 8px; }
    .service-value { font-size: 10px; }
    th { font-size: 8px; letter-spacing: 0; }
    th, td { padding: 8px 3px; font-size: 9px; overflow-wrap: anywhere; }
    th:first-child, td:first-child { width: 31%; padding-left: 5px; }
    th:not(:first-child), td:not(:first-child) { width: 13.8%; }
    .totals { width: 100%; max-width: 310px; }
  }
  @media print {
    @page { size: letter; margin: 0.55in; }
    body { padding: 0; background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .sheet { max-width: none; min-height: 0; padding: 0; box-shadow: none; }
    .actions { display: none; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="sheet">
  <header class="top">
    <div><div class="brand">LaCava Piano Service</div>
    ${businessContact.length ? `<div class="muted business-contact">${businessContact.map(escapeHtml).join("<br>")}</div>` : ""}</div>
    <div class="invoice-heading"><h1>INVOICE</h1><div class="invoice-meta"><strong>${escapeHtml(invoiceNumber)}</strong><br>Issued ${formatDate(issueDate)}<br>Due ${formatDate(dueDate)}</div></div>
  </header>
  <section class="addresses">
    <div><div class="label">Bill to</div><div class="address-name">${escapeHtml(customerName)}</div>${addressHtml ? `<div>${addressHtml}</div>` : ""}</div>
    <div><div class="label">Service details</div><div class="service-panel">
      <div class="service-row"><span class="service-label">Service date</span><span class="service-value">${formatDate(appointment.start_time)}</span></div>
      <div class="service-row"><span class="service-label">Payment status</span><span class="payment-status">${status}</span></div>
    </div></div>
  </section>
  <table>
    <thead><tr><th>Description</th><th class="number">Qty</th><th class="number">Rate</th><th class="number">Subtotal</th><th class="number">Discount</th><th class="number">Amount</th></tr></thead>
    <tbody>${lineItems || `<tr><td colspan="6">No saved service charges were found for this appointment. Save the appointment's service pricing before generating an invoice.</td></tr>`}</tbody>
  </table>
  <section class="totals">
    <div class="total-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
    <div class="total-row"><span>Discounts</span><span>−${money(discountTotal)}</span></div>
    <div class="total-row grand"><span>Total</span><span>${money(total)}</span></div>
    <div class="total-row"><span>Payment received</span><span>−${money(paid)}</span></div>
    <div class="balance"><div class="total-row"><span>Balance due</span><span>${money(balance)}</span></div></div>
  </section>
  ${appointment.notes ? `<section class="notes"><strong>Appointment notes</strong>${escapeHtml(appointment.notes)}</section>` : ""}
</div>
<div class="actions"><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
</body>
</html>`;
}

export async function downloadInvoicePdf({ appointment, client, address, charges, settings = {} }) {
  const invoiceNumber = getInvoiceNumber(appointment);
  const invoiceHtml = buildInvoiceDocument({ appointment, client, address, charges, settings });
  const parsed = new DOMParser().parseFromString(invoiceHtml, "text/html");
  const sheet = parsed.querySelector(".sheet");
  const style = parsed.querySelector("style");

  if (!sheet || !style) {
    throw new Error("Unable to prepare the invoice for PDF export.");
  }

  const exportStyle = document.createElement("style");
  exportStyle.textContent = style.textContent;
  document.head.appendChild(exportStyle);

  const exportContainer = document.createElement("div");
  exportContainer.style.position = "fixed";
  exportContainer.style.left = "-10000px";
  exportContainer.style.top = "0";
  exportContainer.style.width = "850px";
  exportContainer.style.background = "#fff";
  exportContainer.appendChild(sheet);
  document.body.appendChild(exportContainer);

  try {
    await html2pdf()
      .set({
        filename: `Invoice-${invoiceNumber}.pdf`,
        margin: [12, 12, 12, 12],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollX: 0, scrollY: 0 },
        jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", " .service-panel", ".totals"] },
      })
      .from(sheet)
      .save();
  } finally {
    exportContainer.remove();
    exportStyle.remove();
  }
}
