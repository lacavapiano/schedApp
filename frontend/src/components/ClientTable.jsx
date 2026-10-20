import { useMemo } from "react";
import "../styles/ClientTable.css";

function ClientTable({ clients, onSelect }) {
  const sortedClients = useMemo(
    () =>
      [...clients].sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [clients]
  );

  const getPrimaryEmail = (client) => {
    const emails = client.client_emails ?? [];
    const primary = emails.find((email) => email.is_primary);
    return primary?.email || emails[0]?.email || "";
  };

  const getPrimaryPhone = (client) => {
    const phones = client.client_phones ?? [];
    const primary = phones.find((phone) => phone.is_primary);
    return primary?.phone || phones[0]?.phone || "";
  };

  const getTownZip = (client) => {
    const addresses = client.client_addresses ?? [];
    const address =
      addresses.find((item) => item.is_primary) || addresses[0];
    return [address?.city, address?.zip].filter(Boolean).join(" / ");
  };

  if (clients.length === 0) {
    return (
      <div className="clients-empty">
        <p>No clients found.</p>
        <span>Try another search or add a client.</span>
      </div>
    );
  }

  return (
    <section className="client-panel-grid" aria-label="Clients">
      {sortedClients.map((client) => {
        const email = getPrimaryEmail(client);
        const phone = getPrimaryPhone(client);
        const townZip = getTownZip(client);
        const pianoCount = client.piano_count;
        const isInstitution = client.type === "institution";

        return (
          <article
            className="client-panel"
            key={client.id}
            role="button"
            tabIndex={0}
            aria-label={`View ${client.name || "client"} record`}
            onClick={() => onSelect(client)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(client);
              }
            }}
          >
            <div className="client-panel-main">
              <div className="client-panel-heading">
                <span className="client-panel-name">
                  {client.name || "Unnamed client"}
                </span>
                <span className={`client-type-tag${isInstitution ? " institution" : ""}`}>
                  {isInstitution ? "Institution" : "Individual"}
                </span>
              </div>

              <div className="client-panel-contact">
                <div className="client-panel-contact-item">
                  <span className="client-panel-contact-label">Phone</span>
                  <span className={`client-panel-contact-value${phone ? "" : " is-empty"}`}>
                    {phone || "Not provided"}
                  </span>
                </div>
                <div className="client-panel-contact-item">
                  <span className="client-panel-contact-label">Email</span>
                  <span className={`client-panel-contact-value${email ? "" : " is-empty"}`}>
                    {email || "Not provided"}
                  </span>
                </div>
                <div className="client-panel-contact-item">
                  <span className="client-panel-contact-label">Town / ZIP</span>
                  <span className={`client-panel-contact-value${townZip ? "" : " is-empty"}`}>
                    {townZip || "Not provided"}
                  </span>
                </div>
                <div className="client-panel-contact-item client-panel-piano-count">
                  <span className="client-panel-contact-label">Pianos</span>
                  <span className="client-panel-contact-value">
                    {pianoCount}
                  </span>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default ClientTable;
