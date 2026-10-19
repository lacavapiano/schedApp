import { useEffect, useState } from "react";

import PageLayout from "../components/PageLayout";
import AppointmentList from "../components/AppointmentList";
import AppointmentModal from "../components/AppointmentModal";
import { getAppointments } from "../services/api";

import "../styles/Dashboard.css";

function Dashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [completedVisibleCount, setCompletedVisibleCount] = useState(10);

  async function loadAppointments() {
    try {
      const data = await getAppointments();
      setAppointments(data || []);
    } catch (error) {
      console.error("Failed to load appointments:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const completedAppointments = appointments
    .filter((appointment) => appointment.status?.toLowerCase() === "completed")
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const cancelledAppointments = appointments
    .filter((appointment) => appointment.status?.toLowerCase() === "cancelled")
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  const upcomingAppointments = appointments
    .filter((appointment) => {
      const status = appointment.status?.toLowerCase();
      return status !== "completed" && status !== "cancelled";
    })
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  function handleAppointmentClick(appointment) {
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
    setShowAppointmentModal(false);
    setEditingAppointment(null);
    await loadAppointments();
  }

  async function handleAppointmentDeleted() {
    setShowAppointmentModal(false);
    setEditingAppointment(null);
    await loadAppointments();
  }

  if (loading) {
    return (
      <PageLayout title="Dashboard">
        <div className="dashboard-loading">
          Loading dashboard...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Dashboard">
      <div className="dashboard">
        <div className="dashboard-toolbar">
          <button
            type="button"
            className="dashboard-new-appointment-button"
            onClick={handleNewAppointment}
          >
            + New Appointment
          </button>
        </div>

        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Upcoming</h2>
          </div>

          <AppointmentList
            appointments={upcomingAppointments}
            onAppointmentClick={handleAppointmentClick}
            emptyMessage="No upcoming appointments."
          />
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Completed</h2>
          </div>

          {completedAppointments.length === 0 ? (
            <AppointmentList
              appointments={completedAppointments}
              onAppointmentClick={handleAppointmentClick}
              emptyMessage="No completed appointments."
            />
          ) : (
            <>
              <div
                className={"dashboard-completed-list" +
                  (completedVisibleCount < completedAppointments.length ? " is-collapsed" : "")}
              >
                <AppointmentList
                  appointments={completedAppointments.slice(0, completedVisibleCount)}
                  onAppointmentClick={handleAppointmentClick}
                  emptyMessage="No completed appointments."
                />
              </div>
              {completedVisibleCount < completedAppointments.length && (
                <div className="dashboard-show-more-wrap">
                  <button
                    type="button"
                    className="dashboard-show-more"
                    onClick={() =>
                      setCompletedVisibleCount((count) =>
                        Math.min(count + 50, completedAppointments.length)
                      )
                    }
                  >
                    Show {Math.min(50, completedAppointments.length - completedVisibleCount)} more
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="dashboard-section dashboard-cancelled-section">
          <div className="dashboard-section-header dashboard-cancelled-header">
            <h2>Cancelled</h2>
            <label className="dashboard-cancelled-toggle">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(event) => setShowCancelled(event.target.checked)}
              />
              <span>Show cancelled appointments ({cancelledAppointments.length})</span>
            </label>
          </div>

          {showCancelled && (
            <AppointmentList
              appointments={cancelledAppointments}
              onAppointmentClick={handleAppointmentClick}
              emptyMessage="No cancelled appointments."
            />
          )}
        </section>
      </div>

      {showAppointmentModal && (
        <AppointmentModal
          appointment={editingAppointment}
          onClose={handleCloseAppointmentModal}
          onSaved={handleAppointmentSaved}
          onDeleted={handleAppointmentDeleted}
        />
      )}
    </PageLayout>
  );
}

export default Dashboard;
