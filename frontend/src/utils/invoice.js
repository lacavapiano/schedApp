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

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(toNumber(value));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatAddress(address) {
  if (!address) return "";
  const street = [
    escapeHtml(address.address),
    address.apt ? `Apt ${escapeHtml(address.apt)}` : "",
  ].filter(Boolean).join(", ");
  const locality = [address.city, address.state, address.zip]
    .map(escapeHtml)
    .filter(Boolean)
    .join(", ");
  return [street, locality].filter(Boolean).join("<br>");
}

function getChargeAmounts(charge) {
  const quantity = charge.pricing_method === "hourly"
    ? Math.max(0, toNumber(charge.billable_hours))
    : 1;
  const unitPrice = toNumber(charge.unit_price);
  const subtotal = toNumber(charge.base_amount, unitPrice * quantity);
  const discount = Math.max(0, toNumber(charge.discount_amount));
  const total = toNumber(charge.final_amount, Math.max(0, subtotal - discount));

  return { quantity, unitPrice, subtotal, discount, total };
}

export function getInvoiceNumber(appointment) {
  const existing = appointment?.invoice?.trim();
  if (existing) return existing;

  const date = appointment?.start_time ? new Date(appointment.start_time) : new Date();
  const datePart = Number.isNaN(date.getTime())
    ? "UNDATED"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
  const idPart = String(appointment?.id || "NEW").slice(0, 6).toUpperCase();
  return `INV-${datePart}-${idPart}`;
}

