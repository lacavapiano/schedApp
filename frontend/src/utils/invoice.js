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
  /* Invoice-only styles: keep PDF generation isolated from the application UI. */
  .sheet, .sheet * { box-sizing: border-box; }
  .sheet {
    width: 100%;
    max-width: 850px;
    min-height: 900px;
    margin: 0 auto;
    padding: 52px 56px;
    color: #1f2933;
    background: #fff;
    font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-shadow: 0 5px 28px #00000012;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  .sheet .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; padding-bottom: 26px; border-bottom: 2px solid #202833; }
  .sheet .brand { color: #111827; font-size: 24px; font-weight: 750; letter-spacing: -.7px; }
  .sheet .business-contact { margin-top: 7px; line-height: 1.65; }
  .sheet .invoice-heading { flex: 0 0 auto; min-width: 190px; text-align: right; }
  .sheet h1 { margin: -5px 0 7px; color: #111827; font-size: 32px; line-height: 1.15; font-weight: 750; letter-spacing: 1.4px; }
  .sheet .invoice-meta { color: #4b5563; font-size: 12px; line-height: 1.8; }
  .sheet .invoice-meta strong { color: #111827; font-size: 14px; }
  .sheet .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 42px; padding: 30px 0 32px; }
  .sheet .label { margin-bottom: 10px; color: #374151; font-size: 11px; font-weight: 750; letter-spacing: 1.1px; text-transform: uppercase; }
  .sheet .address-name { margin-bottom: 3px; color: #111827; font-size: 16px; font-weight: 700; }
  .sheet .muted { color: #4b5563; font-size: 12px; }
  .sheet .service-panel { padding: 14px 16px; border: 1px solid #cbd2d9; border-radius: 4px; background: #f8fafc; }
  .sheet .service-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
  .sheet .service-row + .service-row { margin-top: 10px; padding-top: 10px; border-top: 1px solid #d8dee5; }
  .sheet .service-label { color: #4b5563; font-size: 12px; }
  .sheet .service-value { color: #1f2933; font-size: 13px; font-weight: 650; text-align: right; }
  .sheet .payment-status { display: inline-block; padding: 3px 8px; border: 1px solid #9ca3af; border-radius: 3px; background: #fff; color: #1f2933; font-size: 10px; font-weight: 750; letter-spacing: .55px; text-transform: uppercase; white-space: nowrap; }
  .sheet .items { margin-top: 2px; }
  .sheet table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .sheet th { padding: 10px 7px; border-bottom: 1px solid #374151; background: #f1f3f5; color: #303b46; font-size: 10px; font-weight: 750; letter-spacing: .45px; text-align: left; text-transform: uppercase; }
  .sheet td { padding: 13px 7px; border-bottom: 1px solid #d8dee5; color: #1f2933; vertical-align: top; font-size: 12px; }
  .sheet th:first-child, .sheet td:first-child { width: 34%; padding-left: 10px; }
  .sheet th:not(:first-child), .sheet td:not(:first-child) { width: 13.2%; }
  .sheet .number { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .sheet .totals { width: 310px; max-width: 100%; margin: 24px 0 0 auto; color: #1f2933; font-variant-numeric: tabular-nums; }
  .sheet .total-row { display: flex; justify-content: space-between; gap: 20px; padding: 5px 0; }
  .sheet .grand { margin-top: 7px; padding: 11px 0 8px; border-top: 1.5px solid #202833; color: #111827; font-size: 17px; font-weight: 750; }
  .sheet .balance { margin-top: 10px; padding: 12px 14px; border: 1px solid #cbd2d9; border-radius: 4px; background: #f1f3f5; color: #111827; font-size: 16px; font-weight: 750; }
  .sheet .balance .total-row { padding: 0; }
  .sheet .notes { margin-top: 34px; padding-top: 15px; border-top: 1px solid #cbd2d9; color: #374151; font-size: 12px; }
  .sheet .notes strong { display: block; margin-bottom: 4px; color: #1f2933; font-size: 11px; letter-spacing: .8px; text-transform: uppercase; }
  @media (max-width: 650px) {
    .sheet { min-height: 0; padding: 28px 18px; box-shadow: none; }
    .sheet .top { gap: 14px; padding-bottom: 20px; }
    .sheet .brand { font-size: 19px; }
    .sheet .invoice-heading { min-width: 0; }
    .sheet h1 { font-size: 25px; }
    .sheet .invoice-meta { font-size: 11px; }
    .sheet .invoice-meta strong { font-size: 12px; }
    .sheet .addresses { gap: 16px; padding: 22px 0; }
    .sheet .address-name { font-size: 14px; }
    .sheet .service-panel { padding: 11px; }
    .sheet .service-row { align-items: flex-start; gap: 8px; }
    .sheet .service-value { font-size: 11px; }
    .sheet th { font-size: 9px; letter-spacing: 0; }
    .sheet th, .sheet td { padding: 8px 3px; font-size: 10px; overflow-wrap: anywhere; }
    .sheet th:first-child, .sheet td:first-child { width: 31%; padding-left: 5px; }
    .sheet th:not(:first-child), .sheet td:not(:first-child) { width: 13.8%; }
    .sheet .totals { width: 100%; max-width: 310px; }
  }
  @media print {
    @page { size: letter; margin: 0.55in; }
    .sheet { max-width: none; min-height: 0; padding: 0; box-shadow: none; }
    .sheet thead { display: table-header-group; }
    .sheet tr { break-inside: avoid; }
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
  exportContainer.style.left = "0";
  exportContainer.style.top = "0";
  exportContainer.style.zIndex = "-1";
  exportContainer.style.pointerEvents = "none";
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
