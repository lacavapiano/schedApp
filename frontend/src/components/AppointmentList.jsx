import "../styles/Dashboard.css";

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateString) {
  const date = new Date(dateString);

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getServices(appointment) {
  return [
    ...new Set(
      appointment.appointment_pianos
        ?.map((item) => item.service)
        .filter(Boolean) || []
    ),
  ];
}

function getStatusClass(status) {
  return `appointment-status appointment-status-${(
    status || "scheduled"
  )
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
}

function formatStatus(status) {
  if (!status) {
    return "Scheduled";
  }

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
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

function AppointmentList({
  appointments,
  onAppointmentClick,
  emptyMessage,
}) {
  if (appointments.length === 0) {
    return (
      <div className="appointment-list-empty">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="appointment-list">
      {appointments.map((appointment) => {
        const services = getServices(appointment);

        return (
          <button
            key={appointment.id}
            type="button"
            className="dashboard-appointment"
            onClick={() =>
              onAppointmentClick(appointment)
            }
          >
            <div className="dashboard-appointment-date">
              {formatDate(appointment.start_time)}
            </div>

            <div className="dashboard-appointment-time">
              {formatTime(appointment.start_time)}
              {" - "}
              {formatTime(appointment.end_time)}
            </div>

            <div className="dashboard-appointment-client">
              {appointment.client?.name || "Appointment"}
            </div>

            <div className="dashboard-appointment-service">
              {services.join(", ")}
            </div>

            <div className="dashboard-appointment-address">
              {formatAddress(appointment.client_address)}
            </div>

            <span className={getStatusClass(appointment.status)}>
              {formatStatus(appointment.status)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default AppointmentList;