export function buildInvoiceDocument({
  appointment = {},
  client,
  address,
  charges = [],
  settings = {},
}) {
  const invoiceNumber = getInvoiceNumber(appointment);
  const pianoById = new Map(
    (appointment.appointment_pianos || []).map((item) => [item.id, item])
  );

  const normalizedCharges = (charges || []).map((charge) => ({
    charge,
    amounts: getChargeAmounts(charge),
  }));

  const lineItems = normalizedCharges.map(({ charge, amounts }) => {
    const piano = pianoById.get(charge.appointment_piano_id);
    const pianoIdentity = [
      piano?.piano?.make,
      piano?.piano?.model,
      piano?.piano?.serial,
    ].filter(Boolean).join(" ");
    const location = piano?.location || piano?.piano?.location || "";
    const pianoDescription = pianoIdentity || (piano?.piano ? "Piano service" : "");
    const serviceName = charge.service_name || "Service";
    const isHourly = charge.pricing_method === "hourly";

    return `<tr class="invoice-line-item">
      <td class="description-cell">
        <div class="item-description">
          ${location ? `<span class="description-location">${escapeHtml(location)}</span>` : ""}
          ${pianoDescription ? `<span class="description-piano">${escapeHtml(pianoDescription)}</span>` : ""}
          <strong class="description-service">${escapeHtml(serviceName)}</strong>
        </div>
        ${isHourly ? `<span class="item-detail">${amounts.quantity.toFixed(2)} hours</span>` : ""}
      </td>
      <td class="number-cell">${amounts.quantity.toFixed(isHourly ? 2 : 0)}</td>
      <td class="number-cell">${money(amounts.unitPrice)}</td>
      <td class="number-cell">${amounts.discount > 0 ? "−" + money(amounts.discount) : "—"}</td>
      <td class="number-cell amount-cell"><strong class="line-total">${money(amounts.total)}</strong></td>
    </tr>`;
  }).join("");

  const subtotal = normalizedCharges.reduce((sum, item) => sum + item.amounts.subtotal, 0);
  const discountTotal = normalizedCharges.reduce((sum, item) => sum + item.amounts.discount, 0);
  const total = normalizedCharges.reduce((sum, item) => sum + item.amounts.total, 0);
  const paid = Math.max(0, toNumber(appointment.payment));
  const balance = Math.max(0, total - paid);
  const status = total > 0 && paid >= total ? "Paid in full" : "Payment due";

  const issueDate = new Date();
  const dueDays = Math.max(0, toNumber(settings.invoice_due_days, 30));
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + dueDays);

  const businessContact = [
    settings.business_address,
    settings.business_email,
    settings.business_phone,
  ].filter(Boolean);
  const customerName = client?.name || appointment.client?.name || "Client";
  const addressHtml = formatAddress(address);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice ${escapeHtml(invoiceNumber)}</title>
  <style>
    /* Fixed US Letter canvas: margins are built into the sheet, not split
       between CSS and the PDF generator. This avoids platform-dependent sizing. */
    .sheet, .sheet * {
      box-sizing: border-box;
      color-scheme: light;
    }
    .sheet {
      display: block;
      width: 816px;
      max-width: 816px;
      margin: 0;
      padding: 44px 48px 40px;
      background: #fff !important;
      color: #202833 !important;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    .sheet .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding: 0 0 20px;
      border-bottom: 2px solid #202833;
    }
    .sheet .brand {
      color: #111827 !important;
      font-size: 23px;
      font-weight: 700;
      letter-spacing: -.4px;
    }
    .sheet .business-contact {
      margin-top: 6px;
      color: #4b5563 !important;
      font-size: 11px;
      line-height: 1.5;
    }
    .sheet .invoice-heading {
      flex: 0 0 auto;
      min-width: 180px;
      text-align: right;
    }
    .sheet h1 {
      margin: 0 0 5px;
      color: #111827 !important;
      font-size: 29px;
      line-height: 1.1;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .sheet .invoice-meta {
      color: #4b5563 !important;
      font-size: 11px;
      line-height: 1.65;
    }
    .sheet .invoice-meta strong {
      color: #111827 !important;
      font-size: 12px;
    }
    .sheet .addresses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      padding: 24px 0 25px;
    }
    .sheet .label {
      margin: 0 0 7px;
      color: #596473 !important;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .8px;
      text-transform: uppercase;
    }
    .sheet .address-name {
      margin-bottom: 3px;
      color: #111827 !important;
      font-size: 14px;
      font-weight: 700;
    }
    .sheet .address-lines {
      color: #374151 !important;
      font-size: 11px;
      line-height: 1.5;
    }
    .sheet .service-panel {
      padding: 11px 13px;
      border: 1px solid #d5dae0;
      border-radius: 4px;
      background: #f8fafc !important;
    }
    .sheet .service-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .sheet .service-row + .service-row {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e1e5e9;
    }
    .sheet .service-label {
      color: #596473 !important;
      font-size: 11px;
    }
    .sheet .service-value {
      color: #111827 !important;
      font-size: 11px;
      font-weight: 700;
      text-align: right;
    }
    .sheet .payment-status {
      display: inline-block;
      padding: 3px 7px;
      border: 1px solid #aeb7c2;
      border-radius: 3px;
      background: #fff !important;
      color: #111827 !important;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .3px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .sheet .items {
      width: 100%;
      margin: 0;
    }
    .sheet table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      background: #fff !important;
    }
    .sheet thead { display: table-header-group; }
    .sheet th {
      padding: 9px 6px;
      border-bottom: 2px solid #374151;
      background: #f1f3f5 !important;
      color: #374151 !important;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .25px;
      text-align: left;
      text-transform: uppercase;
    }
    .sheet td {
      padding: 10px 6px;
      border-bottom: 1px solid #d9dee4;
      background: #fff !important;
      color: #26313d !important;
      vertical-align: top;
      font-size: 10px;
    }
    .sheet .description-cell {
      padding-left: 8px;
      text-align: left;
      overflow-wrap: anywhere;
    }
    .sheet .item-description {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      color: #111827 !important;
      font-size: 10px;
      line-height: 1.3;
    }
    .sheet .description-location {
      color: #647080 !important;
      font-size: 9px;
      font-weight: 600;
    }
    .sheet .description-piano {
      color: #374151 !important;
      font-size: 10px;
      font-weight: 600;
    }
    .sheet .description-service {
      color: #111827 !important;
      font-size: 11px;
      font-weight: 700;
    }
    .sheet .item-detail {
      display: block;
      margin-top: 3px;
      color: #647080 !important;
      font-size: 9px;
    }
    .sheet .number-cell {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .sheet .col-description { width: 49%; }
    .sheet .col-quantity { width: 8%; }
    .sheet .col-rate { width: 15%; }
    .sheet .col-discount { width: 12%; }
    .sheet .col-amount { width: 16%; }
    .sheet .amount-cell,
    .sheet .line-total {
      color: #111827 !important;
      font-size: 10px;
      font-weight: 700 !important;
    }
    .sheet .totals {
      width: 275px;
      max-width: 100%;
      margin: 18px 0 0 auto;
      color: #26313d !important;
      font-variant-numeric: tabular-nums;
    }
    .sheet .total-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 4px 0;
      color: #374151 !important;
      font-size: 11px;
    }
    .sheet .grand {
      margin-top: 5px;
      padding: 8px 0 6px;
      border-top: 1.5px solid #202833;
      color: #111827 !important;
      font-size: 15px;
      font-weight: 700;
    }
    .sheet .balance {
      margin-top: 7px;
      padding: 9px 11px;
      border: 1px solid #d5dae0;
      border-radius: 4px;
      background: #f1f3f5 !important;
      color: #111827 !important;
      font-size: 14px;
      font-weight: 700;
    }
    .sheet .balance .total-row {
      padding: 0;
      color: #111827 !important;
      font-size: 13px;
      font-weight: 700;
    }
    .sheet .notes {
      margin: 24px 0 0;
      padding-top: 11px;
      border-top: 1px solid #d5dae0;
      color: #4b5563 !important;
      font-size: 10px;
      line-height: 1.45;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .sheet .notes strong {
      display: block;
      margin-bottom: 4px;
      color: #111827 !important;
      font-size: 9px;
      letter-spacing: .6px;
      text-transform: uppercase;
    }
    .sheet strong {
      color: #111827 !important;
      opacity: 1 !important;
    }
  </style>
</head>
<body>
  <main class="sheet" aria-label="Invoice">
    <header class="top">
      <div>
        <div class="brand">LaCava Piano Service</div>
        ${businessContact.length
          ? `<div class="business-contact">${businessContact.map(escapeHtml).join("<br>")}</div>`
          : ""}
      </div>
      <div class="invoice-heading">
        <h1>INVOICE</h1>
        <div class="invoice-meta">
          <strong>${escapeHtml(invoiceNumber)}</strong><br>
          Issued ${formatDate(issueDate)}<br>
          Due ${formatDate(dueDate)}
        </div>
      </div>
    </header>

    <section class="addresses" aria-label="Invoice parties and service details">
      <div>
        <div class="label">Bill to</div>
        <div class="address-name">${escapeHtml(customerName)}</div>
        ${addressHtml ? `<div class="address-lines">${addressHtml}</div>` : ""}
      </div>
      <div>
        <div class="label">Service details</div>
        <div class="service-panel">
          <div class="service-row">
            <span class="service-label">Service date</span>
            <span class="service-value">${formatDate(appointment.start_time)}</span>
          </div>
          <div class="service-row">
            <span class="service-label">Payment status</span>
            <span class="payment-status">${status}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="items" aria-label="Invoice line items">
      <table>
        <colgroup>
          <col class="col-description">
          <col class="col-quantity">
          <col class="col-rate">
          <col class="col-discount">
          <col class="col-amount">
        </colgroup>
        <thead>
          <tr>
            <th scope="col" class="description-cell">Description</th>
            <th scope="col" class="number-cell">Qty</th>
            <th scope="col" class="number-cell">Rate</th>
            <th scope="col" class="number-cell">Discount</th>
            <th scope="col" class="number-cell">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems || `<tr><td colspan="5">No saved service charges were found for this appointment. Save the appointment's service pricing before generating an invoice.</td></tr>`}
        </tbody>
      </table>
    </section>

    <section class="totals" aria-label="Invoice totals">
      <div class="total-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
      <div class="total-row"><span>Discounts</span><span>−${money(discountTotal)}</span></div>
      <div class="total-row grand"><span>Total</span><span>${money(total)}</span></div>
      <div class="total-row"><span>Payment received</span><span>−${money(paid)}</span></div>
      <div class="balance">
        <div class="total-row"><span>Balance due</span><span>${money(balance)}</span></div>
      </div>
    </section>

    ${appointment.notes
      ? `<section class="notes" aria-label="Appointment notes"><strong>Appointment notes</strong>${escapeHtml(appointment.notes)}</section>`
      : ""}
  </main>
