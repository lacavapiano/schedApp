import { useEffect, useState } from "react";
import { createClient, updateClient } from "../services/api";
import "../styles/ClientModal.css";

function AddClientModal({
  onClose,
  onClientAdded,
  onSaved,
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

  const isEditing = Boolean(client);

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
    }
  }, [client]);

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

    if (phones.length === 0 && emails.length === 0) {
      setError(
        "Please provide either a phone number or an email address."
      );
      return;
    }

    setError("");

    try {
      const clientData = {
        name: formData.name,
        type: formData.type,
        emails,
        phones,
        addresses,
        notes: formData.notes,
      };

      if (isEditing) {
        await updateClient(client.id, clientData);

        if (onSaved) {
          await onSaved();
        }
      } else {
        await createClient(clientData);

        if (onClientAdded) {
          await onClientAdded();
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

          {/* Modal Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="modal-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="modal-save"
            >
              {isEditing ? "Save Changes" : "Save Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

}

export default AddClientModal;