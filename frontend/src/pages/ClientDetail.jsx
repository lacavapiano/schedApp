import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClient } from "../services/api";
import AddClientModal from "../components/AddClientModal";
import PageLayout from "../components/PageLayout";
import "../styles/ClientDetail.css";

function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  async function loadClient() {
    try {
      setLoading(true);
      setError("");

      const data = await getClient(id);
      setClient(data);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClientSaved() {
    await loadClient();
    setShowEditModal(false);
  }

  useEffect(() => {
    loadClient();
  }, [id]);

  function getPrimaryEmail(emails = []) {
    return (
      emails.find((email) => email.is_primary)?.email ||
      emails[0]?.email ||
      ""
    );
  }

  function getPrimaryPhone(phones = []) {
    return (
      phones.find((phone) => phone.is_primary)?.phone ||
      phones[0]?.phone ||
      ""
    );
  }

  function getPrimaryAddress(addresses = []) {
    return (
      addresses.find((address) => address.is_primary) ||
      addresses[0] ||
      null
    );
  }

  if (loading) {
    return (
      <PageLayout title="Client">
        <div className="client-detail-loading">
          Loading client...
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Client">
        <div className="client-detail-error">
          <p>{error}</p>

          <button
            className="client-detail-button"
            onClick={() => navigate("/clients")}
          >
            ← Back to Clients
          </button>
        </div>
      </PageLayout>
    );
  }

  if (!client) {
    return (
      <PageLayout title="Client">
        <div className="client-detail-error">
          <p>Client not found.</p>

          <button
            className="client-detail-button"
            onClick={() => navigate("/clients")}
          >
            ← Back to Clients
          </button>
        </div>
      </PageLayout>
    );
  }

  const primaryEmail = getPrimaryEmail(client.client_emails);
  const primaryPhone = getPrimaryPhone(client.client_phones);
  const primaryAddress = getPrimaryAddress(client.client_addresses);

  return (
    <PageLayout title={client.name}>
      <div className="client-detail-page">
        <div className="client-detail-toolbar">
          <button
            className="client-detail-back-button"
            onClick={() => navigate("/clients")}
          >
            ← Back to Clients
          </button>

          <button
            className="client-detail-button"
            onClick={() => setShowEditModal(true)}
          >
            Edit Client
          </button>
        </div>

        <div className="client-detail-header">
          <div>
            <h2>{client.name}</h2>

            <span className="client-type-badge">
              {client.type === "institution"
                ? "Institution"
                : "Individual"}
            </span>
          </div>
        </div>

        <div className="client-detail-grid">
          <section className="client-detail-section">
            <h3>Contact Information</h3>

            <div className="client-detail-fields">
              <div className="client-detail-field">
                <span className="client-detail-label">Email</span>
                <span>{primaryEmail || "—"}</span>
              </div>

              <div className="client-detail-field">
                <span className="client-detail-label">Phone</span>
                <span>{primaryPhone || "—"}</span>
              </div>
            </div>
          </section>

          <section className="client-detail-section">
            <h3>Address</h3>

            {primaryAddress ? (
              <div className="client-detail-address">
                {primaryAddress.address && (
                  <div>{primaryAddress.address}</div>
                )}

                {primaryAddress.apt && (
                  <div>{primaryAddress.apt}</div>
                )}

                {(primaryAddress.city ||
                  primaryAddress.state ||
                  primaryAddress.zip) && (
                  <div>
                    {primaryAddress.city}
                    {primaryAddress.city &&
                      (primaryAddress.state ||
                        primaryAddress.zip) &&
                      ", "}
                    {primaryAddress.state}
                    {primaryAddress.state &&
                      primaryAddress.zip &&
                      " "}
                    {primaryAddress.zip}
                  </div>
                )}
              </div>
            ) : (
              <p className="client-detail-empty">—</p>
            )}
          </section>
        </div>

        {client.client_emails?.length > 1 && (
          <section className="client-detail-section">
            <h3>Email Addresses</h3>

            <div className="client-detail-list">
              {client.client_emails.map((email) => (
                <div
                  className="client-detail-list-item"
                  key={email.id}
                >
                  <span>{email.email}</span>

                  {email.label && (
                    <span className="client-detail-item-label">
                      {email.label}
                    </span>
                  )}

                  {email.is_primary && (
                    <span className="client-detail-primary">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {client.client_phones?.length > 1 && (
          <section className="client-detail-section">
            <h3>Phone Numbers</h3>

            <div className="client-detail-list">
              {client.client_phones.map((phone) => (
                <div
                  className="client-detail-list-item"
                  key={phone.id}
                >
                  <span>{phone.phone}</span>

                  {phone.label && (
                    <span className="client-detail-item-label">
                      {phone.label}
                    </span>
                  )}

                  {phone.is_primary && (
                    <span className="client-detail-primary">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {client.client_addresses?.length > 1 && (
          <section className="client-detail-section">
            <h3>Addresses</h3>

            <div className="client-detail-list">
              {client.client_addresses.map((address) => (
                <div
                  className="client-detail-list-item client-detail-address-item"
                  key={address.id}
                >
                  <div>
                    {address.address && (
                      <div>{address.address}</div>
                    )}

                    {address.apt && (
                      <div>{address.apt}</div>
                    )}

                    <div>
                      {address.city}
                      {address.city &&
                        (address.state || address.zip) &&
                        ", "}
                      {address.state}
                      {address.state && address.zip && " "}
                      {address.zip}
                    </div>
                  </div>

                  <div className="client-detail-item-meta">
                    {address.label && (
                      <span className="client-detail-item-label">
                        {address.label}
                      </span>
                    )}

                    {address.is_primary && (
                      <span className="client-detail-primary">
                        Primary
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="client-detail-section">
          <div className="client-detail-section-header">
            <h3>Contacts</h3>
          </div>

          {client.client_contacts?.length > 0 ? (
            <div className="client-contacts">
              {client.client_contacts.map((contact) => {
                const contactEmail = getPrimaryEmail(
                  contact.contact_emails
                );

                const contactPhone = getPrimaryPhone(
                  contact.contact_phones
                );

                return (
                  <div
                    className="client-contact-card"
                    key={contact.id}
                  >
                    <div className="client-contact-header">
                      <div>
                        <h4>{contact.name}</h4>

                        {contact.relationship && (
                          <span className="client-contact-relationship">
                            {contact.relationship}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="client-contact-info">
                      {contactEmail && (
                        <div>
                          <span className="client-detail-label">
                            Email
                          </span>
                          <span>{contactEmail}</span>
                        </div>
                      )}

                      {contactPhone && (
                        <div>
                          <span className="client-detail-label">
                            Phone
                          </span>
                          <span>{contactPhone}</span>
                        </div>
                      )}
                    </div>

                    {contact.notes && (
                      <div className="client-contact-notes">
                        <span className="client-detail-label">
                          Notes
                        </span>
                        <p>{contact.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="client-detail-empty">
              No contacts associated with this client.
            </p>
          )}
        </section>

        <section className="client-detail-section">
          <h3>Notes</h3>

          {client.notes ? (
            <p className="client-detail-notes">
              {client.notes}
            </p>
          ) : (
            <p className="client-detail-empty">
              No notes for this client.
            </p>
          )}
        </section>

        {showEditModal && (
          <AddClientModal
            client={client}
            onClose={() => setShowEditModal(false)}
            onSaved={handleClientSaved}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default ClientDetail;