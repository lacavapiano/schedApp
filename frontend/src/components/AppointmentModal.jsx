import { useEffect, useMemo, useState } from "react";
import {
  getClients,
  getPianos,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../services/api";
import "../styles/AppointmentModal.css";

const EMPTY_PIANO = {
  piano_id: "",
  service: "tuning",
  temp: "",
  hum: "",
  notes: "",
};

const EMPTY_FORM = {
  client_id: "",
  date: "",
  start_time: "",
  end_time: "",
  status: "scheduled",
  notes: "",
  payment: "",
  payment_type: "",
  miles: "",
  invoice: "",
  pianos: [],
};

function formatDateForInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeForInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

function combineDateAndTime(date, time) {
  if (!date || !time) {
    return null;
  }

  const result = new Date(`${date}T${time}`);

  if (Number.isNaN(result.getTime())) {
    return null;
  }

  return result;
}

function AppointmentModal({
  appointment = null,
  onClose,
  onSaved,
  onDeleted,
}) {
  const isEditing = Boolean(appointment);

  const [clients, setClients] = useState([]);
  const [allPianos, setAllPianos] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  /*
   * Load clients and pianos when the modal opens.
   */
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);

        const [clientData, pianoData] = await Promise.all([
          getClients(),
          getPianos(),
        ]);

        setClients(clientData || []);
        setAllPianos(pianoData || []);
      } catch (error) {
        console.error("Failed to load appointment data:", error);
        setError("Failed to load clients and pianos.");
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  /*
   * Populate the form when editing an appointment.
   */
  useEffect(() => {
    if (!appointment) {
      setFormData({
        ...EMPTY_FORM,
        pianos: [],
      });

      return;
    }

    setFormData({
      client_id: appointment.client_id || appointment.client?.id || "",
      date: formatDateForInput(appointment.start_time),
      start_time: formatTimeForInput(appointment.start_time),
      end_time: formatTimeForInput(appointment.end_time),
      status: appointment.status || "scheduled",
      notes: appointment.notes || "",
      payment:
        appointment.payment !== null &&
        appointment.payment !== undefined
          ? String(appointment.payment)
          : "",
      payment_type: appointment.payment_type || "",
      miles:
        appointment.miles !== null &&
        appointment.miles !== undefined
          ? String(appointment.miles)
          : "",
      invoice: appointment.invoice || "",

      pianos:
        appointment.appointment_pianos?.map((item) => ({
          id: item.id,
          piano_id: item.piano_id || item.piano?.id || "",
          service: item.service || "tuning",
          temp: item.temp || "",
          hum: item.hum || "",
          notes: item.notes || "",
        })) || [],
    });
  }, [appointment]);

  /*
   * Pianos belonging to the selected client.
   */
  const clientPianos = useMemo(() => {
    if (!formData.client_id) {
      return [];
    }

    return allPianos.filter(
      (piano) => piano.client_id === formData.client_id
    );
  }, [allPianos, formData.client_id]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /*
   * Changing the client clears the selected pianos.
   * This prevents accidentally associating a piano belonging
   * to a different client.
   */
  function handleClientChange(event) {
    const clientId = event.target.value;

    setFormData((previous) => ({
      ...previous,
      client_id: clientId,
      pianos: [],
    }));
  }

  function handlePianoChange(index, field, value) {
    setFormData((previous) => ({
      ...previous,
      pianos: previous.pianos.map((piano, pianoIndex) =>
        pianoIndex === index
          ? {
              ...piano,
              [field]: value,
            }
          : piano
      ),
    }));
  }

  /*
   * Add another piano to the appointment.
   */
  function addPiano() {
    if (!formData.client_id) {
      setError("Select a client before adding a piano.");
      return;
    }

    setError("");

    setFormData((previous) => ({
      ...previous,
      pianos: [...previous.pianos, { ...EMPTY_PIANO }],
    }));

    /*
     * New tunings default to 2 hours per piano.
     * Only automatically adjust the end time if both
     * date and start time have been entered.
     */
    if (formData.date && formData.start_time) {
      const start = combineDateAndTime(
        formData.date,
        formData.start_time
      );

      if (start) {
        const newPianoCount = formData.pianos.length + 1;
        const end = addHours(start, newPianoCount * 2);

        setFormData((previous) => ({
          ...previous,
          end_time: `${String(end.getHours()).padStart(2, "0")}:${String(
            end.getMinutes()
          ).padStart(2, "0")}`,
        }));
      }
    }
  }

  function removePiano(index) {
    setFormData((previous) => {
      const updatedPianos = previous.pianos.filter(
        (_, pianoIndex) => pianoIndex !== index
      );

      return {
        ...previous,
        pianos: updatedPianos,
      };
    });
  }

  /*
   * When the start time or date changes on a new appointment,
   * automatically calculate the end time based on the number
   * of pianos.
   */
  function updateEndTimeFromPianos(date, startTime, pianoCount) {
    if (!date || !startTime || pianoCount === 0) {
      return;
    }

    const start = combineDateAndTime(date, startTime);

    if (!start) {
      return;
    }

    const end = addHours(start, pianoCount * 2);

    return `${String(end.getHours()).padStart(2, "0")}:${String(
      end.getMinutes()
    ).padStart(2, "0")}`;
  }

  function handleDateChange(event) {
    const date = event.target.value;

    setFormData((previous) => {
      const updated = {
        ...previous,
        date,
      };

      if (!isEditing) {
        const calculatedEnd = updateEndTimeFromPianos(
          date,
          previous.start_time,
          previous.pianos.length
        );

        if (calculatedEnd) {
          updated.end_time = calculatedEnd;
        }
      }

      return updated;
    });
  }

  function handleStartTimeChange(event) {
    const startTime = event.target.value;

    setFormData((previous) => {
      const updated = {
        ...previous,
        start_time: startTime,
      };

      if (!isEditing) {
        const calculatedEnd = updateEndTimeFromPianos(
          previous.date,
          startTime,
          previous.pianos.length
        );

        if (calculatedEnd) {
          updated.end_time = calculatedEnd;
        }
      }

      return updated;
    });
  }

  function handleManualEndTimeChange(event) {
    setFormData((previous) => ({
      ...previous,
      end_time: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!formData.client_id) {
      setError("Please select a client.");
      return;
    }

    if (!formData.date || !formData.start_time || !formData.end_time) {
      setError("Please enter the date, start time, and end time.");
      return;
    }

    const start = combineDateAndTime(
      formData.date,
      formData.start_time
    );

    const end = combineDateAndTime(
      formData.date,
      formData.end_time
    );

    if (!start || !end) {
      setError("The appointment date or time is invalid.");
      return;
    }

    if (end <= start) {
      setError("The end time must be after the start time.");
      return;
    }

    setSaving(true);

    try {
      const appointmentData = {
        client_id: formData.client_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: formData.status,
        notes: formData.notes.trim(),
        payment:
          formData.payment.trim() === ""
            ? null
            : Number(formData.payment),
        payment_type:
          formData.payment_type.trim() === ""
            ? null
            : formData.payment_type,
        miles:
          formData.miles.trim() === ""
            ? null
            : Number(formData.miles),
        invoice:
          formData.invoice.trim() === ""
            ? null
            : formData.invoice.trim(),

        pianos: formData.pianos
          .filter((piano) => piano.piano_id)
          .map((piano) => ({
            ...(piano.id ? { id: piano.id } : {}),
            piano_id: piano.piano_id,
            service: piano.service || null,
            temp: piano.temp || null,
            hum: piano.hum || null,
            notes: piano.notes || null,
          })),
      };

      if (isEditing) {
        await updateAppointment(
          appointment.id,
          appointmentData
        );
      } else {
        await createAppointment(appointmentData);
      }

      if (onSaved) {
        await onSaved();
      }

      onClose();
    } catch (error) {
      console.error("Failed to save appointment:", error);
      setError(error.message || "Failed to save appointment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!appointment) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this appointment?"
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await deleteAppointment(appointment.id);

      if (onDeleted) {
        await onDeleted();
      }

      onClose();
    } catch (error) {
      console.error("Failed to delete appointment:", error);
      setError(error.message || "Failed to delete appointment.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="appointment-modal-overlay"
      onClick={onClose}
    >
      <div
        className="appointment-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="appointment-modal-header">
          <h2>
            {isEditing
              ? "Edit Appointment"
              : "New Appointment"}
          </h2>

          <button
            type="button"
            className="appointment-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="appointment-modal-error">
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="appointment-modal-loading">
            Loading...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Client */}
            <div className="appointment-form-field">
              <label htmlFor="appointment-client">
                Client *
              </label>

              <select
                id="appointment-client"
                name="client_id"
                value={formData.client_id}
                onChange={handleClientChange}
                required
              >
                <option value="">Select a client</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date / Time */}
            <div className="appointment-form-row">
              <div className="appointment-form-field">
                <label htmlFor="appointment-date">
                  Date *
                </label>

                <input
                  id="appointment-date"
                  type="date"
                  value={formData.date}
                  onChange={handleDateChange}
                  required
                />
              </div>

              <div className="appointment-form-field">
                <label htmlFor="appointment-start">
                  Start *
                </label>

                <input
                  id="appointment-start"
                  type="time"
                  value={formData.start_time}
                  onChange={handleStartTimeChange}
                  required
                />
              </div>

              <div className="appointment-form-field">
                <label htmlFor="appointment-end">
                  End *
                </label>

                <input
                  id="appointment-end"
                  type="time"
                  value={formData.end_time}
                  onChange={handleManualEndTimeChange}
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div className="appointment-form-field">
              <label htmlFor="appointment-status">
                Status
              </label>

              <select
                id="appointment-status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Pianos */}
            <div className="appointment-section">
              <div className="appointment-section-header">
                <label>Pianos</label>

                <button
                  type="button"
                  className="appointment-add-button"
                  onClick={addPiano}
                  disabled={!formData.client_id}
                >
                  + Add Piano
                </button>
              </div>

              {!formData.client_id && (
                <p className="appointment-help-text">
                  Select a client to add pianos.
                </p>
              )}

              {formData.client_id &&
                clientPianos.length === 0 && (
                  <p className="appointment-help-text">
                    This client has no pianos.
                  </p>
                )}

              {formData.pianos.map((appointmentPiano, index) => (
                <div
                  className="appointment-piano"
                  key={
                    appointmentPiano.id ||
                    `new-piano-${index}`
                  }
                >
                  <div className="appointment-piano-header">
                    <strong>
                      Piano {index + 1}
                    </strong>

                    <button
                      type="button"
                      className="appointment-remove-button"
                      onClick={() => removePiano(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="appointment-form-field">
                    <label>Piano</label>

                    <select
                      value={appointmentPiano.piano_id}
                      onChange={(event) =>
                        handlePianoChange(
                          index,
                          "piano_id",
                          event.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Select a piano
                      </option>

                      {clientPianos.map((piano) => (
                        <option key={piano.id} value={piano.id}>
                          {[piano.make, piano.model].filter(Boolean).join(" ") || "Unnamed Piano"}
                          {piano.serial ? ` — ${piano.serial}` : ""}
                          {piano.location ? ` — ${piano.location}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="appointment-form-row">
                    <div className="appointment-form-field">
                      <label>Service</label>

                      <select
                        value={appointmentPiano.service}
                        onChange={(event) =>
                          handlePianoChange(
                            index,
                            "service",
                            event.target.value
                          )
                        }
                      >
                        <option value="tuning">
                          Tuning
                        </option>
                        <option value="repair">
                          Repair
                        </option>
                        <option value="regulation">
                          Regulation
                        </option>
                        <option value="voicing">
                          Voicing
                        </option>
                        <option value="inspection">
                          Inspection
                        </option>
                        <option value="other">
                          Other
                        </option>
                      </select>
                    </div>

                    <div className="appointment-form-field">
                      <label>Temp</label>

                      <input
                        type="text"
                        value={appointmentPiano.temp}
                        onChange={(event) =>
                          handlePianoChange(
                            index,
                            "temp",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div className="appointment-form-field">
                      <label>Hum</label>

                      <input
                        type="text"
                        value={appointmentPiano.hum}
                        onChange={(event) =>
                          handlePianoChange(
                            index,
                            "hum",
                            event.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="appointment-form-field">
                    <label>Notes</label>

                    <textarea
                      rows="3"
                      value={appointmentPiano.notes}
                      onChange={(event) =>
                        handlePianoChange(
                          index,
                          "notes",
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Payment */}
            <div className="appointment-form-row">
              <div className="appointment-form-field">
                <label htmlFor="appointment-payment">
                  Payment
                </label>

                <input
                  id="appointment-payment"
                  type="number"
                  min="0"
                  step="0.01"
                  name="payment"
                  value={formData.payment}
                  onChange={handleChange}
                />
              </div>

              <div className="appointment-form-field">
                <label htmlFor="appointment-payment-type">
                  Payment Type
                </label>

                <select
                  id="appointment-payment-type"
                  name="payment_type"
                  value={formData.payment_type}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="ach">ACH</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="card">Card</option>
                  <option value="venmo">Venmo</option>
                  <option value="paypal">PayPal</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Miles / Invoice */}
            <div className="appointment-form-row">
              <div className="appointment-form-field">
                <label htmlFor="appointment-miles">
                  Miles
                </label>

                <input
                  id="appointment-miles"
                  type="number"
                  min="0"
                  step="0.1"
                  name="miles"
                  value={formData.miles}
                  onChange={handleChange}
                />
              </div>

              <div className="appointment-form-field">
                <label htmlFor="appointment-invoice">
                  Invoice
                </label>

                <input
                  id="appointment-invoice"
                  type="text"
                  name="invoice"
                  value={formData.invoice}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Appointment Notes */}
            <div className="appointment-form-field">
              <label htmlFor="appointment-notes">
                Notes
              </label>

              <textarea
                id="appointment-notes"
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            {/* Actions */}
            <div className="appointment-modal-actions">
              {isEditing && (
                <button
                  type="button"
                  className="appointment-delete-button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}

              <div className="appointment-modal-actions-right">
                <button
                  type="button"
                  className="appointment-cancel-button"
                  onClick={onClose}
                  disabled={saving || deleting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="appointment-save-button"
                  disabled={saving || deleting}
                >
                  {saving
                    ? "Saving..."
                    : isEditing
                    ? "Save Changes"
                    : "Save Appointment"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AppointmentModal;