import { useEffect, useState } from "react";
import { getClients } from "../services/api";
import ClientTable from "../components/ClientTable";
import PageLayout from "../components/PageLayout";

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    loadClients();
  }, []);

  if (loading) {
    return <p>Loading clients...</p>;
  }

  return (
    <PageLayout title="Clients">
      <div>
        <button>Add Client</button>
      </div>
      <ClientTable clients={clients} />
    </PageLayout>
  );
}

export default Clients;