import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deletePiano, getAppointments, getPiano } from "../services/api";
import PianoForm from "../components/PianoForm";
import PageLayout from "../components/PageLayout";
import "../styles/Pianos.css";
import "../styles/ActionButtons.css";

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
  const [deletingPiano, setDeletingPiano] = useState(false);

  async function loadPiano() {
    try {
      setLoading(true);
      setError("");

      const data = await getPiano(id);
      let lastTunedAt = null;

      try {
        const appointments = await getAppointments();
        appointments.forEach((appointment) => {
          if (String(appointment.status || "").toLowerCase() !== "completed") return;
          const appointmentDate = new Date(appointment.start_time);
          if (Number.isNaN(appointmentDate.getTime())) return;

          const hasTuning = (appointment.appointment_pianos || []).some(
            (item) => String(item.piano_id) === String(data.id) && /tun/i.test(item.service || "")
          );

          if (hasTuning && (!lastTunedAt || appointmentDate > lastTunedAt)) {
            lastTunedAt = appointmentDate;
          }
        });
      } catch (appointmentError) {
        console.error("Unable to load tuning history:", appointmentError);
      }

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
      <div className="piano-detail-page">
        <div className="piano-detail-toolbar detail-action-toolbar">
          <button className="piano-back-button action-button action-button--quiet" onClick={() => navigate("/pianos")}>
            ← Back to Pianos
          </button>
          <div className="detail-action-toolbar-actions">
            <button className="piano-edit-button action-button action-button--primary" onClick={() => setShowEditForm(true)}>
              Edit Piano
            </button>
            <button
              className="detail-action-delete-button action-button action-button--danger"
              onClick={handleDeletePiano}
              disabled={deletingPiano}
            >
              {deletingPiano ? "Deleting..." : "Delete Piano"}
            </button>
          </div>
        </div>

        {deleteError && <p className="detail-action-delete-error action-button-error" role="alert">{deleteError}</p>}

        <div className="piano-detail-header">
          <h2>{[piano.make, piano.model].filter(Boolean).join(" ") || "Piano"}</h2>
          {piano.type && <span className="piano-type-badge">{piano.type}</span>}
        </div>

        <div className="piano-detail-grid">
          <section className="piano-detail-section">
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

          <section className="piano-detail-section">
            <h3>Location & Ownership</h3>
            <div className="piano-detail-fields">
              <div>
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

          <section className="piano-detail-section">
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

          <section className="piano-detail-section">
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
