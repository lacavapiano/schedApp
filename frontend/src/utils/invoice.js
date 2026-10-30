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
  const street = [address.address, address.apt ? `Apt ${address.apt}` : null].filter(Boolean).join(", ");
  const locality = [address.city, address.state, address.zip].filter(Boolean).join(", ");
  return [street, locality].filter(Boolean).join("<br>");
}

export function buildInvoiceDocument({ appointment, client, address, charges }) {
  const invoiceNumber = appointment.invoice?.trim()
    || `INV-${new Date(appointment.start_time).toISOString().slice(0, 10).replaceAll("-", "")}-${String(appointment.id).slice(0, 6).toUpperCase()}`;
  const pianoById = new Map((appointment.appointment_pianos || []).map((item) => [item.id, item]));
  const lineItems = (charges || []).map((charge) => {
    const piano = pianoById.get(charge.appointment_piano_id);
    const instrument = piano?.piano
      ? [piano.piano.make, piano.piano.model].filter(Boolean).join(" ")
      : "Piano service";
    const serial = piano?.piano?.serial ? ` · S/N ${piano.piano.serial}` : "";
    const description = [charge.service_name || "Service", instrument + serial].filter(Boolean).join(" — ");
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
  const status = balance <= 0 ? "Paid" : paid > 0 ? "Partially paid" : "Unpaid";
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
  body { margin: 0; padding: 36px; color: #171717; background: #f3f3f3; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .sheet { position: relative; max-width: 900px; min-height: 900px; margin: 0 auto; padding: 54px 58px; background: #fff; box-shadow: 0 4px 28px #00000012; }
  .top { display: flex; justify-content: space-between; gap: 32px; align-items: flex-start; padding-bottom: 32px; border-bottom: 2px solid #171717; }
  .brand { font-size: 24px; font-weight: 750; letter-spacing: -.6px; }
  .eyebrow { margin-top: 5px; color: #666; font-size: 11px; letter-spacing: 1.8px; text-transform: uppercase; }
  h1 { margin: 0; font-size: 34px; letter-spacing: 1px; text-align: right; }
  .invoice-meta { margin-top: 8px; color: #555; text-align: right; }
  .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; padding: 34px 0; }
  .label { margin-bottom: 9px; color: #777; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
  .address-name { font-size: 16px; font-weight: 700; }
  .muted { color: #777; font-size: 12px; }
  .service-date { margin-top: 18px; }
  table { width: 100%; border-collapse: collapse; }
  th { padding: 11px 8px; background: #f4f4f4; color: #555; font-size: 10px; letter-spacing: .8px; text-align: left; text-transform: uppercase; }
  td { padding: 14px 8px; border-bottom: 1px solid #e8e8e8; vertical-align: top; }
  .number { text-align: right; white-space: nowrap; }
  .totals { width: 340px; max-width: 100%; margin: 24px 0 0 auto; }
  .total-row { display: flex; justify-content: space-between; gap: 24px; padding: 6px 0; }
  .grand { margin-top: 8px; padding-top: 13px; border-top: 2px solid #171717; font-size: 18px; font-weight: 750; }
  .balance { margin-top: 12px; padding: 14px 16px; background: #f3f3f3; font-size: 17px; font-weight: 750; }
  .payment-status { display: inline-block; margin-top: 10px; padding: 4px 9px; border: 1px solid #bbb; border-radius: 3px; color: #444; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; }
  .notes { margin-top: 42px; padding-top: 18px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
  .actions { max-width: 900px; margin: 16px auto; text-align: right; }
  button { padding: 10px 18px; border: 0; border-radius: 5px; background: #171717; color: #fff; font: inherit; cursor: pointer; }
  @media (max-width: 650px) { body { padding: 0; background: #fff; } .sheet { padding: 28px 20px; box-shadow: none; } .addresses { gap: 20px; } th, td { padding: 9px 4px; font-size: 11px; } h1 { font-size: 27px; } }
  @media print { @page { size: letter; margin: 0.55in; } body { padding: 0; background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; } .sheet { max-width: none; min-height: 0; padding: 0; box-shadow: none; } .actions { display: none; } }
</style>
</head>
<body>
<div class="sheet">
  <header class="top">
    <div><div class="brand">LaCava Piano</div><div class="eyebrow">Piano service</div></div>
    <div><h1>INVOICE</h1><div class="invoice-meta"><strong>${escapeHtml(invoiceNumber)}</strong><br>Issued ${formatDate(new Date())}</div></div>
  </header>
  <section class="addresses">
    <div><div class="label">Bill to</div><div class="address-name">${escapeHtml(customerName)}</div>${addressHtml ? `<div>${addressHtml}</div>` : ""}</div>
    <div><div class="label">Service details</div><div><strong>Service date:</strong> ${formatDate(appointment.start_time)}</div><div><strong>Appointment status:</strong> ${escapeHtml(appointment.status || "scheduled")}</div><div class="service-date"><span class="muted">Payment status</span><br><span class="payment-status">${status}</span></div></div>
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
  ${appointment.notes ? `<section class="notes"><strong>Notes</strong><br>${escapeHtml(appointment.notes)}</section>` : ""}
</div>
<div class="actions"><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
</body>
</html>`;
}

export function openInvoiceWindow(appointment, client, address, charges) {
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Your browser blocked the invoice window. Allow pop-ups for schedApp and try again.");
  popup.document.open();
  popup.document.write(buildInvoiceDocument({ appointment, client, address, charges }));
  popup.document.close();
  return popup;
}
