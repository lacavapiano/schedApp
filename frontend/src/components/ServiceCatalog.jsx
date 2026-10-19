import { useEffect, useState } from "react";
import {
  createServiceType,
  getServiceTypes,
  updateServiceType,
} from "../services/api";
import "../styles/ServiceCatalog.css";

const emptyForm = { name: "", pricing_method: "flat_rate", price: "", default_service_minutes: "" };

function formatPrice(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

export default function ServiceCatalog() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadServices() {
    try {
      setLoading(true);
      setError("");
      setServices(await getServiceTypes({ includeInactive: true }));
    } catch (err) {
      setError(err.message || "Could not load service types.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadServices(); }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const price = Number(form.price);
    if (!form.name.trim()) return setError("Enter a service name.");
    if (form.price === "" || !Number.isFinite(price) || price < 0) {
      return setError("Enter a valid price of $0 or more.");
    }
    const duration = form.default_service_minutes === "" ? null : Number(form.default_service_minutes);
    if (form.pricing_method === "flat_rate" && duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 1440)) {
      return setError("Default service time must be between 1 and 1440 minutes, or left blank.");
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        pricing_method: form.pricing_method,
        price,
        default_service_minutes: form.pricing_method === "flat_rate" && form.default_service_minutes !== "" ? Number(form.default_service_minutes) : null,
      };
      if (editingId) {
        await updateServiceType(editingId, payload);
        setNotice("Service updated.");
      } else {
        await createServiceType(payload);
        setNotice("Service added.");
      }
      resetForm();
      await loadServices();
    } catch (err) {
      setError(err.message || "Could not save this service.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      pricing_method: service.pricing_method,
      price: String(service.price),
      default_service_minutes: service.default_service_minutes == null ? "" : String(service.default_service_minutes),
    });
    setError("");
    setNotice("");
  }

  async function toggleActive(service) {
    setError("");
    setNotice("");
    try {
      await updateServiceType(service.id, { is_active: !service.is_active });
      setServices((current) =>
        current.map((item) => item.id === service.id
          ? { ...item, is_active: !item.is_active }
          : item)
      );
      setNotice(service.is_active ? "Service archived." : "Service reactivated.");
    } catch (err) {
      setError(err.message || "Could not update this service.");
    }
  }

  return (
    <section className="settings-section service-catalog">
      <div className="settings-section-header">
        <div>
          <h2>Service catalog</h2>
          <p>Define the services you offer and the standard price used for appointment billing.</p>
        </div>
      </div>

      {error && <div className="settings-error" role="alert">{error}</div>}
      {notice && <div className="service-catalog-notice" role="status">{notice}</div>}

      <form className="service-catalog-form" onSubmit={handleSubmit}>
        <div className="service-catalog-form-heading">
          <h3>{editingId ? "Edit service" : "Add a service"}</h3>
          <p>Hourly services require actual billable hours when an appointment is recorded.</p>
        </div>
        <div className="service-catalog-fields">
          <div className="settings-field service-name-field">
            <label htmlFor="service-name">Service name</label>
            <input
              id="service-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Piano tuning"
              maxLength={100}
              required
            />
          </div>
          <div className="settings-field">
            <label htmlFor="service-pricing-method">Pricing method</label>
            <select
              id="service-pricing-method"
              value={form.pricing_method}
              onChange={(event) => setForm({ ...form, pricing_method: event.target.value })}
            >
              <option value="flat_rate">Flat rate</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          {form.pricing_method === "flat_rate" && (
            <div className="settings-field service-duration-field">
              <label htmlFor="service-default-duration">Default service time (minutes)</label>
              <input id="service-default-duration" type="number" min="1" max="1440" step="1" inputMode="numeric" value={form.default_service_minutes} onChange={(event) => setForm({ ...form, default_service_minutes: event.target.value })} placeholder="e.g. 90" />
              <span className="settings-help-text">Used to calculate appointment end times. Leave blank if not applicable.</span>
            </div>
          )}
          <div className="settings-field service-price-field">
            <label htmlFor="service-price">Standard price ($)</label>
            <input
              id="service-price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              placeholder="0.00"
              required
            />
          </div>
        </div>
        <div className="service-catalog-form-actions">
          {editingId && (
            <button type="button" className="settings-secondary-button" onClick={resetForm} disabled={saving}>
              Cancel edit
            </button>
          )}
          <button type="submit" className="settings-button" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Save changes" : "Add service"}
          </button>
        </div>
      </form>

      <div className="service-catalog-list-header">
        <h3>Configured services</h3>
        <span>{services.filter((service) => service.is_active).length} active</span>
      </div>

      {loading ? (
        <p className="settings-help-text">Loading services...</p>
      ) : services.length === 0 ? (
        <div className="settings-empty-state">
          <p>No services yet.</p>
          <span>Add your first service above. You can change prices or archive a service later without deleting its history.</span>
        </div>
      ) : (
        <div className="service-catalog-list">
          {services.map((service) => (
            <article className={`service-catalog-row ${service.is_active ? "" : "service-catalog-row-inactive"}`} key={service.id}>
              <div className="service-catalog-service">
                <strong>{service.name}</strong>
                <span>{service.pricing_method === "hourly" ? "Hourly" : "Flat rate"}</span>
              </div>
              <div className="service-catalog-price">
                <strong>{formatPrice(service.price)}</strong>
                <span>{service.pricing_method === "hourly" ? "per billable hour" : `per service${service.default_service_minutes ? ` · ${service.default_service_minutes} min` : ""}`}</span>
              </div>
              <div className="service-catalog-row-actions">
                {!service.is_active && <span className="service-catalog-archived">Archived</span>}
                <button type="button" className="settings-secondary-button" onClick={() => startEdit(service)}>Edit</button>
                <button type="button" className="settings-secondary-button" onClick={() => toggleActive(service)}>
                  {service.is_active ? "Archive" : "Reactivate"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
