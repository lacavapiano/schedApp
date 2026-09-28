import { useEffect, useState } from "react";
import { createPiano, getClients, updatePiano } from "../services/api";

function PianoForm({ piano = null, onClose, onSaved }) {
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    client_id: piano?.client_id ?? "",
    make: piano?.make ?? "",
    model: piano?.model ?? "",
    serial: piano?.serial ?? "",
    type: piano?.type ?? "",
    location: piano?.location ?? "",
    quiet_system: piano?.quiet_system ?? "",
    climate_control: piano?.climate_control ?? "",
    tuning_period: piano?.tuning_period ?? "",
  });

  useEffect(() => {
    async function loadClients() {
      try {
        const data = await getClients();

        setClients(
          [...data].sort((a, b) =>
            (a.name ?? "").localeCompare(b.name ?? "")
          )
        );
      } catch (error) {
        console.error(error);
        setError("Unable to load clients.");
      } finally {
        setLoadingClients(false);
      }
    }

    loadClients();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const data = {
        client_id: formData.client_id || null,
        make: formData.make.trim() || null,
        model: formData.model.trim() || null,
        serial: formData.serial.trim() || null,
        type: formData.type || null,
        location: formData.location.trim() || null,
        quiet_system: formData.quiet_system.trim() || null,
        climate_control: formData.climate_control.trim() || null,
        tuning_period:
          formData.tuning_period === ""
            ? null
            : Number(formData.tuning_period),
      };

      if (piano) {
        await updatePiano(piano.id, data);
      } else {
        await createPiano(data);
      }

      await onSaved();
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="piano-modal-backdrop">
      <div className="piano-modal">
        <div className="piano-modal-header">
          <h2>{piano ? "Edit Piano" : "Add Piano"}</h2>

          <button
            type="button"
            className="piano-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {error && <div className="piano-form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="piano-form-grid">
            <label>
              Client
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                disabled={loadingClients}
              >
                <option value="">Unassigned</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {client.type === "institution"
                      ? " (Institution)"
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Make
              <input
                name="make"
                value={formData.make}
                onChange={handleChange}
              />
            </label>

            <label>
              Model
              <input
                name="model"
                value={formData.model}
                onChange={handleChange}
              />
            </label>

            <label>
              Serial
              <input
                name="serial"
                value={formData.serial}
                onChange={handleChange}
              />
            </label>

            <label>
              Type
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="">Select type</option>
                <option value="grand">Grand</option>
                <option value="upright">Upright</option>
                <option value="spinet">Spinet</option>
              </select>
            </label>

            <label>
              Location
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
            </label>

            <label>
              Quiet System
              <input
                name="quiet_system"
                value={formData.quiet_system}
                onChange={handleChange}
              />
            </label>

            <label>
              Climate Control
              <input
                name="climate_control"
                value={formData.climate_control}
                onChange={handleChange}
              />
            </label>

            <label>
              Tuning Period
              <input
                type="number"
                min="0"
                name="tuning_period"
                value={formData.tuning_period}
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="piano-form-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : piano ? "Save Changes" : "Add Piano"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PianoForm;