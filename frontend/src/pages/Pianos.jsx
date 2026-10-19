import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deletePiano, getAppointments, getClients, getPianos } from "../services/api";
import PageLayout from "../components/PageLayout";
import PianoForm from "../components/PianoForm";
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

function Pianos() {
  const navigate = useNavigate();

  const [pianos, setPianos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadPianos() {
    try {
      setLoading(true);

      const [pianoResult, appointmentResult, clientResult] = await Promise.allSettled([
        getPianos(),
        getAppointments(),
        getClients(),
      ]);

      if (pianoResult.status === "rejected") throw pianoResult.reason;

      const pianoData = pianoResult.value;
      const appointments = appointmentResult.status === "fulfilled" ? appointmentResult.value : [];
      const clients = clientResult.status === "fulfilled" ? clientResult.value : [];
      const clientsById = new Map(clients.map((client) => [String(client.id), client]));
      const lastTunedByPiano = new Map();

      appointments.forEach((appointment) => {
        if (String(appointment.status || "").toLowerCase() !== "completed") return;
        const appointmentDate = new Date(appointment.start_time);
        if (Number.isNaN(appointmentDate.getTime())) return;

        (appointment.appointment_pianos || []).forEach((item) => {
          if (!item.piano_id || !/tun/i.test(item.service || "")) return;
          const key = String(item.piano_id);
          const previous = lastTunedByPiano.get(key);
          if (!previous || appointmentDate > previous) lastTunedByPiano.set(key, appointmentDate);
        });
      });

      setPianos(pianoData.map((piano) => {
        const lastTunedAt = lastTunedByPiano.get(String(piano.id)) || null;
        const client = clientsById.get(String(piano.client_id)) || piano.client || null;

        return {
          ...piano,
          client,
          clientSummary: getClientSummary(client),
          lastTunedAt,
          nextTuningDue: getNextTuningDate(lastTunedAt, piano.tuning_period),
        };
      }));
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to load pianos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPianos();
  }, []);

  async function handleDelete(piano) {
    const description = [piano.make, piano.model, piano.serial ? `(${piano.serial})` : null]
      .filter(Boolean)
      .join(" ");

    const confirmed = window.confirm(
      `Are you sure you want to delete ${description || "this piano"}?`
    );
    if (!confirmed) return;

    try {
      await deletePiano(piano.id);
      await loadPianos();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  const filteredPianos = pianos.filter((piano) => {
    const search = searchTerm.toLowerCase();

    return (
      (piano.make ?? "").toLowerCase().includes(search) ||
      (piano.model ?? "").toLowerCase().includes(search) ||
      (piano.serial ?? "").toLowerCase().includes(search) ||
      (piano.type ?? "").toLowerCase().includes(search) ||
      (piano.location ?? "").toLowerCase().includes(search) ||
      (piano.client?.name ?? "").toLowerCase().includes(search) ||
      (piano.clientSummary ?? "").toLowerCase().includes(search) ||
      formatDate(piano.lastTunedAt).toLowerCase().includes(search) ||
      formatDate(piano.nextTuningDue).toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <PageLayout title="Pianos">
        <div className="pianos-loading">Loading Pianos...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Pianos">
      <div className="pianos-page">
        <div className="pianos-toolbar">
          <div className="pianos-count">
            {filteredPianos.length} {filteredPianos.length === 1 ? "piano" : "pianos"}
          </div>

          <input
            className="piano-search"
            type="text"
            placeholder="Search pianos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button className="add-piano-button action-button action-button--primary" onClick={() => setShowForm(true)}>
            + Add Piano
          </button>
        </div>

        {filteredPianos.length > 0 ? (
          <section className="piano-panel-grid" aria-label="Pianos">
            {filteredPianos.map((piano) => (
              <article
                className="piano-panel"
                key={piano.id}
                onClick={() => navigate(`/pianos/${piano.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/pianos/${piano.id}`);
                  }
                }}
                role="link"
                tabIndex={0}
              >
                <div className="piano-panel-main">
                  <div className="piano-panel-heading">
                    <button
                      type="button"
                      className="piano-panel-name"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/pianos/${piano.id}`);
                      }}
                    >
                      {[piano.make, piano.model].filter(Boolean).join(" ") || "Unnamed piano"}
                    </button>
                    {piano.type && <span className="piano-panel-type">{piano.type}</span>}
                  </div>

                  <div className="piano-panel-details">
                    <div className="piano-panel-detail">
                      <span className="piano-panel-label">Serial</span>
                      <span className="piano-panel-value">{piano.serial || "—"}</span>
                    </div>
                    <div className="piano-panel-detail">
                      <span className="piano-panel-label">Location</span>
                      <span className="piano-panel-value">{piano.location || "—"}</span>
                    </div>
                    <div className="piano-panel-detail piano-panel-client">
                      <span className="piano-panel-label">Client</span>
                      {piano.client ? (
                        <button
                          type="button"
                          className="piano-panel-client-link"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/clients/${piano.client.id}`);
                          }}
                        >
                          {piano.client.name}
                        </button>
                      ) : (
                        <span className="piano-panel-value">Unassigned</span>
                      )}
                      {piano.clientSummary && piano.client && (
                        <span className="piano-panel-client-summary">{piano.clientSummary}</span>
                      )}
                    </div>
                    <div className="piano-panel-detail">
                      <span className="piano-panel-label">Last tuning</span>
                      <span className="piano-panel-value">{formatDate(piano.lastTunedAt)}</span>
                    </div>
                    {piano.tuning_period ? (
                      <div className="piano-panel-detail">
                        <span className="piano-panel-label">Next tuning due</span>
                        <span className="piano-panel-value">
                          {piano.nextTuningDue ? formatDate(piano.nextTuningDue) : "No tuning history"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="piano-panel-actions">
                  <button
                    type="button"
                    className="action-button action-button--danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(piano);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="pianos-empty">
            <p>No pianos found.</p>
            <span>Try another search or add a piano.</span>
          </div>
        )}

        {showForm && (
          <PianoForm
            onClose={() => setShowForm(false)}
            onSaved={async () => {
              setShowForm(false);
              await loadPianos();
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default Pianos;
