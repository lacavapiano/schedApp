import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import PageLayout from "../components/PageLayout";
import AppointmentModal from "../components/AppointmentModal";
import { getAppointments } from "../services/api";

import "../styles/Calendar.css";

function Calendar() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAppointmentModal, setShowAppointmentModal] =
    useState(false);

  const [editingAppointment, setEditingAppointment] =
    useState(null);

  async function loadAppointments() {
    try {
      const data = await getAppointments();
      setAppointments(data);
    } catch (error) {
      console.error("Failed to load appointments:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const events = appointments.map((appointment) => {
    const pianoNames =
      appointment.appointment_pianos
        ?.map((item) => {
          if (!item.piano) {
            return null;
          }

          const make = item.piano.make ?? "";
          const model = item.piano.model ?? "";

          return `${make} ${model}`.trim();
        })
        .filter(Boolean)
        .join(", ") || "";

    const services = [
	  ...new Set(
	    appointment.appointment_pianos
	      ?.map((item) => item.service)
	      .filter(Boolean)
	  ),
	];

	const service = services[0] || "";

	const clientName =
	  appointment.client?.name || "Appointment";

    return {
	  id: appointment.id,
	  title: clientName,
	  start: appointment.start_time,
	  end: appointment.end_time,

	  extendedProps: {
      client: appointment.client,
      clientAddress: appointment.client_address,
      pianos: appointment.appointment_pianos,
      pianoNames,
      service,
      services,
      status: appointment.status,
    },
	};
  });

  function handleEventClick(info) {
    const appointment = appointments.find(
      (item) => item.id === info.event.id
    );

    if (!appointment) {
      return;
    }

    setEditingAppointment(appointment);
    setShowAppointmentModal(true);
  }

  function handleNewAppointment() {
    setEditingAppointment(null);
    setShowAppointmentModal(true);
  }

  function handleCloseAppointmentModal() {
    setShowAppointmentModal(false);
    setEditingAppointment(null);
  }

  async function handleAppointmentSaved() {
    await loadAppointments();
  }

  async function handleAppointmentDeleted() {
    await loadAppointments();
  }

  function renderEventContent(eventInfo) {
    const {
      client,
      service,
      clientAddress,
    } = eventInfo.event.extendedProps;

    return (
      <div className="calendar-event">
        <div className="calendar-event-time">
          {eventInfo.timeText}
        </div>

        <div className="calendar-event-client">
          {client?.name || "Unknown Client"}
        </div>

        <div className="calendar-event-service">
          {service || "No service"}
        </div>

        <div className="calendar-event-address">
          {formatAddress(clientAddress)}
        </div>
      </div>
    );
  }

  function formatAddress(address) {
    if (!address) return "";

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

  if (loading) {
    return (
      <PageLayout title="Calendar">
        <div className="calendar-loading">
          Loading calendar...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Calendar">
      <div className="calendar-page">
        <div className="calendar-toolbar">
          <div className="calendar-count">
            {appointments.length}{" "}
            {appointments.length === 1
              ? "appointment"
              : "appointments"}
          </div>

          <button
            className="add-appointment-button"
            onClick={handleNewAppointment}
          >
            + New Appointment
          </button>
        </div>

        <div className="calendar-container">
          <FullCalendar
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
            ]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right:
                "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            height="auto"
            dayMaxEvents={3}
            nowIndicator={true}
            selectable={false}
            editable={false}
            weekends={true}
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              meridiem: "short",
            }}
          />
        </div>

        {showAppointmentModal && (
          <AppointmentModal
            appointment={editingAppointment}
            onClose={handleCloseAppointmentModal}
            onSaved={handleAppointmentSaved}
            onDeleted={handleAppointmentDeleted}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default Calendar;