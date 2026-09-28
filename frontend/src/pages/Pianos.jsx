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

        <div className="piano-table-wrapper">
          <table className="piano-table">
            <thead>
              <tr>
                <th>Make</th>
                <th>Model</th>
                <th>Serial</th>
                <th>Type</th>
                <th>Location</th>
                <th>Client</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredPianos.map((piano) => (
                <tr
                  key={piano.id}
                  onClick={() => navigate(`/pianos/${piano.id}`)}
                  className="piano-row"
                >
                  <td>{piano.make || "—"}</td>
                  <td>{piano.model || "—"}</td>
                  <td>{piano.serial || "—"}</td>
                  <td>{piano.type || "—"}</td>
                  <td>{piano.location || "—"}</td>
                  <td>{piano.client?.name || "Unassigned"}</td>
                  <td>
                    <button
                      className="piano-delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(piano);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPianos.length === 0 && (
          <div className="pianos-empty">No pianos found.</div>
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