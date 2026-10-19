import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deletePiano, getAppointments, getAppointmentCharges, getPiano, getServiceTypes } from "../services/api";
import PianoForm from "../components/PianoForm";
import PageLayout from "../components/PageLayout";
import "../styles/Pianos.css";
import "../styles/ActionButtons.css";
import "../styles/RecordDetailLayout.css";
import "../styles/PianoClimateHistory.css"; // Chart styles are committed alongside this page.

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


function PianoClimateHistory({ history }) {
  const records = [...history]
    .filter(({ item, appointmentDate }) =>
      appointmentDate &&
      ((item.temp !== null && item.temp !== undefined && item.temp !== "" && Number.isFinite(Number(item.temp))) ||
       (item.hum !== null && item.hum !== undefined && item.hum !== "" && Number.isFinite(Number(item.hum))))
    )
    .sort((a, b) => a.appointmentDate - b.appointmentDate);

  if (!records.length) {
    return (
      <section className="piano-climate-history piano-detail-section" aria-labelledby="piano-climate-history-title">
        <div className="piano-climate-heading">
          <div>
            <h3 id="piano-climate-history-title">Temperature &amp; Humidity</h3>
            <p>Measurements recorded during completed service visits.</p>
          </div>
        </div>
        <div className="piano-climate-empty">No temperature or humidity readings have been recorded yet.</div>
      </section>
    );
  }

  const width = 800;
  const height = 340;
  const left = 76;
  const right = 24;
  const top = 28;
  const bottom = 42;
  const plotWidth = width - left - right;
  const bandHeight = 104;
  const gap = 36;
  const tempTop = top;
  const humTop = top + bandHeight + gap;
  const validValue = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  const temps = records.map(({ item }) => item.temp).filter(validValue).map(Number);
  const hums = records.map(({ item }) => item.hum).filter(validValue).map(Number);
  const paddedRange = (values, padding, minLimit = -Infinity, maxLimit = Infinity) => {
    if (!values.length) return [0, 1];
    let min = Math.max(minLimit, Math.floor(Math.min(...values) - padding));
    let max = Math.min(maxLimit, Math.ceil(Math.max(...values) + padding));
    if (max <= min) {
      min = Math.max(minLimit, min - 1);
      max = Math.min(maxLimit, max + 1);
    }
    if (max <= min) max = min + 1;
    return [min, max];
  };
  const [tempMin, tempMax] = paddedRange(temps, 2);
  const [humMin, humMax] = paddedRange(hums, 5, 0, 100);
  const x = (index) => left + (records.length < 2 ? plotWidth / 2 : index * plotWidth / (records.length - 1));
  const yFor = (value, min, max, bandTop) => bandTop + bandHeight - ((value - min) / Math.max(1, max - min)) * bandHeight;
  const tempPoints = records.map(({ item }, index) => validValue(item.temp) ? ({ x: x(index), y: yFor(Number(item.temp), tempMin, tempMax, tempTop), value: Number(item.temp) }) : null).filter(Boolean);
  const humPoints = records.map(({ item }, index) => validValue(item.hum) ? ({ x: x(index), y: yFor(Number(item.hum), humMin, humMax, humTop), value: Number(item.hum) }) : null).filter(Boolean);
  const pathFor = (points) => points.map((point, index) => \`\${index ? "L" : "M"} \${point.x} \${point.y}\`).join(" ");
  const labelIndexes = [...new Set([0, Math.floor((records.length - 1) / 3), Math.floor(2 * (records.length - 1) / 3), records.length - 1])];

  return (
    <section className="piano-climate-history piano-detail-section" aria-labelledby="piano-climate-history-title">
      <div className="piano-climate-heading">
        <div>
          <h3 id="piano-climate-history-title">Temperature &amp; Humidity</h3>
          <p>Recorded conditions across completed service visits, oldest to newest.</p>
        </div>
        <span className="piano-climate-count">{records.length} {records.length === 1 ? "reading" : "readings"}</span>
      </div>
      <div className="piano-climate-legend">
        <span><i className="piano-climate-key piano-climate-key--temp" /> Temperature (°F)</span>
        <span><i className="piano-climate-key piano-climate-key--hum" /> Humidity (%)</span>
      </div>
      <div className="piano-climate-chart-wrap">
        <svg className="piano-climate-chart piano-climate-chart--stacked" viewBox={\`0 0 \${width} \${height}\`} role="img" aria-label="Temperature in degrees Fahrenheit shown in the upper graph and relative humidity percentage shown in the lower graph, over time">
          <text x="16" y={tempTop + bandHeight / 2} textAnchor="middle" transform={\`rotate(-90 16 \${tempTop + bandHeight / 2})\`} className="piano-climate-axis-title piano-climate-axis-title--temp">Temperature (°F)</text>
          <text x="16" y={humTop + bandHeight / 2} textAnchor="middle" transform={\`rotate(-90 16 \${humTop + bandHeight / 2})\`} className="piano-climate-axis-title piano-climate-axis-title--hum">Humidity (%)</text>
          {[0, 1, 2, 3].map((tick) => {
            const tempY = tempTop + (bandHeight * tick) / 3;
            const humY = humTop + (bandHeight * tick) / 3;
            const tempLabel = Math.round(tempMax - ((tempMax - tempMin) * tick) / 3);
            const humLabel = Math.round(humMax - ((humMax - humMin) * tick) / 3);
            return <g key={tick}>
              <line x1={left} x2={width - right} y1={tempY} y2={tempY} className="piano-climate-gridline" />
              <line x1={left} x2={width - right} y1={humY} y2={humY} className="piano-climate-gridline" />
              <text x={left - 10} y={tempY + 4} textAnchor="end" className="piano-climate-axis-label">{temps.length ? tempLabel : "—"}</text>
              <text x={left - 10} y={humY + 4} textAnchor="end" className="piano-climate-axis-label">{hums.length ? humLabel : "—"}</text>
            </g>;
          })}
          {tempPoints.length > 0 && <path d={pathFor(tempPoints)} className="piano-climate-line piano-climate-line--temp" />}
          {humPoints.length > 0 && <path d={pathFor(humPoints)} className="piano-climate-line piano-climate-line--hum" />}
          {tempPoints.map((point, index) => <circle key={\`t-\${index}\`} cx={point.x} cy={point.y} r="3.5" className="piano-climate-point piano-climate-point--temp"><title>{point.value}°F</title></circle>)}
          {humPoints.map((point, index) => <circle key={\`h-\${index}\`} cx={point.x} cy={point.y} r="3.5" className="piano-climate-point piano-climate-point--hum"><title>{point.value}%</title></circle>)}
          {labelIndexes.map((index) => <text key={index} x={x(index)} y={height - 14} textAnchor={index === 0 ? "start" : index === records.length - 1 ? "end" : "middle"} className="piano-climate-date-label">{formatDate(records[index].appointmentDate)}</text>)}
        </svg>
      </div>
    </section>
  );
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
  const [serviceHistory, setServiceHistory] = useState([]);

  async function loadPiano() {
    try {
      setLoading(true);
      setError("");

      const data = await getPiano(id);
      let lastTunedAt = null;
      let history = [];

      try {
        const [appointmentResult, serviceTypeResult] = await Promise.allSettled([getAppointments(), getServiceTypes({ includeInactive: true })]);
        if (appointmentResult.status === "rejected") throw appointmentResult.reason;
        const appointments = appointmentResult.value;
        const serviceTypes = serviceTypeResult.status === "fulfilled" ? serviceTypeResult.value : [];
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

        const latestTuning = history.find(({ appointment, item }) => isTuningService(item, serviceTypes, appointment.appointment_charges));
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

        <PianoClimateHistory history={serviceHistory} />

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
