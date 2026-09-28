import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPiano } from "../services/api";
import PianoForm from "../components/PianoForm";
import PageLayout from "../components/PageLayout";
import "../styles/Pianos.css";

function PianoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [piano, setPiano] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditForm, setShowEditForm] = useState(false);

  async function loadPiano() {
    try {
      setLoading(true);
      setError("");

      const data = await getPiano(id);
      setPiano(data);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
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

          <button onClick={() => navigate("/pianos")}>
            ← Back to Pianos
          </button>
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
        <div className="piano-detail-toolbar">
          <button
            className="piano-back-button"
            onClick={() => navigate("/pianos")}
          >
            ← Back to Pianos
          </button>

          <button
            className="piano-edit-button"
            onClick={() => setShowEditForm(true)}
          >
            Edit Piano
          </button>
        </div>

        <div className="piano-detail-header">
          <h2>
            {[piano.make, piano.model].filter(Boolean).join(" ") ||
              "Piano"}
          </h2>

          {piano.type && (
            <span className="piano-type-badge">{piano.type}</span>
          )}
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
                    onClick={() =>
                      navigate(`/clients/${piano.client.id}`)
                    }
                  >
                    {piano.client.name}
                  </button>
                ) : (
                  <span>Unassigned</span>
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
                <span className="piano-detail-label">
                  Climate Control
                </span>
                <span>{piano.climate_control || "—"}</span>
              </div>
            </div>
          </section>

          <section className="piano-detail-section">
            <h3>Maintenance</h3>

            <div className="piano-detail-fields">
              <div>
                <span className="piano-detail-label">
                  Tuning Period
                </span>

                <span>
                  {piano.tuning_period
                    ? `${piano.tuning_period} months`
                    : "—"}
                </span>
              </div>
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