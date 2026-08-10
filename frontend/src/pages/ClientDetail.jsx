import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClient } from "../services/api";
import AddClientModal from "../components/AddClientModal";

function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  async function handleClientSaved() {
    const updatedClient = await getClient(id);
    setClient(updatedClient);
    setShowEditModal(false);
  }

  async function loadClient() {
    try {
      setLoading(true);

      const data = await getClient(id);

      setClient(data);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClient();
  }, [id]);

  if (loading) {
    return <p>Loading client...</p>;
  }

  if (error) {
    return (
      <div>
        <p>{error}</p>

        <button onClick={() => navigate("/clients")}>
          Back to Clients
        </button>
      </div>
    );
  }

  if (!client) {
    return <p>Client not found.</p>;
  }

  return (
    <div>
      <button onClick={() => navigate("/clients")}>
        ← Back to Clients
      </button>

      <h1>{client.name}</h1>

      <button onClick={() => setShowEditModal(true)}>
        Edit Client
      </button>

      <section>
        <h2>Contact Information</h2>

        <p>
          <strong>Institution:</strong>{" "}
          {client.institution || "—"}
        </p>

        <p>
          <strong>Phone:</strong>{" "}
          {client.phone || "—"}
        </p>

        <p>
          <strong>Email:</strong>{" "}
          {client.email || "—"}
        </p>
      </section>

      <section>
        <h2>Address</h2>

        <p>{client.address || "—"}</p>

        <p>
          {client.city || "—"},{" "}
          {client.state || "—"}{" "}
          {client.zip || ""}
        </p>
      </section>

      <section>
        <h2>Notes</h2>

        <p>
          {client.notes || "No notes for this client."}
        </p>
      </section>

      {showEditModal && (
        <AddClientModal
          client={client}
          onClose={() => setShowEditModal(false)}
          onSaved={handleClientSaved}
        />
      )}
    </div>
  );
}

export default ClientDetail;