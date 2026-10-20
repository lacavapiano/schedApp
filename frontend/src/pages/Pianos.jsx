import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAppointments, getClients, getPianos, getServiceTypes } from "../services/api";
import PageLayout from "../components/PageLayout";
import PianoForm from "../components/PianoForm";
import "../styles/Pianos.css";
import "../styles/ActionButtons.css";
import "../styles/RecordListToolbar.css";

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
  if (typeof item?.service === "string") return item.service.trim();
  return item?.service?.name || item?.service_type?.name ||
    item?.serviceType?.name || item?.service_type_name || "";
}

function isTuningService(item, serviceTypes = []) {
  const serviceName = getServiceName(item).trim().toLocaleLowerCase();
  if (!serviceName) return false;
  const catalogService = serviceTypes.find((service) => String(service.name || "").trim().toLocaleLowerCase() === serviceName);
  if (catalogService) return catalogService.is_tuning === true;
  return /tuning|tune|concert|pitch\s*correction|standard\s+service\s+visit/i.test(serviceName);
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
  const [sortBy, setSortBy] = useState("client");
  const [sortDirection, setSortDirection] = useState("asc");
  const [tuningAgeFilter, setTuningAgeFilter] = useState("all");
  const [tuningAgeMonths, setTuningAgeMonths] = useState("6");

  async function loadPianos() {
    try {
      setLoading(true);

      const [pianoResult, appointmentResult, clientResult, serviceTypeResult] = await Promise.allSettled([
        getPianos(),
        getAppointments(),
        getClients(),
        getServiceTypes({ includeInactive: true }),
      ]);

      if (pianoResult.status === "rejected") throw pianoResult.reason;

      const pianoData = pianoResult.value;
      const appointments = appointmentResult.status === "fulfilled" ? appointmentResult.value : [];
      const clients = clientResult.status === "fulfilled" ? clientResult.value : [];
      const serviceTypes = serviceTypeResult.status === "fulfilled" ? serviceTypeResult.value : [];
      const clientsById = new Map(clients.map((client) => [String(client.id), client]));
      const lastTunedByPiano = new Map();

      appointments.forEach((appointment) => {
        if (String(appointment.status || "").toLowerCase() !== "completed") return;
        const appointmentDate = new Date(appointment.start_time);
        if (Number.isNaN(appointmentDate.getTime())) return;

        (appointment.appointment_pianos || []).forEach((item) => {
          const pianoId = item.piano_id ?? item.piano?.id;
          if (!pianoId || !isTuningService(item, serviceTypes, appointment.appointment_charges)) return;
          const key = String(pianoId);
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
  }).filter((piano) => {
    if (tuningAgeFilter === "all") return true;
    // Pianos without a recorded tuning date cannot be compared to an age threshold.
    if (!piano.lastTunedAt) return false;

    const months = Number(tuningAgeMonths);
    if (!Number.isFinite(months) || months < 0) return true;

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const lastTuned = new Date(piano.lastTunedAt);

    return tuningAgeFilter === "more"
      ? lastTuned < cutoff
      : lastTuned >= cutoff;
  });

  const sortedPianos = [...filteredPianos].sort((a, b) => {
    let comparison = 0;

    if (sortBy === "client") {
      comparison = (a.client?.name || "Unassigned").localeCompare(
        b.client?.name || "Unassigned",
        undefined,
        { sensitivity: "base" }
      );
    } else {
      const field = sortBy === "lastTuned" ? "lastTunedAt" : "nextTuningDue";
      const aTime = a[field] ? new Date(a[field]).getTime() : null;
      const bTime = b[field] ? new Date(b[field]).getTime() : null;

      // Keep missing dates at the bottom regardless of sort direction.
      if (aTime === null && bTime === null) comparison = 0;
      else if (aTime === null) comparison = 1;
      else if (bTime === null) comparison = -1;
      else comparison = aTime - bTime;
    }

    if (sortBy !== "client") {
      const field = sortBy === "lastTuned" ? "lastTunedAt" : "nextTuningDue";
      if (!a[field] && b[field]) return 1;
      if (a[field] && !b[field]) return -1;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  function handleSort(field) {
    if (sortBy === field) {
      setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  }

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
        <div className="record-list-toolbar">
          <div className="record-list-count">
            {filteredPianos.length} {filteredPianos.length === 1 ? "piano" : "pianos"}
          </div>

          <input
            className="record-list-search"
            type="text"
            placeholder="Search pianos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button className="add-piano-button action-button action-button--primary" onClick={() => setShowForm(true)}>
            + Add Piano
          </button>
        </div>

        <div className="piano-tuning-age-filter" aria-label="Filter by last tuning date">
          <span className="piano-list-sort-label">Last tuned</span>
          <div className="piano-tuning-age-controls">
            <button
              type="button"
              className={`piano-sort-button${tuningAgeFilter === "all" ? " is-active" : ""}`}
              aria-pressed={tuningAgeFilter === "all"}
              onClick={() => setTuningAgeFilter("all")}
            >
              Any time
            </button>
            <button
              type="button"
              className={`piano-sort-button${tuningAgeFilter === "more" ? " is-active" : ""}`}
              aria-pressed={tuningAgeFilter === "more"}
              onClick={() => setTuningAgeFilter("more")}
            >
              More than
            </button>
            <button
              type="button"
              className={`piano-sort-button${tuningAgeFilter === "less" ? " is-active" : ""}`}
              aria-pressed={tuningAgeFilter === "less"}
              onClick={() => setTuningAgeFilter("less")}
            >
              Less than
            </button>
            <label className="piano-tuning-months">
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                aria-label="Months since last tuning"
                value={tuningAgeMonths}
                onChange={(event) => setTuningAgeMonths(event.target.value)}
              />
              <span>months ago</span>
            </label>
          </div>
        </div>

        <div className="piano-list-sort" role="group" aria-label="Sort pianos">
          <span className="piano-list-sort-label">Sort by</span>
          {[
            { value: "client", label: "Client" },
            { value: "lastTuned", label: "Last tuned" },
            { value: "nextTuningDue", label: "Next tuning due" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`piano-sort-button${sortBy === option.value ? " is-active" : ""}`}
              aria-pressed={sortBy === option.value}
              onClick={() => handleSort(option.value)}
            >
              {option.label}
              {sortBy === option.value && (
                <span className="piano-sort-direction" aria-label={sortDirection === "asc" ? "ascending" : "descending"}>
                  {sortDirection === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
          ))}
        </div>

        {sortedPianos.length > 0 ? (
          <section className="piano-panel-grid" aria-label="Pianos">
            {sortedPianos.map((piano) => (
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
                      {`${[piano.make, piano.model].filter(Boolean).join(" ") || "Unnamed piano"} - ${piano.serial || "No serial"}`}
                    </button>
                  </div>

                  <div className="piano-panel-details">
                    <div className="piano-panel-detail piano-panel-client">
                      <span className="piano-panel-label">Owner</span>
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
                    </div>
                    <div className="piano-panel-detail">
                      <span className="piano-panel-label">Location</span>
                      <span className="piano-panel-value">{piano.location || "—"}</span>
                    </div>
                    <div className="piano-panel-detail">
                      <span className="piano-panel-label">Last tuned</span>
                      <span className="piano-panel-value">{formatDate(piano.lastTunedAt)}</span>
                    </div>
                  </div>
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
