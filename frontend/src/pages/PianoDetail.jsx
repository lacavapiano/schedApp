import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deletePiano, getAppointments, getAppointmentCharges, getPiano } from "../services/api";
import PianoForm from "../components/PianoForm";
import PageLayout from "../components/PageLayout";
import "../styles/Pianos.css";
import "../styles/ActionButtons.css";
import "../styles/RecordDetailLayout.css";

function formatDate(date) {
  if (!date) return "Not recorded";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPrimaryValue(items = [], field) {
  return items.find((item) => item.is_primary)?.[field] || items[0]?.[field] || "";
}

function getClientSummary(client) {
  if (!client) return "Unassigned";
  const phone = getPrimaryValue(client.client_phones, "phone");
  const email = getPrimaryValue(client.client_emails, "email");
  const address = client.client_addresses?.find((item) => item.is_primary) ||
    client.client_addresses?.[0];
  const town = [address?.city, address?.state].filter(Boolean).join(", ");

  return [
    client.type === "institution" ? "Institution" : "Individual",
    phone,
    town,
    email,
  ].filter(Boolean).join(" · ");
}

function getServiceName(item) {
  if (typeof item?.service === "string") return item.service;
  return item?.service?.name || item?.service_type?.name ||
    item?.serviceType?.name || item?.service_type_name || "";
}

function isTuningService(item) {
  return /tun/i.test(getServiceName(item));
}

function formatCurrency(value) {
  const amount = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(amount)) return "Not recorded";
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function getNextTuningDate(lastTunedAt, tuningPeriod) {
  if (!lastTunedAt || !Number(tuningPeriod) || Number(tuningPeriod) <= 0) return null;
  const nextDate = new Date(lastTunedAt);
  nextDate.setMonth(nextDate.getMonth() + Number(tuningPeriod));
  return nextDate;
}

function PianoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [piano, setPiano] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deletingPiano, setDeletingPiano] = useState(false);\n  const [serviceHistory, setServiceHistory] = useState([]);

  async function loadPiano() {
    try {
      setLoading(true);
      setError("");

      const data = await getPiano(id);
      let lastTunedAt = null;
      let history = [];

      try {
        const appointments = await getAppointments();
        history = (appointments || [])
          .filter((appointment) => String(appointment.status || "").toLowerCase() === "completed")
          .flatMap((appointment) => {
            const appointmentDate = new Date(appointment.start_time);
            if (Number.isNaN(appointmentDate.getTime())) return [];

            return (appointment.appointment_pianos || [])
              .filter((item) => String(item.piano_id ?? item.piano?.id) === String(data.id))
              .map((item) => ({ appointment, item, appointmentDate }));
          })
          .sort((a, b) => b.appointmentDate - a.appointmentDate);

        const latestTuning = history.find(({ item }) => isTuningService(item));
        lastTunedAt = latestTuning?.appointmentDate || null;

        // Charge snapshots contain the actual billed amounts and discounts. Fetch
        // them per completed visit so the history stays tied to the existing pricing records.
        history = await Promise.all(history.map(async (entry) => {
          try {
            const charges = await getAppointmentCharges(entry.appointment.id);
            return {
              ...entry,
              charges: (charges || []).filter((charge) =>
                !charge.appointment_piano_id || String(charge.appointment_piano_id) === String(entry.item.id)
              ),
            };
          } catch (chargeError) {
            console.warn("Unable to load service charges for appointment:", entry.appointment.id, chargeError);
            return { ...entry, charges: [] };
          }
        }));
      } catch (appointmentError) {
        console.error("Unable to load service history:", appointmentError);
      }

      setServiceHistory(history);
      setPiano({
        ...data,
        lastTunedAt,
        nextTuningDue: getNextTuningDate(lastTunedAt, data.tuning_period),
        clientSummary: getClientSummary(data.client),
      });
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePiano() {
    const pianoName = [piano?.make, piano?.model].filter(Boolean).join(" ") || "this piano";
    const confirmed = window.confirm(`Delete ${pianoName}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingPiano(true);
      setDeleteError("");
      await deletePiano(piano.id);
      navigate("/pianos", { replace: true });
    } catch (deleteRequestError) {
      console.error(deleteRequestError);
      setDeleteError(deleteRequestError.message || "Unable to delete piano.");
      setDeletingPiano(false);
    }
  }

  useEffect(() => {
    loadPiano();
  }, [id]);

  if (loading) {
    return (
      <PageLayout title="Piano">
        <div className="pianos-loading">Loading Piano...</div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Piano">
        <div className="piano-detail-error">
          <p>{error}</p>
          <button onClick={() => navigate("/pianos")}>← Back to Pianos</button>
        </div>
      </PageLayout>
    );
  }

  if (!piano) {
    return (
      <PageLayout title="Piano">
        <p>Piano not found.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Piano Details">
      <div className="piano-detail-page record-detail-page">
        <div className="piano-detail-toolbar record-detail-toolbar">
          <button className="action-button action-button--quiet" onClick={() => navigate("/pianos")}>
            ← Back to Pianos
          </button>
          <div className="action-button-group">
            <button className="action-button action-button--primary" onClick={() => setShowEditForm(true)}>
              Edit Piano
            </button>
            <button
              className="action-button action-button--danger"
              onClick={handleDeletePiano}
              disabled={deletingPiano}
            >
              {deletingPiano ? "Deleting..." : "Delete Piano"}
            </button>
          </div>
        </div>

        {deleteError && <p className="action-button-error" role="alert">{deleteError}</p>}

        <div className="piano-detail-header record-detail-header">
          <h2>{[piano.make, piano.model].filter(Boolean).join(" ") || "Piano"}</h2>
          {piano.type && <span className="piano-type-badge">{piano.type}</span>}
        </div>

        <div className="piano-detail-grid record-detail-grid">
          <section className="piano-detail-section record-detail-section">
            <h3>Identification</h3>
            <div className="piano-detail-fields">
              <div>
                <span className="piano-detail-label">Make</span>
                <span>{piano.make || "—"}</span>
              </div>
              <div>
                <span className="piano-detail-label">Model</span>
                <span>{piano.model || "—"}</span>
              </div>
              <div>
                <span className="piano-detail-label">Serial</span>
                <span>{piano.serial || "—"}</span>
              </div>
              <div>
                <span className="piano-detail-label">Type</span>
                <span>{piano.type || "—"}</span>
              </div>
            </div>
          </section>

          <section className="piano-detail-section record-detail-section">
            <h3>Location & Ownership</h3>
            <div className="piano-detail-fields">
              <div className="piano-detail-owner">
                <span className="piano-detail-label">Client</span>
                {piano.client ? (
                  <button
                    className="piano-client-link"
                    onClick={() => navigate(`/clients/${piano.client.id}`)}
                  >
                    {piano.client.name}
                  </button>
                ) : (
                  <span>Unassigned</span>
                )}
                {piano.client && (
                  <span className="piano-detail-client-summary">{piano.clientSummary}</span>
                )}
              </div>
              <div>
                <span className="piano-detail-label">Location</span>
                <span>{piano.location || "—"}</span>
              </div>
            </div>
          </section>

          <section className="piano-detail-section record-detail-section">
            <h3>Equipment</h3>
            <div className="piano-detail-fields">
              <div>
                <span className="piano-detail-label">Quiet System</span>
                <span>{piano.quiet_system || "—"}</span>
              </div>
              <div>
                <span className="piano-detail-label">Climate Control</span>
                <span>{piano.climate_control || "—"}</span>
              </div>
            </div>
          </section>

          <section className="piano-detail-section record-detail-section">
            <h3>Maintenance</h3>
            <div className="piano-detail-fields">
              <div>
                <span className="piano-detail-label">Tuning Period</span>
                <span>{piano.tuning_period ? `${piano.tuning_period} months` : "—"}</span>
              </div>
              <div>
                <span className="piano-detail-label">Last tuning</span>
                <span>{formatDate(piano.lastTunedAt)}</span>
              </div>
              {piano.tuning_period ? (
                <div>
                  <span className="piano-detail-label">Next tuning due</span>
                  <span>{piano.nextTuningDue ? formatDate(piano.nextTuningDue) : "No tuning history"}</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section className="piano-detail-section piano-service-history-section record-detail-section" aria-labelledby="piano-service-history-title">
          <div className="piano-service-history-heading">
            <div>
              <h3 id="piano-service-history-title">Service History</h3>
              <p>Completed visits for this piano, newest first.</p>
            </div>
            <span className="piano-service-history-count">{serviceHistory.length} {serviceHistory.length === 1 ? "visit" : "visits"}</span>
          </div>

          {serviceHistory.length ? (
            <div className="piano-service-history-list">
              {serviceHistory.map(({ appointment, item, appointmentDate, charges = [] }) => {
                const billedTotal = charges.reduce((sum, charge) => sum + Number(charge.final_amount || 0), 0);
                const serviceName = getServiceName(item) || "Service";
                const notes = item.notes || appointment.notes;
                return (
                  <article className="piano-service-history-entry" key={item.id || `${appointment.id}-${item.piano_id}`}>
                    <div className="piano-service-history-entry-top">
                      <div>
                        <time className="piano-service-history-date" dateTime={appointmentDate.toISOString()}>{formatDate(appointmentDate)}</time>
                        <span className="piano-service-history-service">{serviceName}</span>
                      </div>
                      <span className="piano-service-history-status">Completed</span>
                    </div>

                    <div className="piano-service-history-measurements">
                      <div><span className="piano-detail-label">Temperature</span><span>{item.temp !== null && item.temp !== undefined && item.temp !== "" ? `${item.temp}°` : "—"}</span></div>
                      <div><span className="piano-detail-label">Humidity</span><span>{item.hum !== null && item.hum !== undefined && item.hum !== "" ? `${item.hum}%` : "—"}</span></div>
                    </div>

                    <div className="piano-service-history-notes">
                      <span className="piano-detail-label">Service notes</span>
                      <p>{notes || "No service notes recorded."}</p>
                    </div>

                    <div className="piano-service-history-billing">
                      <div>
                        <span className="piano-detail-label">Billed</span>
                        <strong>{charges.length ? formatCurrency(billedTotal) : "No charge details"}</strong>
                      </div>
                      <div>
                        <span className="piano-detail-label">Payment received</span>
                        <strong>{formatCurrency(appointment.payment)}</strong>
                      </div>
                      <div>
                        <span className="piano-detail-label">Payment type</span>
                        <strong>{appointment.payment_type || "—"}</strong>
                      </div>
                      <div>
                        <span className="piano-detail-label">Invoice</span>
                        <strong>{appointment.invoice || "—"}</strong>
                      </div>
                    </div>

                    {charges.length > 0 && (
                      <div className="piano-service-history-charges">
                        <span className="piano-detail-label">Charge details</span>
                        {charges.map((charge) => (
                          <div className="piano-service-history-charge" key={charge.id}>
                            <span>{charge.service_name}{charge.discount_amount > 0 ? ` · ${formatCurrency(charge.discount_amount)} discount` : ""}</span>
                            <strong>{formatCurrency(charge.final_amount)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="piano-service-history-empty">No completed service history has been recorded for this piano yet.</div>
          )}
        </section>

        {showEditForm && (
          <PianoForm
            piano={piano}
            onClose={() => setShowEditForm(false)}
            onSaved={async () => {
              setShowEditForm(false);
              await loadPiano();
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default PianoDetail;
