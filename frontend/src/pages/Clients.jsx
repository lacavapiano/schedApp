import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClients } from "../services/api";
import ClientTable from "../components/ClientTable";
import PageLayout from "../components/PageLayout";
import AddClientModal from "../components/AddClientModal";
import "../styles/Clients.css";
import "../styles/ActionButtons.css";
import "../styles/RecordListToolbar.css";

function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadClients() {
    try {
      const data = await getClients();
      setClients(
        data.map((client) => ({
          ...client,
          piano_count: Array.isArray(client.pianos) ? client.pianos.length : 0,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase();

    return (
      (client.name ?? "").toLowerCase().includes(search) ||
      (client.institution ?? "").toLowerCase().includes(search) ||
      (client.phone ?? "").toLowerCase().includes(search) ||
      (client.email ?? "").toLowerCase().includes(search) ||
      (client.address ?? "").toLowerCase().includes(search) ||
      (client.city ?? "").toLowerCase().includes(search) ||
      (client.state ?? "").toLowerCase().includes(search) ||
      (client.zip ?? "").toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    loadClients();
  }, []);

  if (loading) {
    return (
      <PageLayout>
        <div className="clients-loading">
          Loading Clients...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Clients">
      <div className="clients-page">
        <div className="record-list-toolbar">
          <div className="record-list-count">
            {filteredClients.length}{" "}
            {filteredClients.length === 1 ? "client" : "clients"}
          </div>

          <input
            className="record-list-search"
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button
            className="add-client-button action-button action-button--primary"
            onClick={() => setShowAddClient(true)}
          >
            + Add Client
          </button>
        </div>

        <ClientTable
          clients={filteredClients}
          onSelect={(client) => navigate(`/clients/${client.id}`)}
        />

        {showAddClient && (
          <AddClientModal
            onClose={() => setShowAddClient(false)}
            onClientAdded={async () => {
              setShowAddClient(false);
              await loadClients();
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default Clients;
