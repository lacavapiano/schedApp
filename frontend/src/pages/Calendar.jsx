import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import PageLayout from "../components/PageLayout";
import { getAppointments } from "../services/api";

import "../styles/Calendar.css";

function Calendar() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

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

          const manufacturer = item.piano.manufacturer ?? "";
          const model = item.piano.model ?? "";

          return `${manufacturer} ${model}`.trim();
        })
        .filter(Boolean)
        .join(", ") || "";

    const services =
      appointment.appointment_pianos
        ?.map((item) => item.service)
        .filter(Boolean)
        .join(", ") || "";

    let title = appointment.client?.name || "Appointment";

    if (services) {
      title += ` — ${services}`;
    }

    return {
      id: appointment.id,
      title,
      start: appointment.start_time,
      end: appointment.end_time,
      extendedProps: {
        client: appointment.client,
        pianos: appointment.appointment_pianos,
        pianoNames,
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

    console.log("Selected appointment:", appointment);

    // Appointment detail/edit functionality can be added here.
  }

  function handleNewAppointment() {
    // Appointment modal/form will be connected here.
    console.log("New appointment");
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
            {appointments.length === 1 ? "appointment" : "appointments"}
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
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            eventClick={handleEventClick}
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
      </div>
    </PageLayout>
  );
}

export default Calendar;