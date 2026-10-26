import { useEffect, useMemo, useState } from "react";
import {
  createClientDiscount,
  getAppointments,
  getClientDiscounts,
  getServiceTypes,
  updateClientDiscount,
} from "../services/api";
import "../styles/ClientDiscounts.css";

const EMPTY_FORM = {
  discount_method: "percent",
  discount_percent: "",
  discount_amount: "",
  discount_type: "ongoing",
  service_type_id: "",
  target: "",
};

function formatDate(value) {
  if (!value) return "Date not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date not set"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function formatDiscount(discount) {
  return discount.discount_method === "fixed"
    ? "$" + Number(discount.discount_amount).toFixed(2)
    : `${Number(discount.discount_percent)}%`;
}

function appointmentLabel(appointment) {
  const services = (appointment.appointment_pianos || [])
    .map((item) => item.service || item.piano?.make || "Service")
    .filter(Boolean);
  return `${formatDate(appointment.start_time)}${services.length ? ` · ${services.join(", ")}` : ""}`;
}

export default function ClientDiscounts({ clientId }) {
  const [discounts, setDiscounts] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [discountRows, serviceRows, appointmentRows] = await Promise.all([
        getClientDiscounts(clientId, { includeInactive: true }),
        getServiceTypes(),
        getAppointments(),
      ]);
      setDiscounts(discountRows);
      setServices(serviceRows);
      setAppointments(
        appointmentRows
          .filter((appointment) => String(appointment.client_id) === String(clientId))
          .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
      );
    } catch (err) {
      setError(err.message || "Could not load client discounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [clientId]);

  const selectedAppointment = useMemo(() => {
    if (!form.target) return null;
    return appointments.find((appointment) =>
      appointment.id === form.target || (appointment.appointment_pianos || []).some((item) => item.id === form.target)
    ) || null;
  }, [form.target, appointments]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const percent = Number(form.discount_percent);
    const amount = Number(form.discount_amount);
    if (form.discount_method === "percent" && (!Number.isFinite(percent) || percent <= 0 || percent > 100)) {
      setError("Enter a discount greater than 0% and no more than 100%.");
      return;
    }
    if (form.discount_method === "fixed" && (!Number.isFinite(amount) || amount <= 0)) {
      setError("Enter a fixed discount amount greater than $0.");
      return;
    }
    if (form.discount_type === "one_time" && !form.target) {
      setError("Choose the appointment or service that should receive this one-time discount.");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateClientDiscount(editingId, form.discount_method === "fixed"
          ? { discount_method: "fixed", discount_amount: amount }
          : { discount_method: "percent", discount_percent: percent });
        setNotice("Discount updated.");
      } else {
        const isAppointment = appointments.some((appointment) => appointment.id === form.target);
        await createClientDiscount({
          client_id: clientId,
          discount_method: form.discount_method,
          ...(form.discount_method === "fixed" ? { discount_amount: amount } : { discount_percent: percent }),
          discount_type: form.discount_type,
          service_type_id: form.service_type_id || null,
          applies_to_appointment_id: form.discount_type === "one_time" && isAppointment ? form.target : null,
          applies_to_appointment_piano_id: form.discount_type === "one_time" && !isAppointment ? form.target : null,
        });
        setNotice("Discount added.");
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message || "Could not save this discount.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(discount) {
    setEditingId(discount.id);
    setShowForm(true);
    setForm({
      ...EMPTY_FORM,
      discount_method: discount.discount_method || "percent",
      discount_percent: discount.discount_percent == null ? "" : String(discount.discount_percent),
      discount_amount: discount.discount_amount == null ? "" : String(discount.discount_amount),
    });
    setError("");
    setNotice("");
  }

  async function toggleActive(discount) {
    setError("");
    setNotice("");
    try {
      await updateClientDiscount(discount.id, { is_active: !discount.is_active });
      setDiscounts((current) => current.map((item) =>
        item.id === discount.id ? { ...item, is_active: !item.is_active } : item
      ));
      setNotice(discount.is_active ? "Discount archived." : "Discount reactivated.");
    } catch (err) {
      setError(err.message || "Could not update this discount.");
    }
  }

  const visibleDiscounts = discounts.filter((discount) => showInactive || discount.is_active);

  function discountScope(discount) {
    return discount.service_type?.name || "All services";
  }

  function discountTarget(discount) {
    if (discount.discount_type !== "one_time") return "Ongoing";
    const appointment = appointments.find((item) =>
      item.id === discount.applies_to_appointment_id ||
      (item.appointment_pianos || []).some((piano) => piano.id === discount.applies_to_appointment_piano_id)
    );
    if (!appointment) return "One-time · assigned appointment";
    const piano = (appointment.appointment_pianos || []).find((item) => item.id === discount.applies_to_appointment_piano_id);
    return `One-time · ${formatDate(appointment.start_time)}${piano ? ` · ${piano.service || piano.piano?.make || "Selected service"}` : " · whole appointment"}`;
  }

  return (
    <section className="client-discounts-section record-detail-section">
      <div className="section-header client-discounts-header">
        <h2>Discounts</h2>
        <button
          type="button"
          className="action-button action-button--primary"
          onClick={() => {
            resetForm();
            setError("");
            setNotice("");
            setShowForm(true);
          }}
        >
          New Discount
        </button>
      </div>
      <p className="client-discounts-description">
        Manage ongoing discounts or assign a one-time discount to an appointment or service.
      </p>
      <div className="client-discounts-toolbar">
        <label className="client-discounts-inactive-toggle">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Show archived
        </label>
      </div>

      {error && <div className="client-discounts-message client-discounts-error" role="alert">{error}</div>}
      {notice && <div className="client-discounts-message" role="status">{notice}</div>}

      {showForm && (
        <div className="client-discount-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) resetForm();
        }}>
          <section className="client-discount-modal" role="dialog" aria-modal="true" aria-labelledby="client-discount-modal-title">
            <div className="client-discount-modal-header">
              <h3 id="client-discount-modal-title">{editingId ? "Edit Discount" : "New Discount"}</h3>
              <button type="button" className="client-discount-modal-close" aria-label="Close" onClick={resetForm} disabled={saving}>×</button>
            </div>
            {error && <div className="client-discounts-message client-discounts-error client-discount-modal-message" role="alert">{error}</div>}
            <form className="client-discount-form" onSubmit={handleSubmit}>
        <div className="client-discount-form-heading">
          <h4>{editingId ? "Edit discount" : "Apply a discount"}</h4>
          <p>Choose a percentage and how it should apply to this client.</p>
        </div>
        <div className="client-discount-fields">
          <div className="settings-field">
            <label htmlFor="client-discount-method">Discount amount type</label>
            <select
              id="client-discount-method"
              value={form.discount_method}
              onChange={(event) => setForm({ ...form, discount_method: event.target.value })}
            >
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount ($)</option>
            </select>
          </div>
          <div className="settings-field">
            <label htmlFor="client-discount-value">{form.discount_method === "fixed" ? "Discount ($)" : "Discount (%)"}</label>
            <input
              id="client-discount-value"
              type="number"
              min="0.01"
              max={form.discount_method === "percent" ? "100" : undefined}
              step="0.01"
              inputMode="decimal"
              value={form.discount_method === "fixed" ? form.discount_amount : form.discount_percent}
              onChange={(event) => setForm({
                ...form,
                ...(form.discount_method === "fixed" ? { discount_amount: event.target.value } : { discount_percent: event.target.value }),
              })}
              placeholder={form.discount_method === "fixed" ? "e.g. 25.00" : "e.g. 10"}
              required
            />
          </div>
          {!editingId && (
            <>
              <div className="settings-field">
                <label htmlFor="client-discount-type">Discount type</label>
                <select
                  id="client-discount-type"
                  value={form.discount_type}
                  onChange={(event) => setForm({ ...form, discount_type: event.target.value, target: "" })}
                >
                  <option value="ongoing">Ongoing</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
              <div className="settings-field">
                <label htmlFor="client-discount-service">Applies to</label>
                <select
                  id="client-discount-service"
                  value={form.service_type_id}
                  onChange={(event) => setForm({ ...form, service_type_id: event.target.value })}
                >
                  <option value="">All services (global)</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {!editingId && form.discount_type === "one_time" && (
          <div className="settings-field client-discount-target-field">
            <label htmlFor="client-discount-target">Appointment or service</label>
            <select
              id="client-discount-target"
              value={form.target}
              onChange={(event) => setForm({ ...form, target: event.target.value })}
              required
            >
              <option value="">Choose where to apply this discount</option>
              {appointments.map((appointment) => (
                <optgroup key={appointment.id} label={appointmentLabel(appointment)}>
                  <option value={appointment.id}>Whole appointment</option>
                  {(appointment.appointment_pianos || []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.service || item.piano?.make || "Service"}{item.piano?.model ? ` · ${item.piano.model}` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {appointments.length === 0 && <span className="client-discount-help">This client has no appointments available to assign a one-time discount to.</span>}
            {selectedAppointment && <span className="client-discount-help">Selected: {appointmentLabel(selectedAppointment)}</span>}
          </div>
        )}

        <div className="client-discount-form-actions">
          {editingId && (
            <button type="button" className="action-button action-button--secondary" onClick={resetForm} disabled={saving}>Cancel</button>
          )}
          <button type="submit" className="action-button action-button--primary" disabled={saving || (!editingId && form.discount_type === "one_time" && appointments.length === 0)}>
            {saving ? "Saving..." : editingId ? "Save Changes" : "Apply Discount"}
          </button>
            </div>
            </form>
          </section>
        </div>
      )}

      <div className="client-discounts-list-heading">
        <h4>Configured discounts</h4>
        <span>{discounts.filter((discount) => discount.is_active).length} active</span>
      </div>

      {loading ? (
        <p className="client-discounts-empty">Loading discounts...</p>
      ) : visibleDiscounts.length === 0 ? (
        <p className="client-discounts-empty">No discounts configured for this client.</p>
      ) : visibleDiscounts.length > 3 ? (
        <details className="client-detail-collapsible client-discounts-disclosure"><summary><span>Configured discounts</span><span className="client-detail-count">({visibleDiscounts.length})</span></summary>
        <div className="client-discounts-list">
          {visibleDiscounts.map((discount) => (
            <article className={`client-discount-row ${discount.is_active ? "" : "client-discount-row-inactive"}`} key={discount.id}>
              <div className="client-discount-main">
                <div className="client-discount-field">
                  <span className="client-discount-field-label">Discount</span>
                  <strong className="client-discount-field-value client-discount-percent">{formatDiscount(discount)}</strong>
                </div>
                <div className="client-discount-field">
                  <span className="client-discount-field-label">Type / Service</span>
                  <span className="client-discount-field-value">{discountScope(discount)}</span>
                </div>
                <div className="client-discount-field">
                  <span className="client-discount-field-label">Applies to</span>
                  <span className="client-discount-field-value">{discountTarget(discount)}</span>
                </div>
              </div>
              <div className="client-discount-actions">
                {!discount.is_active && <span className="client-discount-archived">Archived</span>}
                <button type="button" className="settings-secondary-button" onClick={() => startEdit(discount)}>Edit</button>
                <button type="button" className="settings-secondary-button" onClick={() => toggleActive(discount)}>
                  {discount.is_active ? "Archive" : "Reactivate"}
                </button>
              </div>
            </article>
          ))}
        </div></details>
      ) : (
        <div className="client-discounts-list">
          {visibleDiscounts.map((discount) => (
            <article className={`client-discount-row ${discount.is_active ? "" : "client-discount-row-inactive"}`} key={discount.id}>
              <div className="client-discount-main"><div className="client-discount-field"><span className="client-discount-field-label">Discount</span><strong className="client-discount-field-value client-discount-percent">{formatDiscount(discount)}</strong></div><div className="client-discount-field"><span className="client-discount-field-label">Type / Service</span><span className="client-discount-field-value">{discountScope(discount)}</span></div><div className="client-discount-field"><span className="client-discount-field-label">Applies to</span><span className="client-discount-field-value">{discountTarget(discount)}</span></div></div>
              <div className="client-discount-actions">{!discount.is_active && <span className="client-discount-archived">Archived</span>}<button type="button" className="settings-secondary-button" onClick={() => startEdit(discount)}>Edit</button><button type="button" className="settings-secondary-button" onClick={() => toggleActive(discount)}>{discount.is_active ? "Archive" : "Reactivate"}</button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
