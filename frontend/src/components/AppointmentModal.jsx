import { useEffect, useMemo, useState } from "react";
import {
  getClients,
  getPianos,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  completeAppointment,
  getServiceTypes,
  getClientDiscounts,
  createClientDiscount,
  updateClientDiscount,
  getAppointmentCharges,
  saveAppointmentCharges,
} from "../services/api";
import ClientSearchSelect from "./ClientSearchSelect";
import AddClientModal from "./AddClientModal";
import PianoForm from "./PianoForm";
import "../styles/AppointmentModal.css";
import "../styles/ActionButtons.css";

const EMPTY_PIANO = {
  piano_id: "", service: "", service_type_id: "", billable_hours: "", services: [{ service_type_id: "", billable_hours: "" }], temp: "", hum: "", notes: "",
};

const EMPTY_FORM = {
  client_id: "",
  client_address_id: "",
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

function formatAddress(address) {
  if (!address) {
    return "";
  }

  const street = [
    address.address,
    address.apt ? `Apt ${address.apt}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const cityStateZip = [
    address.city,
    address.state,
    address.zip,
  ]
    .filter(Boolean)
    .join(" ");

  return [street, cityStateZip]
    .filter(Boolean)
    .join(", ");
}

function getAddressLabel(address) {
  if (address.label) {
    return `${address.label} — ${formatAddress(address)}`;
  }

  return formatAddress(address);
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
  const [serviceTypes, setServiceTypes] = useState([]);
  const [clientDiscounts, setClientDiscounts] = useState([]);
  const [discountDrafts, setDiscountDrafts] = useState([]);
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountType, setDiscountType] = useState("ongoing");
  const [editingDiscountKey, setEditingDiscountKey] = useState(null);
  const [editingDiscountPercent, setEditingDiscountPercent] = useState("");
  const [savingDiscountEdit, setSavingDiscountEdit] = useState(false);
  const [activeDiscountPianoIndex, setActiveDiscountPianoIndex] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [completionMode, setCompletionMode] = useState(false);
  const [error, setError] = useState("");
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPianoModal, setShowPianoModal] = useState(false);

  /*
   * Load clients and pianos when the modal opens.
   */
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);

        const [clientData, pianoData, serviceData] = await Promise.all([getClients(), getPianos(), getServiceTypes()]);
        setClients(clientData || []);
        setAllPianos(pianoData || []);
        setServiceTypes(serviceData || []);
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
      client_id:
        appointment.client_id ||
        appointment.client?.id ||
        "",

      client_address_id:
        appointment.client_address_id ||
        appointment.client_address?.id ||
        "",

      date: formatDateForInput(
        appointment.start_time
      ),

      start_time: formatTimeForInput(
        appointment.start_time
      ),

      end_time: formatTimeForInput(
        appointment.end_time
      ),

      status: appointment.status || "scheduled",

      notes: appointment.notes || "",

      payment:
        appointment.payment !== null &&
        appointment.payment !== undefined
          ? String(appointment.payment)
          : "",

      payment_type:
        appointment.payment_type || "",

      miles:
        appointment.miles !== null &&
        appointment.miles !== undefined
          ? String(appointment.miles)
          : "",

      invoice: appointment.invoice || "",

      pianos:
        appointment.appointment_pianos?.map(
          (item) => ({
            id: item.id,
            piano_id:
              item.piano_id ||
              item.piano?.id ||
              "",
            service: item.service || "",
            service_type_id: item.service_type_id || "",
            billable_hours: item.billable_hours ?? "",
            services: [{ service_type_id: item.service_type_id || "", billable_hours: item.billable_hours ?? "", service: item.service || "" }],
            temp: item.temp || "",
            hum: item.hum || "",
            notes: item.notes || "",
          })
        ) || [],
    });
  }, [appointment]);

  /*
   * The selected client's addresses.
   */
  const clientAddresses = useMemo(() => {
    if (!formData.client_id) {
      return [];
    }

    const client = clients.find(
      (item) => item.id === formData.client_id
    );

    return client?.client_addresses || [];
  }, [clients, formData.client_id]);

  useEffect(() => {
    if (!formData.client_id) {
      return;
    }

    if (clientAddresses.length === 1) {
      setFormData((previous) => ({
        ...previous,
        client_address_id: clientAddresses[0].id,
      }));
    }
  }, [formData.client_id, clientAddresses]);

  useEffect(() => {
    let cancelled = false;
    if (!formData.client_id) { setClientDiscounts([]); return undefined; }
    getClientDiscounts(formData.client_id).then((rows) => { if (!cancelled) setClientDiscounts(rows || []); })
      .catch((err) => { console.error("Failed to load client discounts:", err); if (!cancelled) setClientDiscounts([]); });
    return () => { cancelled = true; };
  }, [formData.client_id]);

  useEffect(() => {
    let cancelled = false;
    if (!appointment?.id) return undefined;
    getAppointmentCharges(appointment.id).then((rows) => {
      if (cancelled) return;
      const byPianoId = new Map();
      (rows || []).forEach((row) => {
        const list = byPianoId.get(row.appointment_piano_id) || [];
        list.push({ service_type_id: row.service_type_id || "", billable_hours: row.billable_hours ?? "", service: row.service_name || "" });
        byPianoId.set(row.appointment_piano_id, list);
      });
      setFormData((previous) => ({ ...previous, pianos: previous.pianos.map((piano) => {
        const services = byPianoId.get(piano.id);
        return services?.length ? { ...piano, services, service_type_id: services[0].service_type_id, billable_hours: services[0].billable_hours, service: services[0].service } : piano;
      }) }));
    }).catch((err) => console.error("Failed to load saved appointment pricing:", err));
    return () => { cancelled = true; };
  }, [appointment?.id]);

  const pricingPreview = useMemo(() => formData.pianos.map((piano, pianoIndex) => {
    const entries = (piano.services?.length ? piano.services : [{ service_type_id: piano.service_type_id, billable_hours: piano.billable_hours, service: piano.service }]);
    return entries.map((entry, serviceIndex) => {
      const service = serviceTypes.find((item) => item.id === entry.service_type_id || (!entry.service_type_id && entry.service && item.name.toLowerCase() === entry.service.toLowerCase()));
      if (!service) return { service: null, ready: false, baseAmount: 0, finalAmount: 0, discounts: [], serviceIndex };
      const hours = entry.billable_hours === "" ? null : Number(entry.billable_hours);
      if (service.pricing_method === "hourly" && (!Number.isFinite(hours) || hours <= 0)) return { service, ready: false, baseAmount: 0, finalAmount: 0, discounts: [], serviceIndex };
      const baseAmount = Math.round(Number(service.price) * (service.pricing_method === "hourly" ? hours : 1) * 100) / 100;
      const relevant = [
        ...clientDiscounts.filter((discount) => {
          if (!discount.is_active || (discount.service_type_id && discount.service_type_id !== service.id)) return false;
          if (discount.discount_type === "ongoing") return true;
          return (appointment?.id && discount.applies_to_appointment_id === appointment.id) || (piano.id && discount.applies_to_appointment_piano_id === piano.id);
        }),
        ...discountDrafts.filter((discount) => {
          if (discount.service_type_id && discount.service_type_id !== service.id) return false;
          if (discount.discount_type === "ongoing") return true;
          return discount.scope === "piano" ? Number(discount.targetPianoIndex) === pianoIndex : true;
        }),
      ];
      const global = relevant.filter((discount) => discount.discount_type === "ongoing" && !discount.service_type_id);
      const scoped = relevant.filter((discount) => discount.discount_type === "ongoing" && discount.service_type_id === service.id);
      const oneTime = relevant.filter((discount) => discount.discount_type === "one_time");
      let remaining = baseAmount;
      const discounts = [];
      for (const discount of [...global, ...scoped, ...oneTime]) {
        const before = remaining;
        remaining = Math.round(remaining * (1 - Number(discount.discount_percent) / 100) * 100) / 100;
        discounts.push({ label: discount.discount_type === "one_time" ? "One-time discount" : (discount.service_type_id ? "Service discount" : "Global discount"), percent: Number(discount.discount_percent), amount: Math.round((before - remaining) * 100) / 100 });
      }
      return { service, ready: true, baseAmount, finalAmount: remaining, discounts, serviceIndex };
    });
  }), [formData.pianos, serviceTypes, clientDiscounts, discountDrafts, appointment?.id]);
  const estimatedTotal = pricingPreview.flat().reduce((total, item) => total + (item.ready ? item.finalAmount : 0), 0);
  const pricingReady = formData.pianos.some((piano) => piano.piano_id)
    && formData.pianos.filter((piano) => piano.piano_id).every((piano, pianoIndex) => {
      const entries = piano.services?.length ? piano.services : [{ service_type_id: piano.service_type_id, billable_hours: piano.billable_hours, service: piano.service }];
      const previews = pricingPreview[pianoIndex] || [];
      return entries.length > 0 && entries.every((entry, serviceIndex) => {
        const service = serviceTypes.find((item) => item.id === entry.service_type_id || (!entry.service_type_id && entry.service && item.name.toLowerCase() === entry.service.toLowerCase()));
        return Boolean(service) && (service.pricing_method !== "hourly" || (Number.isFinite(Number(entry.billable_hours)) && Number(entry.billable_hours) > 0)) && Boolean(previews[serviceIndex]?.ready);
      });
    });

  /*
   * Pianos belonging to the selected client.
   */
  const clientPianos = useMemo(() => {
    if (!formData.client_id) {
      return [];
    }

    return allPianos.filter(
      (piano) =>
        piano.client_id === formData.client_id
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
   * Changing the client clears the selected
   * address and pianos.
   */
  function handleClientChange(event) {
    const clientId = event.target.value;

    setFormData((previous) => ({
      ...previous,
      client_id: clientId,
      client_address_id: "",
      pianos: [],
    }));
    setDiscountDrafts([]);
    setDiscountPercent("");
    setError("");
  }

  function handlePianoChange(index, field, value) {
    setFormData((previous) => ({
      ...previous,
      pianos: previous.pianos.map((piano, pianoIndex) => pianoIndex === index ? { ...piano, [field]: value } : piano),
    }));
  }

  function handleServiceChange(pianoIndex, serviceIndex, field, value) {
    setFormData((previous) => {
      const pianos = previous.pianos.map((piano, index) => {
        if (index !== pianoIndex) return piano;
        const current = piano.services?.length ? piano.services : [{ service_type_id: piano.service_type_id || "", billable_hours: piano.billable_hours || "", service: piano.service || "" }];
        const services = current.map((entry, idx) => {
          if (idx !== serviceIndex) return entry;
          if (field === "service_type_id") {
            const service = serviceTypes.find((item) => item.id === value);
            return { ...entry, service_type_id: value, service: service?.name || "", billable_hours: service?.pricing_method === "hourly" ? (entry.billable_hours === "" || entry.billable_hours == null ? "1" : entry.billable_hours) : "" };
          }
          return { ...entry, [field]: value };
        });
        return { ...piano, services, service_type_id: services[0]?.service_type_id || "", billable_hours: services[0]?.billable_hours || "", service: services[0]?.service || "" };
      });
      const endTime = !isEditing ? updateEndTimeFromPianos(previous.date, previous.start_time, pianos) : "";
      return { ...previous, pianos, ...(endTime ? { end_time: endTime } : {}) };
    });
  }

  function addServiceToPiano(pianoIndex) {
    setFormData((previous) => {
      const pianos = previous.pianos.map((piano, index) => index === pianoIndex
        ? { ...piano, services: [...(piano.services?.length ? piano.services : [{ service_type_id: piano.service_type_id || "", billable_hours: piano.billable_hours || "", service: piano.service || "" }]), { service_type_id: "", billable_hours: "", service: "" }] }
        : piano);
      const endTime = !isEditing ? updateEndTimeFromPianos(previous.date, previous.start_time, pianos) : "";
      return { ...previous, pianos, ...(endTime ? { end_time: endTime } : {}) };
    });
  }

  function removeServiceFromPiano(pianoIndex, serviceIndex) {
    setFormData((previous) => {
      const pianos = previous.pianos.map((piano, index) => {
        if (index !== pianoIndex) return piano;
        const services = (piano.services || []).filter((_, idx) => idx !== serviceIndex);
        const nextServices = services.length ? services : [{ service_type_id: "", billable_hours: "", service: "" }];
        return { ...piano, services: nextServices, service_type_id: nextServices[0]?.service_type_id || "", billable_hours: nextServices[0]?.billable_hours || "", service: nextServices[0]?.service || "" };
      });
      const endTime = !isEditing ? updateEndTimeFromPianos(previous.date, previous.start_time, pianos) : "";
      return { ...previous, pianos, ...(endTime ? { end_time: endTime } : {}) };
    });
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
    setFormData((previous) => {
      const defaultService = serviceTypes.find((service) => /tun/i.test(service.name));
      const pianos = [
        ...previous.pianos,
        { ...EMPTY_PIANO, service_type_id: defaultService?.id || "", service: defaultService?.name || "", services: [{ service_type_id: defaultService?.id || "", billable_hours: "", service: defaultService?.name || "" }] },
      ];
      const endTime = !isEditing ? updateEndTimeFromPianos(previous.date, previous.start_time, pianos) : "";
      return { ...previous, pianos, ...(endTime ? { end_time: endTime } : {}) };
    });
  }

  function removePiano(index) {
    setFormData((previous) => {
      const pianos = previous.pianos.filter((_, pianoIndex) => pianoIndex !== index);
      const endTime = !isEditing ? updateEndTimeFromPianos(previous.date, previous.start_time, pianos) : "";
      return { ...previous, pianos, ...(endTime ? { end_time: endTime } : {}) };
    });
  }

  function updateEndTimeFromPianos(
    date,
    startTime,
    pianoCount
  ) {
    if (
      !date ||
      !startTime ||
      pianoCount === 0
    ) {
      return;
    }

    const start = combineDateAndTime(
      date,
      startTime
    );

    if (!start) {
      return;
    }

    const end = addHours(
      start,
      pianoCount * 2
    );

    return `${String(
      end.getHours()
    ).padStart(2, "0")}:${String(
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
        const calculatedEnd =
          updateEndTimeFromPianos(
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
        const calculatedEnd =
          updateEndTimeFromPianos(
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

  function handleManualEndTimeChange(
    event
  ) {
    setFormData((previous) => ({
      ...previous,
      end_time: event.target.value,
    }));
  }

  async function handleSubmit(event, completeAfterSave = false) {
    event?.preventDefault();

    setError("");

    if (!formData.client_id) {
      setError("Please select a client.");
      return;
    }

    if (
      !formData.date ||
      !formData.start_time ||
      !formData.end_time
    ) {
      setError(
        "Please enter the date, start time, and end time."
      );
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
      setError(
        "The appointment date or time is invalid."
      );
      return;
    }

    if (end <= start) {
      setError(
        "The end time must be after the start time."
      );
      return;
    }

    if (completeAfterSave) {
      const missing = [];
      if (formData.miles.trim() === "") missing.push("mileage");
      if (formData.payment.trim() === "") missing.push("payment amount");
      if (!formData.payment_type.trim()) missing.push("payment type");
      formData.pianos.filter((piano) => piano.piano_id).forEach((piano, index) => {
        if (!String(piano.temp ?? "").trim()) missing.push(`temperature for piano ${index + 1}`);
        if (!String(piano.hum ?? "").trim()) missing.push(`humidity for piano ${index + 1}`);
      });
      if (missing.length) {
        setCompletionMode(true);
        setError(`Before completing, fill in: ${missing.join(", ")}.`);
        return;
      }
      const selectedPianos = formData.pianos.filter((piano) => piano.piano_id);
      if (selectedPianos.length && !pricingReady) {
        setCompletionMode(true);
        setError("Complete service pricing for every piano before completing this appointment.");
        return;
      }
      const paid = Number(formData.payment);
      if (!Number.isFinite(paid) || paid < 0) {
        setCompletionMode(true);
        setError("Enter a valid payment amount before completing this appointment.");
        return;
      }
      if (paid + 0.00001 < estimatedTotal) {
        setCompletionMode(true);
        setError(`This appointment must be paid in full before completion. Total due: ${estimatedTotal.toFixed(2)}; paid: ${paid.toFixed(2)}.`);
        return;
      }
    }

    for (let index = 0; index < formData.pianos.length; index += 1) {
      const piano = formData.pianos[index];
      if (!piano.piano_id) continue;
      const entries = piano.services?.length ? piano.services : [{ service_type_id: piano.service_type_id, billable_hours: piano.billable_hours, service: piano.service }];
      for (let serviceIndex = 0; serviceIndex < entries.length; serviceIndex += 1) {
        const entry = entries[serviceIndex];
        const service = serviceTypes.find((item) => item.id === entry.service_type_id || (!entry.service_type_id && entry.service && item.name.toLowerCase() === entry.service.toLowerCase()));
        if (!service) { setError(`Choose a configured service for Piano ${index + 1}, service ${serviceIndex + 1}.`); return; }
        if (service.pricing_method === "hourly" && (!Number.isFinite(Number(entry.billable_hours)) || Number(entry.billable_hours) <= 0)) { setError(`Enter actual billable hours for "${service.name}" on Piano ${index + 1}.`); return; }
      }
    }

    setSaving(true);

    try {
      const appointmentData = {
        client_id: formData.client_id,

        client_address_id:
          formData.client_address_id || null,

        start_time:
          start.toISOString(),

        end_time:
          end.toISOString(),

        status: formData.status,

        notes:
          formData.notes.trim(),

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

        pianos:
          formData.pianos
            .filter(
              (piano) => piano.piano_id
            )
            .map((piano) => ({
              ...(piano.id
                ? { id: piano.id }
                : {}),
              piano_id: piano.piano_id,
              service:
                (piano.services?.[0]?.service || serviceTypes.find((service) => service.id === piano.services?.[0]?.service_type_id)?.name || piano.service || serviceTypes.find((service) => service.id === piano.service_type_id)?.name) || null,
              temp:
                piano.temp || null,
              hum:
                piano.hum || null,
              notes:
                piano.notes || null,
            })),
      };

      const savedAppointment = isEditing
        ? await updateAppointment(appointment.id, appointmentData)
        : await createAppointment(appointmentData);
      const savedPianos = savedAppointment?.appointment_pianos || [];

      // Create any discounts added in this modal before calculating charges,
      // so the saved appointment totals use the same discounts shown in the preview.
      for (const discount of discountDrafts) {
        const payload = {
          client_id: formData.client_id,
          discount_percent: discount.discount_percent,
          discount_type: discount.discount_type,
          service_type_id: discount.service_type_id || null,
        };
        if (discount.discount_type === "one_time") {
          if (discount.scope === "piano") {
            const targetFormPiano = formData.pianos[Number(discount.targetPianoIndex)];
            const targetSavedPiano = savedPianos.find((row) =>
              String(row.piano_id || row.piano?.id) === String(targetFormPiano?.piano_id)
            );
            if (!targetSavedPiano?.id) {
              throw new Error("Could not match the selected piano to the saved appointment. Please save again.");
            }
            payload.applies_to_appointment_piano_id = targetSavedPiano.id;
          } else {
            payload.applies_to_appointment_id = savedAppointment.id;
          }
        }
        await createClientDiscount(payload);
      }

      const chargesToSave = formData.pianos.filter((piano) => piano.piano_id).flatMap((piano) => {
        const savedPiano = savedPianos.find((row) => String(row.piano_id || row.piano?.id) === String(piano.piano_id));
        const entries = piano.services?.length ? piano.services : [{ service_type_id: piano.service_type_id, billable_hours: piano.billable_hours, service: piano.service }];
        return entries.map((entry) => {
          const service = serviceTypes.find((item) => item.id === entry.service_type_id || (!entry.service_type_id && entry.service && item.name.toLowerCase() === entry.service.toLowerCase()));
          return savedPiano && service ? { appointment_piano_id: savedPiano.id, service_type_id: service.id, billable_hours: service.pricing_method === "hourly" ? Number(entry.billable_hours) : null } : null;
        }).filter(Boolean);
      });
      await saveAppointmentCharges(savedAppointment.id, chargesToSave);
      if (completeAfterSave) {
        await completeAppointment(savedAppointment.id);
      }

      if (onSaved) {
        await onSaved();
      }

      onClose();
    } catch (error) {
      console.error(
        "Failed to save appointment:",
        error
      );

      setError(
        error.message ||
          (completeAfterSave ? "Failed to complete appointment." : "Failed to save appointment.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!appointment) {
      return;
    }

    const confirmed = window.confirm(
      "Cancel this appointment? It will be marked cancelled and retained in your history."
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await deleteAppointment(
        appointment.id
      );

      if (onDeleted) {
        await onDeleted();
      }

      onClose();
    } catch (error) {
      console.error(
        "Failed to delete appointment:",
        error
      );

      setError(
        error.message ||
          "Failed to delete appointment."
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleClientSaved(client) {
    setShowClientModal(false);

    try {
      const updatedClients =
        await getClients();

      setClients(updatedClients || []);

      if (client?.id) {
        setFormData((previous) => ({
          ...previous,
          client_id: client.id,
          client_address_id: "",
          pianos: [],
        }));
      }
    } catch (error) {
      console.error(
        "Failed to reload clients:",
        error
      );

      setError(
        "Client was created, but the client list could not be refreshed."
      );
    }
  }

  async function handlePianoSaved(piano) {
    setShowPianoModal(false);

    try {
      const updatedPianos =
        await getPianos();

      setAllPianos(
        updatedPianos || []
      );

      if (piano?.id) {
        setFormData((previous) => ({
          ...previous,
          pianos: [
            ...previous.pianos,
            {
              ...EMPTY_PIANO,
              piano_id: piano.id,
              service_type_id: serviceTypes.find((service) => /tun/i.test(service.name))?.id || "",
              service: serviceTypes.find((service) => /tun/i.test(service.name))?.name || "",
            },
          ],
        }));
      }
    } catch (error) {
      console.error(
        "Failed to reload pianos:",
        error
      );

      setError(
        "Piano was created, but the piano list could not be refreshed."
      );
    }
  }

  return (
    <>
      <div
        className="appointment-modal-overlay"
        onClick={onClose}
      >
        <div
          className="appointment-modal"
          onClick={(event) =>
            event.stopPropagation()
          }
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

                <ClientSearchSelect
                  clients={clients}
                  value={formData.client_id}
                  onChange={(clientId) => {
                    handleClientChange({
                      target: {
                        value: clientId,
                      },
                    });
                  }}
                  onCreateClient={() =>
                    setShowClientModal(true)
                  }
                />
              </div>

              {/* Location */}
              <div className="appointment-form-field">
                <label htmlFor="appointment-location">
                  Location
                </label>

                <select
                  id="appointment-location"
                  name="client_address_id"
                  value={
                    formData.client_address_id
                  }
                  onChange={handleChange}
                  disabled={
                    !formData.client_id ||
                    clientAddresses.length === 0
                  }
                >
                  <option value="">
                    {!formData.client_id
                      ? "Select a client first"
                      : clientAddresses.length === 0
                      ? "No addresses available"
                      : "Select a location"}
                  </option>

                  {clientAddresses.map(
                    (address) => (
                      <option
                        key={address.id}
                        value={address.id}
                      >
                        {getAddressLabel(
                          address
                        )}
                      </option>
                    )
                  )}
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
                    value={
                      formData.start_time
                    }
                    onChange={
                      handleStartTimeChange
                    }
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
                    value={
                      formData.end_time
                    }
                    onChange={
                      handleManualEndTimeChange
                    }
                    required
                  />
                </div>
              </div>

              {isEditing && (
                <div className="appointment-status-readout">
                  Status: <strong>{appointment.status || "scheduled"}</strong>
                </div>
              )}

              {/* Pianos */}
              <div className="appointment-section">
                <div className="appointment-section-header">
                  <label>Pianos</label>
                </div>

                {!formData.client_id && (
                  <p className="appointment-help-text">
                    Select a client to add
                    pianos.
                  </p>
                )}

                {formData.client_id &&
                  clientPianos.length === 0 && (
                    <p className="appointment-help-text">
                      This client has no
                      pianos.
                    </p>
                  )}

                {formData.pianos.map(
                  (
                    appointmentPiano,
                    index
                  ) => (
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
                          onClick={() =>
                            removePiano(
                              index
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>

                      <div className="appointment-form-field">
                        <label>Piano</label>

                        <select
                          value={
                            appointmentPiano.piano_id
                          }
                          onChange={(
                            event
                          ) =>
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

                          {clientPianos.map(
                            (piano) => (
                              <option
                                key={
                                  piano.id
                                }
                                value={
                                  piano.id
                                }
                              >
                                {[
                                  piano.make,
                                  piano.model,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " "
                                  ) ||
                                  "Unnamed Piano"}

                                {piano.serial
                                  ? ` — ${piano.serial}`
                                  : ""}

                                {piano.location
                                  ? ` — ${piano.location}`
                                  : ""}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="appointment-piano-services">
                        {(appointmentPiano.services?.length ? appointmentPiano.services : [{ service_type_id: appointmentPiano.service_type_id || "", billable_hours: appointmentPiano.billable_hours || "", service: appointmentPiano.service || "" }]).map((serviceEntry, serviceIndex) => {
                          const selectedService = serviceTypes.find((service) => service.id === serviceEntry.service_type_id || (!serviceEntry.service_type_id && serviceEntry.service && service.name.toLowerCase() === serviceEntry.service.toLowerCase()));
                          const discountEditorKey = `${index}:${serviceIndex}`;
                          const selectedServiceId = selectedService?.id || serviceEntry.service_type_id;
                          const existingDiscounts = clientDiscounts.filter((discount) => discount.is_active && (!discount.service_type_id || discount.service_type_id === selectedServiceId) && (discount.discount_type === "ongoing" || (appointment?.id && discount.applies_to_appointment_id === appointment.id) || (appointmentPiano.id && discount.applies_to_appointment_piano_id === appointmentPiano.id)));
                          const appliedDiscounts = [...existingDiscounts, ...discountDrafts.filter((discount) => discount.is_active && (!discount.service_type_id || discount.service_type_id === selectedServiceId) && (discount.discount_type === "ongoing" || (discount.scope === "piano" && Number(discount.targetPianoIndex) === index)))];
                          const preview = pricingPreview[index]?.[serviceIndex];
                          return (
                            <div className="appointment-piano-service" key={`${appointmentPiano.id || index}-service-${serviceIndex}`}>
                              <div className="appointment-form-row appointment-piano-service-row">
                                <div className="appointment-form-field appointment-service-field">
                                  <label>Service {serviceIndex + 1} *</label>
                                  <select value={serviceEntry.service_type_id || selectedService?.id || ""} onChange={(event) => handleServiceChange(index, serviceIndex, "service_type_id", event.target.value)} required>
                                    <option value="">Select configured service</option>
                                    {serviceTypes.map((service) => <option key={service.id} value={service.id}>{service.name} — {service.pricing_method === "hourly" ? `$${Number(service.price).toFixed(2)}/hr` : `$${Number(service.price).toFixed(2)} flat`}</option>)}
                                  </select>
                                </div>
                                <div className="appointment-form-field appointment-apply-discount-field">
                                  <label>Discount</label>
                                  <button type="button" className="appointment-add-button appointment-apply-discount-button" disabled={!selectedServiceId} onClick={() => {
                                    setActiveDiscountPianoIndex(activeDiscountPianoIndex === discountEditorKey ? null : discountEditorKey);
                                    setDiscountType("one_time");
                                    setDiscountPercent("");
                                    setError("");
                                  }}>{activeDiscountPianoIndex === discountEditorKey ? "Close discount" : "Apply discount"}</button>
                                </div>
                                {appointmentPiano.services?.length > 1 && (
                                  <div className="appointment-form-field appointment-piano-service-remove">
                                    <label> </label>
                                    <button type="button" className="appointment-remove-button" onClick={() => removeServiceFromPiano(index, serviceIndex)}>Remove service</button>
                                  </div>
                                )}
                                {selectedService?.pricing_method === "hourly" && (
                                  <div className="appointment-form-field appointment-hourly-field">
                                    <label htmlFor={`billable-hours-${index}-${serviceIndex}`}>Actual billable hours *</label>
                                    <input id={`billable-hours-${index}-${serviceIndex}`} type="text" inputMode="decimal" autoComplete="off" value={serviceEntry.billable_hours ?? ""} onChange={(event) => handleServiceChange(index, serviceIndex, "billable_hours", event.target.value)} placeholder="e.g. 1.5" required />
                                  </div>
                                )}
                              </div>
                              {activeDiscountPianoIndex === discountEditorKey && (
                                <div className="appointment-inline-discount-editor">
                                  <div className="appointment-inline-discount-heading">
                                    <strong>Discount for this service</strong>
                                    <span>{selectedService?.name || "Selected service"}</span>
                                  </div>
                                  <div className="appointment-form-row appointment-discount-input-row">
                                    <div className="appointment-form-field">
                                      <label htmlFor={`appointment-discount-type-${index}-${serviceIndex}`}>Discount type</label>
                                      <select id={`appointment-discount-type-${index}-${serviceIndex}`} value={discountType} onChange={(event) => setDiscountType(event.target.value)}>
                                        <option value="one_time">One-time — this appointment only</option>
                                        <option value="ongoing">Ongoing — future appointments too</option>
                                      </select>
                                    </div>
                                    <div className="appointment-form-field appointment-discount-percent-field">
                                      <label htmlFor={`appointment-discount-percent-${index}-${serviceIndex}`}>Discount (%)</label>
                                      <input id={`appointment-discount-percent-${index}-${serviceIndex}`} type="number" min="0.01" max="100" step="0.01" value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} placeholder="e.g. 10" />
                                    </div>
                                  </div>
                                  <div className="appointment-inline-discount-actions">
                                    <button type="button" className="appointment-add-button" onClick={() => {
                                      const percent = Number(discountPercent);
                                      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
                                        setError("Enter a discount percentage greater than 0 and no more than 100.");
                                        return;
                                      }
                                      if (!selectedServiceId) {
                                        setError("Choose a service before applying a discount.");
                                        return;
                                      }
                                      setError("");
                                      setDiscountDrafts((previous) => [...previous, {
                                        draftId: `discount-${Date.now()}-${previous.length}`,
                                        discount_percent: percent,
                                        discount_type: discountType,
                                        service_type_id: selectedServiceId,
                                        scope: "piano",
                                        targetPianoIndex: index,
                                        is_active: true,
                                      }]);
                                      setDiscountPercent("");
                                      setActiveDiscountPianoIndex(null);
                                    }}>Add discount</button>
                                    <button type="button" className="appointment-remove-button" onClick={() => setActiveDiscountPianoIndex(null)}>Cancel</button>
                                  </div>
                                </div>
                              )}
                              {appliedDiscounts.length > 0 && (
                                <div className="appointment-applied-discounts">
                                  {appliedDiscounts.map((discount) => {
                                      const discountKey = String(discount.id || discount.draftId);
                                      const isEditingDiscount = editingDiscountKey === discountKey;
                                      return (
                                        <div className="appointment-applied-discount-item" key={discountKey}>
                                          <span>{Number(discount.discount_percent)}% {discount.discount_type === "one_time" ? "one-time" : "ongoing"} discount</span>
                                          {isEditingDiscount ? (
                                            <div className="appointment-edit-discount-controls">
                                              <input aria-label="Discount percentage" type="number" min="0.01" max="100" step="0.01" value={editingDiscountPercent} onChange={(event) => setEditingDiscountPercent(event.target.value)} />
                                              <button type="button" className="appointment-add-button" disabled={savingDiscountEdit} onClick={async () => {
                                                const percent = Number(editingDiscountPercent);
                                                if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
                                                  setError("Enter a discount percentage greater than 0 and no more than 100.");
                                                  return;
                                                }
                                                setSavingDiscountEdit(true);
                                                setError("");
                                                try {
                                                  if (discount.draftId) {
                                                    setDiscountDrafts((previous) => previous.map((item) => item.draftId === discount.draftId ? { ...item, discount_percent: percent } : item));
                                                  } else {
                                                    await updateClientDiscount(discount.id, { discount_percent: percent });
                                                    const refreshed = await getClientDiscounts(formData.client_id);
                                                    setClientDiscounts(refreshed || []);
                                                  }
                                                  setEditingDiscountKey(null);
                                                  setEditingDiscountPercent("");
                                                } catch (err) {
                                                  setError(err.message || "Failed to update discount.");
                                                } finally {
                                                  setSavingDiscountEdit(false);
                                                }
                                              }}>{savingDiscountEdit ? "Saving…" : "Save"}</button>
                                              <button type="button" className="appointment-remove-button" disabled={savingDiscountEdit} onClick={() => { setEditingDiscountKey(null); setEditingDiscountPercent(""); }}>Cancel</button>
                                            </div>
                                          ) : (
                                            <button type="button" className="appointment-remove-button appointment-edit-discount-button" onClick={() => { setEditingDiscountKey(discountKey); setEditingDiscountPercent(String(discount.discount_percent)); setError(""); }}>Edit</button>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                              {preview?.service && (
                                <div className="appointment-price-preview">
                                  <div className="appointment-price-preview-heading"><strong>Price estimate</strong><span>{preview.service.name}</span></div>
                                  <div className="appointment-price-line"><span>Base price{preview.service.pricing_method === "hourly" ? ` (${serviceEntry.billable_hours || "—"} hr × $${Number(preview.service.price).toFixed(2)})` : ""}</span><span>{preview.ready ? `$${preview.baseAmount.toFixed(2)}` : "Enter actual hours"}</span></div>
                                  {preview.discounts.map((discount, discountIndex) => <div className="appointment-price-line appointment-price-discount" key={`${discount.label}-${discountIndex}`}><span>{discount.label} ({discount.percent}%)</span><span>−${discount.amount.toFixed(2)}</span></div>)}
                                  <div className="appointment-price-line appointment-price-total"><strong>Service total</strong><strong>{preview.ready ? `$${preview.finalAmount.toFixed(2)}` : "—"}</strong></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <button type="button" className="appointment-add-button appointment-add-service-button" onClick={() => addServiceToPiano(index)}>+ Add service to this piano</button>
                      </div>

                      <div className="appointment-form-row appointment-piano-environment-row">
                        <div className="appointment-form-field">
                          <label>Temp</label>
                          <input type="text" className={completionMode && !String(appointmentPiano.temp ?? "").trim() ? "completion-field-missing" : ""} value={appointmentPiano.temp} onChange={(event) => handlePianoChange(index, "temp", event.target.value)} />
                        </div>
                        <div className="appointment-form-field">
                          <label>Humidity</label>
                          <input type="text" className={completionMode && !String(appointmentPiano.hum ?? "").trim() ? "completion-field-missing" : ""} value={appointmentPiano.hum} onChange={(event) => handlePianoChange(index, "hum", event.target.value)} />
                        </div>
                      </div>

                      <div className="appointment-form-field">
                        <label>
                          Notes
                        </label>

                        <textarea
                          rows="3"
                          value={
                            appointmentPiano.notes
                          }
                          onChange={(
                            event
                          ) =>
                            handlePianoChange(
                              index,
                              "notes",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>
                    </div>
                  )
                )}

                {formData.pianos.length > 0 && (
                  <div className="appointment-pricing-summary">
                    <span>Estimated appointment total</span>
                    <strong>{pricingReady ? "$" + estimatedTotal.toFixed(2) : "Complete service pricing"}</strong>
                  </div>
                )}

                <div className="appointment-piano-actions">
                  <button
                    type="button"
                    className="appointment-add-button"
                    onClick={addPiano}
                    disabled={
                      !formData.client_id
                    }
                  >
                    + Add Existing Piano
                  </button>

                  <button
                    type="button"
                    className="appointment-add-button"
                    onClick={() =>
                      setShowPianoModal(true)
                    }
                    disabled={
                      !formData.client_id
                    }
                  >
                    + New Piano
                  </button>
                </div>
              </div>

              {/* Payment */}
              <div className="appointment-form-row">
                <div className="appointment-form-field">
                  <label htmlFor="appointment-payment">
                    Payment
                  </label>

                  <input
                    id="appointment-payment"
                    className={completionMode && formData.payment.trim() === "" ? "completion-field-missing" : ""}
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
                    className={completionMode && !formData.payment_type.trim() ? "completion-field-missing" : ""}
                    name="payment_type"
                   
                    value={
                      formData.payment_type
                    }
                    onChange={handleChange}
                  >
                    <option value="">
                      Select
                    </option>
                    <option value="ach">
                      ACH
                    </option>
                    <option value="cash">
                      Cash
                    </option>
                    <option value="check">
                      Check
                    </option>
                    <option value="card">
                      Card
                    </option>
                    <option value="venmo">
                      Venmo
                    </option>
                    <option value="paypal">
                      PayPal
                    </option>
                    <option value="other">
                      Other
                    </option>
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
                    className={completionMode && formData.miles.trim() === "" ? "completion-field-missing" : ""}
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
                    value={
                      formData.invoice
                    }
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
                {isEditing && (appointment.status || "scheduled") === "scheduled" && (
                  <button
                    type="button"
                    className="appointment-delete-button action-button action-button--danger"
                    onClick={
                      handleDelete
                    }
                    disabled={
                      deleting ||
                      saving
                    }
                  >
                    {deleting
                      ? "Cancelling..."
                      : "Cancel Appointment"}
                  </button>
                )}

                <div className="appointment-modal-actions-right">
                  {isEditing && (appointment.status || "scheduled") === "scheduled" && (
                    <button
                      type="button"
                      className="appointment-complete-button action-button action-button--primary"
                      onClick={() => handleSubmit(null, true)}
                      disabled={saving || deleting}
                    >
                      {saving && completionMode ? "Completing..." : "Complete Appointment"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="appointment-cancel-button action-button action-button--secondary"
                    onClick={onClose}
                    disabled={
                      saving ||
                      deleting
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="appointment-save-button action-button action-button--primary"
                    disabled={
                      saving ||
                      deleting
                    }
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

      {showClientModal && (
        <AddClientModal
          onClose={() =>
            setShowClientModal(false)
          }
          onClientAdded={
            handleClientSaved
          }
        />
      )}

      {showPianoModal && (
        <PianoForm
          clientId={
            formData.client_id
          }
          onClose={() =>
            setShowPianoModal(false)
          }
          onSaved={
            handlePianoSaved
          }
        />
      )}
    </>
  );
}

export default AppointmentModal;