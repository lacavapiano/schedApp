import { useEffect, useState } from "react";
import { getClients, deleteClient } from "../services/api";
import ClientTable from "../components/ClientTable";
import PageLayout from "../components/PageLayout";
import AddClientModal from "../components/AddClientModal";
import "../styles/Clients.css";

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadClients() {
    try {
      const data = await getClients();
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(client) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${client.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteClient(client.id);

      await loadClients();
    } catch (error) {
      console.error(error);
      alert(error.message);
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
        <div className="clients-toolbar">
          <div className="clients-count">
            {filteredClients.length}{" "}
            {filteredClients.length === 1 ? "client" : "clients"}
          </div>

          <input
            className="client-search"
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button
            className="add-client-button"
            onClick={() => setShowAddClient(true)}
          >
            + Add Client
          </button>
        </div>
        
        <ClientTable
          clients={filteredClients}
          onEdit={setEditingClient}
          onDelete={handleDelete}
        />

        {showAddClient && (
          <AddClientModal
            onClose={() => setShowAddClient(false)}
            onClientAdded={loadClients}
          />
        )}

        {editingClient && (
          <AddClientModal
            client={editingClient}
            onClose={() => setEditingClient(null)}
            onSaved={loadClients}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default Clients;