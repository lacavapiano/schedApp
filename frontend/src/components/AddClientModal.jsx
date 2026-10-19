import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient, updateClient, getPianos, getClients, updatePiano } from "../services/api";
import "../styles/ClientModal.css";

function AddClientModal({
  onClose,
  onClientAdded,
  onSaved,
  onDelete,
  client,
}) {
  const [formData, setFormData] = useState({
    name: "",
    type: "individual",
    emails: [
      {
        email: "",
        label: "",
        is_primary: true,
      },
    ],
    phones: [
      {
        phone: "",
        label: "",
        is_primary: true,
      },
    ],
    addresses: [
      {
        address: "",
        apt: "",
        city: "",
        state: "",
        zip: "",
        label: "",
        is_primary: true,
      },
    ],
    notes: "",
  });

  const [error, setError] = useState("");
  const [clientPianos, setClientPianos] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loadingPianos, setLoadingPianos] = useState(false);
  const [pianoError, setPianoError] = useState("");
  const [transferringPianoId, setTransferringPianoId] = useState(null);
  const [transferClientId, setTransferClientId] = useState("");
  const navigate = useNavigate();

  const isEditing = Boolean(client);

  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        type: client.type || "individual",

        emails:
          client.client_emails?.length > 0
            ? client.client_emails.map((email) => ({
                email: email.email || "",
                label: email.label || "",
                is_primary: Boolean(email.is_primary),
              }))
            : [
                {
                  email: "",
                  label: "",
                  is_primary: true,
                },
              ],

        phones:
          client.client_phones?.length > 0
            ? client.client_phones.map((phone) => ({
                phone: phone.phone || "",
                label: phone.label || "",
                is_primary: Boolean(phone.is_primary),
              }))
            : [
                {
                  phone: "",
                  label: "",
                  is_primary: true,
                },
              ],

        addresses:
          client.client_addresses?.length > 0
            ? client.client_addresses.map((address) => ({
                address: address.address || "",
                apt: address.apt || "",
                city: address.city || "",
                state: address.state || "",
                zip: address.zip || "",
                label: address.label || "",
                is_primary: Boolean(address.is_primary),
              }))
            : [
                {
                  address: "",
                  apt: "",
                  city: "",
                  state: "",
                  zip: "",
                  label: "",
                  is_primary: true,
                },
              ],

        notes: client.notes || "",
      });

      setContacts(
        client.client_contacts?.map((contact) => ({
          name: contact.name || "",
          relationship: contact.relationship || "",
          notes: contact.notes || "",
          emails:
            contact.contact_emails?.map((email) => ({
              email: email.email || "",
              label: email.label || "",
              is_primary: Boolean(email.is_primary),
            })) || [],
          phones:
            contact.contact_phones?.map((phone) => ({
              phone: phone.phone || "",
              label: phone.label || "",
              is_primary: Boolean(phone.is_primary),
            })) || [],
        })) || []
      );
    } else {
      setContacts([]);
    }
  }, [client]);

  async function loadClientPianos() {
    if (!client?.id) {
      setClientPianos([]);
      return;
    }

    setLoadingPianos(true);
    setPianoError("");

    try {
      const [pianoData, clientData] = await Promise.all([
        getPianos(),
        getClients(),
      ]);

      setClientPianos(
        pianoData.filter(
          (piano) =>
            String(piano.client_id ?? piano.client?.id ?? "") ===
            String(client.id)
        )
      );
      setAllClients(clientData);
    } catch (loadError) {
      console.error(loadError);
      setPianoError("Unable to load this client's pianos.");
    } finally {
      setLoadingPianos(false);
    }
  }

  useEffect(() => {
    loadClientPianos();
  }, [client?.id]);

  async function handleTransferPiano(piano) {
    if (!transferClientId) {
      setPianoError("Choose a client to transfer this piano to.");
      return;
    }

    try {
      setPianoError("");
      await updatePiano(piano.id, {
        client_id: transferClientId,
        make: piano.make ?? null,
        model: piano.model ?? null,
        serial: piano.serial ?? null,
        type: piano.type ?? null,
        location: piano.location ?? null,
        quiet_system: piano.quiet_system ?? null,
        climate_control: piano.climate_control ?? null,
        tuning_period: piano.tuning_period ?? null,
      });

      setTransferringPianoId(null);
      setTransferClientId("");
      await loadClientPianos();
      if (onSaved) await onSaved();
    } catch (transferError) {
      console.error(transferError);
      setPianoError(transferError.message || "Unable to transfer piano.");
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleArrayChange(section, index, field, value) {
    setFormData((previous) => ({
      ...previous,
      [section]: previous[section].map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  }

  function handlePrimaryChange(section, index) {
    setFormData((previous) => ({
      ...previous,
      [section]: previous[section].map((item, itemIndex) => ({
        ...item,
        is_primary: itemIndex === index,
      })),
    }));
  }

  function addEmail() {
    setFormData((previous) => ({
      ...previous,
      emails: [
        ...previous.emails,
        {
          email: "",
          label: "",
          is_primary: false,
        },
      ],
    }));
  }

  function addPhone() {
    setFormData((previous) => ({
      ...previous,
      phones: [
        ...previous.phones,
        {
          phone: "",
          label: "",
          is_primary: false,
        },
      ],
    }));
  }

  function addAddress() {
    setFormData((previous) => ({
      ...previous,
      addresses: [
        ...previous.addresses,
        {
          address: "",
          apt: "",
          city: "",
          state: "",
          zip: "",
          label: "",
          is_primary: false,
        },
      ],
    }));
  }

  function removeItem(section, index) {
    setFormData((previous) => {
      const items = previous[section];

      if (items.length === 1) {
        return previous;
      }

      const wasPrimary = items[index].is_primary;

      const updatedItems = items.filter(
        (_, itemIndex) => itemIndex !== index
      );

      if (wasPrimary) {
        updatedItems[0] = {
          ...updatedItems[0],
          is_primary: true,
        };
      }

      return {
        ...previous,
        [section]: updatedItems,
      };
    });
  }

  function addContact() {
    setContacts((previous) => [
      ...previous,
      {
        name: "",
        relationship: "",
        notes: "",
        emails: [],
        phones: [],
      },
    ]);
  }

  function removeContact(index) {
    setContacts((previous) =>
      previous.filter((_, contactIndex) => contactIndex !== index)
    );
  }

  function handleContactChange(index, field, value) {
    setContacts((previous) =>
      previous.map((contact, contactIndex) =>
        contactIndex === index
          ? {
              ...contact,
              [field]: value,
            }
          : contact
      )
    );
  }

  function addContactEmail(contactIndex) {
    setContacts((previous) =>
      previous.map((contact, index) =>
        index === contactIndex
          ? {
              ...contact,
              emails: [
                ...contact.emails,
                {
                  email: "",
                  label: "",
                  is_primary: contact.emails.length === 0,
                },
              ],
            }
          : contact
      )
    );
  }

  function addContactPhone(contactIndex) {
    setContacts((previous) =>
      previous.map((contact, index) =>
        index === contactIndex
          ? {
              ...contact,
              phones: [
                ...contact.phones,
                {
                  phone: "",
                  label: "",
                  is_primary: contact.phones.length === 0,
                },
              ],
            }
          : contact
      )
    );
  }

  function handleContactArrayChange(
    contactIndex,
    section,
    itemIndex,
    field,
    value
  ) {
    setContacts((previous) =>
      previous.map((contact, index) =>
        index === contactIndex
          ? {
              ...contact,
              [section]: contact[section].map((item, index) =>
                index === itemIndex
                  ? {
                      ...item,
                      [field]: value,
                    }
                  : item
              ),
            }
          : contact
      )
    );
  }

  function handleContactPrimaryChange(
    contactIndex,
    section,
    itemIndex
  ) {
    setContacts((previous) =>
      previous.map((contact, index) =>
        index === contactIndex
          ? {
              ...contact,
              [section]: contact[section].map((item, index) => ({
                ...item,
                is_primary: index === itemIndex,
              })),
            }
          : contact
      )
    );
  }

  function removeContactItem(
    contactIndex,
    section,
    itemIndex
  ) {
    setContacts((previous) =>
      previous.map((contact, index) => {
        if (index !== contactIndex) {
          return contact;
        }

        const items = contact[section];

        if (items.length === 1) {
          return {
            ...contact,
            [section]: [],
          };
        }

        const wasPrimary = items[itemIndex].is_primary;

        const updatedItems = items.filter(
          (_, index) => index !== itemIndex
        );

        if (wasPrimary) {
          updatedItems[0] = {
            ...updatedItems[0],
            is_primary: true,
          };
        }

        return {
          ...contact,
          [section]: updatedItems,
        };
      })
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const emails = formData.emails.filter(
      (item) => item.email.trim() !== ""
    );

    const phones = formData.phones.filter(
      (item) => item.phone.trim() !== ""
    );

    const addresses = formData.addresses.filter(
      (item) =>
        item.address.trim() !== "" ||
        item.city.trim() !== "" ||
        item.state.trim() !== "" ||
        item.zip.trim() !== ""
    );

    setError("");

    try {
      const cleanedContacts = contacts
        .map((contact) => ({
          name: contact.name.trim(),
          relationship: contact.relationship.trim(),
          notes: contact.notes.trim(),
          emails: contact.emails.filter(
            (item) => item.email.trim() !== ""
          ),
          phones: contact.phones.filter(
            (item) => item.phone.trim() !== ""
          ),
        }))
        .filter(
          (contact) =>
            contact.name !== "" ||
            contact.relationship !== "" ||
            contact.notes !== "" ||
            contact.emails.length > 0 ||
            contact.phones.length > 0
        );

      const clientData = {
        name: formData.name,
        type: formData.type,
        emails,
        phones,
        addresses,
        notes: formData.notes,
        contacts: cleanedContacts,
      };

      if (isEditing) {
        await updateClient(client.id, clientData);

        if (onSaved) {
          await onSaved();
        }
      } else {
        const createdClient = await createClient(clientData);

        if (onClientAdded) {
          await onClientAdded(createdClient);
        }
      }

      onClose();
    } catch (error) {
      console.log(error);
      setError(error.message);
    }
  }

  return (
    <div className="client-modal-overlay" onClick={onClose}>
      <div
        className="client-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="client-modal-header">
          <h2>
            {isEditing ? "Edit Client" : "Add Client"}
          </h2>

          <button
            type="button"
            className="client-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && <p className="modal-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-field">
            <label>Name *</label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Type */}
          <div className="form-field">
            <label>Type *</label>

            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="individual">Individual</option>
              <option value="institution">Institution</option>
            </select>
          </div>

          {/* Email Addresses */}
          <div className="form-field">
            <div className="repeatable-section-header">
              <label>Email Addresses</label>

              <button
                type="button"
                className="add-item-button"
                onClick={addEmail}
              >
                + Add Email
              </button>
            </div>

            {formData.emails.map((email, index) => (
              <div className="repeatable-item" key={index}>
                <div className="repeatable-input-row">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email.email}
                    onChange={(event) =>
                      handleArrayChange(
                        "emails",
                        index,
                        "email",
                        event.target.value
                      )
                    }
                  />

                  <input
                    type="text"
                    placeholder="Label"
                    value={email.label}
                    onChange={(event) =>
                      handleArrayChange(
                        "emails",
                        index,
                        "label",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="repeatable-item-footer">
                  <label className="primary-label">
                    <input
                      type="radio"
                      name="primary-email"
                      checked={email.is_primary}
                      onChange={() =>
                        handlePrimaryChange("emails", index)
                      }
                    />
                    Primary
                  </label>

                  {formData.emails.length > 1 && (
                    <button
                      type="button"
                      className="remove-item-button"
                      onClick={() =>
                        removeItem("emails", index)
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Phone Numbers */}
          <div className="form-field">
            <div className="repeatable-section-header">
              <label>Phone Numbers</label>

              <button
                type="button"
                className="add-item-button"
                onClick={addPhone}
              >
                + Add Phone
              </button>
            </div>

            {formData.phones.map((phone, index) => (
              <div className="repeatable-item" key={index}>
                <div className="repeatable-input-row">
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={phone.phone}
                    onChange={(event) =>
                      handleArrayChange(
                        "phones",
                        index,
                        "phone",
                        event.target.value
                      )
                    }
                  />

                  <input
                    type="text"
                    placeholder="Label"
                    value={phone.label}
                    onChange={(event) =>
                      handleArrayChange(
                        "phones",
                        index,
                        "label",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="repeatable-item-footer">
                  <label className="primary-label">
                    <input
                      type="radio"
                      name="primary-phone"
                      checked={phone.is_primary}
                      onChange={() =>
                        handlePrimaryChange("phones", index)
                      }
                    />
                    Primary
                  </label>

                  {formData.phones.length > 1 && (
                    <button
                      type="button"
                      className="remove-item-button"
                      onClick={() =>
                        removeItem("phones", index)
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Addresses */}
          <div className="form-field">
            <div className="repeatable-section-header">
              <label>Addresses</label>

              <button
                type="button"
                className="add-item-button"
                onClick={addAddress}
              >
                + Add Address
              </button>
            </div>

            {formData.addresses.map((address, index) => (
              <div
                className="repeatable-item repeatable-address"
                key={index}
              >
                <input
                  type="text"
                  placeholder="Street address"
                  value={address.address}
                  onChange={(event) =>
                    handleArrayChange(
                      "addresses",
                      index,
                      "address",
                      event.target.value
                    )
                  }
                />

                <input
                  type="text"
                  placeholder="Apt / Suite"
                  value={address.apt}
                  onChange={(event) =>
                    handleArrayChange(
                      "addresses",
                      index,
                      "apt",
                      event.target.value
                    )
                  }
                />

                <div className="address-input-row">
                  <input
                    type="text"
                    placeholder="City"
                    value={address.city}
                    onChange={(event) =>
                      handleArrayChange(
                        "addresses",
                        index,
                        "city",
                        event.target.value
                      )
                    }
                  />

                  <select
                    value={address.state}
                    onChange={(event) =>
                      handleArrayChange(
                        "addresses",
                        index,
                        "state",
                        event.target.value
                      )
                    }
                  >
                    <option value="">State</option>
                    <option value="CT">CT</option>
                    <option value="ME">ME</option>
                    <option value="MA">MA</option>
                    <option value="NH">NH</option>
                    <option value="NY">NY</option>
                    <option value="RI">RI</option>
                    <option value="VT">VT</option>
                  </select>

                  <input
                    type="text"
                    placeholder="ZIP"
                    inputMode="numeric"
                    pattern="[0-9]{5}(-[0-9]{4})?"
                    value={address.zip}
                    onChange={(event) =>
                      handleArrayChange(
                        "addresses",
                        index,
                        "zip",
                        event.target.value
                      )
                    }
                  />
                </div>

                <input
                  type="text"
                  placeholder="Label"
                  value={address.label}
                  onChange={(event) =>
                    handleArrayChange(
                      "addresses",
                      index,
                      "label",
                      event.target.value
                    )
                  }
                />

                <div className="repeatable-item-footer">
                  <label className="primary-label">
                    <input
                      type="radio"
                      name="primary-address"
                      checked={address.is_primary}
                      onChange={() =>
                        handlePrimaryChange("addresses", index)
                      }
                    />
                    Primary
                  </label>

                  {formData.addresses.length > 1 && (
                    <button
                      type="button"
                      className="remove-item-button"
                      onClick={() =>
                        removeItem("addresses", index)
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="form-field">
            <div className="repeatable-section-header">
              <label>Contacts</label>

              <button
                type="button"
                className="add-item-button"
                onClick={addContact}
              >
                + Add Contact
              </button>
            </div>

            {contacts.map((contact, contactIndex) => (
              <div className="contact-item" key={contactIndex}>
                <div className="repeatable-section-header">
                  <strong>
                    Contact {contactIndex + 1}
                  </strong>

                  <button
                    type="button"
                    className="remove-item-button"
                    onClick={() => removeContact(contactIndex)}
                  >
                    Remove Contact
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Contact name"
                  value={contact.name}
                  onChange={(event) =>
                    handleContactChange(
                      contactIndex,
                      "name",
                      event.target.value
                    )
                  }
                />

                <input
                  type="text"
                  placeholder="Relationship / Role"
                  value={contact.relationship}
                  onChange={(event) =>
                    handleContactChange(
                      contactIndex,
                      "relationship",
                      event.target.value
                    )
                  }
                />

                <textarea
                  placeholder="Contact notes"
                  value={contact.notes}
                  onChange={(event) =>
                    handleContactChange(
                      contactIndex,
                      "notes",
                      event.target.value
                    )
                  }
                  rows="3"
                />

                {/* Contact Emails */}
                <div className="form-field">
                  <div className="repeatable-section-header">
                    <label>Emails</label>

                    <button
                      type="button"
                      className="add-item-button"
                      onClick={() =>
                        addContactEmail(contactIndex)
                      }
                    >
                      + Add Email
                    </button>
                  </div>

                  {contact.emails.map((email, emailIndex) => (
                    <div
                      className="repeatable-item"
                      key={emailIndex}
                    >
                      <div className="repeatable-input-row">
                        <input
                          type="email"
                          placeholder="Email address"
                          value={email.email}
                          onChange={(event) =>
                            handleContactArrayChange(
                              contactIndex,
                              "emails",
                              emailIndex,
                              "email",
                              event.target.value
                            )
                          }
                        />

                        <input
                          type="text"
                          placeholder="Label"
                          value={email.label}
                          onChange={(event) =>
                            handleContactArrayChange(
                              contactIndex,
                              "emails",
                              emailIndex,
                              "label",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="repeatable-item-footer">
                        <label className="primary-label">
                          <input
                            type="radio"
                            name={`primary-contact-email-${contactIndex}`}
                            checked={email.is_primary}
                            onChange={() =>
                              handleContactPrimaryChange(
                                contactIndex,
                                "emails",
                                emailIndex
                              )
                            }
                          />
                          Primary
                        </label>

                        <button
                          type="button"
                          className="remove-item-button"
                          onClick={() =>
                            removeContactItem(
                              contactIndex,
                              "emails",
                              emailIndex
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Contact Phones */}
                <div className="form-field">
                  <div className="repeatable-section-header">
                    <label>Phones</label>

                    <button
                      type="button"
                      className="add-item-button"
                      onClick={() =>
                        addContactPhone(contactIndex)
                      }
                    >
                      + Add Phone
                    </button>
                  </div>

                  {contact.phones.map((phone, phoneIndex) => (
                    <div
                      className="repeatable-item"
                      key={phoneIndex}
                    >
                      <div className="repeatable-input-row">
                        <input
                          type="tel"
                          placeholder="Phone number"
                          value={phone.phone}
                          onChange={(event) =>
                            handleContactArrayChange(
                              contactIndex,
                              "phones",
                              phoneIndex,
                              "phone",
                              event.target.value
                            )
                          }
                        />

                        <input
                          type="text"
                          placeholder="Label"
                          value={phone.label}
                          onChange={(event) =>
                            handleContactArrayChange(
                              contactIndex,
                              "phones",
                              phoneIndex,
                              "label",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="repeatable-item-footer">
                        <label className="primary-label">
                          <input
                            type="radio"
                            name={`primary-contact-phone-${contactIndex}`}
                            checked={phone.is_primary}
                            onChange={() =>
                              handleContactPrimaryChange(
                                contactIndex,
                                "phones",
                                phoneIndex
                              )
                            }
                          />
                          Primary
                        </label>

                        <button
                          type="button"
                          className="remove-item-button"
                          onClick={() =>
                            removeContactItem(
                              contactIndex,
                              "phones",
                              phoneIndex
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="form-field">
            <label>Notes</label>

            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="5"
            />
          </div>

          {/* Client Pianos */}
          {isEditing && (
            <section className="client-modal-pianos" aria-label="Pianos attached to client">
              <div className="client-modal-pianos-header">
                <h3>Pianos</h3>
                <span>{clientPianos.length}</span>
              </div>

              {pianoError && <p className="client-modal-piano-error">{pianoError}</p>}

              {loadingPianos ? (
                <p className="client-modal-pianos-empty">Loading pianos...</p>
              ) : clientPianos.length === 0 ? (
                <p className="client-modal-pianos-empty">No pianos are attached to this client.</p>
              ) : (
                <div className="client-modal-piano-list">
                  {clientPianos.map((piano) => (
                    <div className="client-modal-piano" key={piano.id}>
                      <div className="client-modal-piano-info">
                        <strong>{[piano.make, piano.model].filter(Boolean).join(" ") || "Unnamed piano"}</strong>
                        <span>
                          {[
                            piano.serial ? `Serial: ${piano.serial}` : null,
                            piano.type,
                            piano.location,
                          ].filter(Boolean).join(" · ") || "No additional details"}
                        </span>
                      </div>
                      <div className="client-modal-piano-actions">
                        <button
                          type="button"
                          className="client-modal-piano-action"
                          onClick={() => {
                            onClose();
                            navigate(`/pianos/${piano.id}`);
                          }}
                        >
                          View piano
                        </button>
                        <button
                          type="button"
                          className="client-modal-piano-action"
                          onClick={() => {
                            setPianoError("");
                            setTransferringPianoId(
                              transferringPianoId === piano.id ? null : piano.id
                            );
                            setTransferClientId("");
                          }}
                        >
                          {transferringPianoId === piano.id ? "Cancel transfer" : "Transfer"}
                        </button>
                      </div>

                      {transferringPianoId === piano.id && (
                        <div className="client-modal-transfer">
                          <label htmlFor={`transfer-client-${piano.id}`}>Transfer to client</label>
                          <select
                            id={`transfer-client-${piano.id}`}
                            value={transferClientId}
                            onChange={(event) => setTransferClientId(event.target.value)}
                          >
                            <option value="">Choose a client...</option>
                            {allClients
                              .filter((otherClient) => String(otherClient.id) !== String(client.id))
                              .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
                              .map((otherClient) => (
                                <option key={otherClient.id} value={otherClient.id}>
                                  {otherClient.name || "Unnamed client"}
                                  {otherClient.type === "institution" ? " (Institution)" : ""}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            className="client-modal-transfer-confirm"
                            disabled={!transferClientId}
                            onClick={() => handleTransferPiano(piano)}
                          >
                            Transfer piano
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Modal Actions */}
          <div className="modal-actions">
            <div className="modal-primary-actions">
              <button type="button" className="modal-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="modal-save">
                {isEditing ? "Save Changes" : "Save Client"}
              </button>
            </div>

            {isEditing && onDelete && (
              <button
                type="button"
                className="modal-delete-client"
                onClick={() => onDelete(client)}
              >
                Delete Client
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

}

export default AddClientModal;