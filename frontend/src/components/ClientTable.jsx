import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ClientTable.css";

function ClientTable({ clients, onEdit, onDelete }) {
  const navigate = useNavigate();

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
        const isInstitution = client.type === "institution";

        return (
          <article className="client-panel" key={client.id}>
            <div className="client-panel-main">
              <div className="client-panel-heading">
                <button
                  type="button"
                  className="client-panel-name"
                  onClick={() => navigate(`/clients/${client.id}`)}
                  title={`View ${client.name ?? "client"} details`}
                >
                  {client.name || "Unnamed client"}
                </button>
                <span className={`client-type-tag${isInstitution ? " institution" : ""}`}>
                  {isInstitution ? "Institution" : "Individual"}
                </span>
              </div>

              <div className="client-panel-contact">
                {phone ? (
                  <a className="client-panel-contact-item" href={`tel:${phone}`}>
                    <span className="client-panel-contact-label">Phone</span>
                    <span className="client-panel-contact-value">{phone}</span>
                  </a>
                ) : (
                  <div className="client-panel-contact-item">
                    <span className="client-panel-contact-label">Phone</span>
                    <span className="client-panel-contact-value is-empty">Not provided</span>
                  </div>
                )}

                {email ? (
                  <a className="client-panel-contact-item" href={`mailto:${email}`}>
                    <span className="client-panel-contact-label">Email</span>
                    <span className="client-panel-contact-value">{email}</span>
                  </a>
                ) : (
                  <div className="client-panel-contact-item">
                    <span className="client-panel-contact-label">Email</span>
                    <span className="client-panel-contact-value is-empty">Not provided</span>
                  </div>
                )}
              </div>
            </div>

            <div className="client-panel-actions">
              <button
                type="button"
                className="table-action-button edit-button"
                onClick={() => onEdit(client)}
              >
                Edit
              </button>
              <button
                type="button"
                className="table-action-button delete-button"
                onClick={() => onDelete(client)}
              >
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default ClientTable;
