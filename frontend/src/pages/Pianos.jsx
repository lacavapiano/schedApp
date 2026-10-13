import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deletePiano, getPianos } from "../services/api";
import PageLayout from "../components/PageLayout";
import PianoForm from "../components/PianoForm";
import "../styles/Pianos.css";

function Pianos() {
  const navigate = useNavigate();

  const [pianos, setPianos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadPianos() {
    try {
      setLoading(true);
      const data = await getPianos();
      setPianos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPianos();
  }, []);

  async function handleDelete(piano) {
    const description = [
      piano.make,
      piano.model,
      piano.serial ? `(${piano.serial})` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const confirmed = window.confirm(
      `Are you sure you want to delete ${description || "this piano"}?`
    );

    if (!confirmed) {
      return;
    }

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
      (piano.client?.name ?? "").toLowerCase().includes(search)
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
            {filteredPianos.length}{" "}
            {filteredPianos.length === 1 ? "piano" : "pianos"}
          </div>

          <input
            className="piano-search"
            type="text"
            placeholder="Search pianos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button
            className="add-piano-button"
            onClick={() => setShowForm(true)}
          >
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
                      <span className="piano-panel-value">{piano.serial || "Not provided"}</span>
                    </div>
                    <div className="piano-panel-detail">
                      <span className="piano-panel-label">Location</span>
                      <span className="piano-panel-value">{piano.location || "Not provided"}</span>
                    </div>
                    <div className="piano-panel-detail">
                      <span className="piano-panel-label">Client</span>
                      <span className="piano-panel-value">{piano.client?.name || "Unassigned"}</span>
                    </div>
                  </div>
                </div>

                <div className="piano-panel-actions">
                  <button
                    type="button"
                    className="piano-delete-button"
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