</body>
</html>`;
}

export async function downloadInvoicePdf({
  appointment,
  client,
  address,
  charges,
  settings = {},
}) {
  const invoiceNumber = getInvoiceNumber(appointment);
  const invoiceHtml = buildInvoiceDocument({
    appointment,
    client,
    address,
    charges,
    settings,
  });
  const parsed = new DOMParser().parseFromString(invoiceHtml, "text/html");
  const sheet = parsed.querySelector(".sheet");
  const style = parsed.querySelector("style");

  if (!sheet || !style) {
    throw new Error("Unable to prepare the invoice for PDF export.");
  }

  // Keep the invoice stylesheet isolated by scoping every rule to .sheet.
  // The explicit .sheet strong rule also overrides SchedApp's global theme rule.
  const exportStyle = document.createElement("style");
  exportStyle.textContent = style.textContent;
  document.head.appendChild(exportStyle);

  const exportContainer = document.createElement("div");
  Object.assign(exportContainer.style, {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "-1",
    pointerEvents: "none",
    width: "816px",
    minWidth: "816px",
    background: "#ffffff",
    color: "#1f2933",
    colorScheme: "light",
  });
  exportContainer.appendChild(sheet);
  document.body.appendChild(exportContainer);

  try {
    await html2pdf()
      .set({
        filename: `Invoice-${invoiceNumber}.pdf`,
        margin: 0,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          windowWidth: 816,
          width: 816,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
      })
      .from(sheet)
      .save();
  } finally {
    exportContainer.remove();
    exportStyle.remove();
  }
}
