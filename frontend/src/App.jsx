import { useEffect, useState } from "react";
import { getClients } from "./services/api";

function App() {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Clients</h1>

      {clients.map((client) => (
        <div key={client.id}>
          {client.name} {client.institution}
        </div>
      ))}
    </div>
  );
}

export default App;