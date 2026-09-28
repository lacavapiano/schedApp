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

	const sortedAppointments = [...appointments]
	  .sort(
	    (a, b) =>
	      new Date(b.start_time) -
	      new Date(a.start_time)
	  );

  function handleAppointmentClick(appointment) {
    setEditingAppointment(appointment);
  }

  function handleCloseAppointmentModal() {
    setEditingAppointment(null);
  }

  async function handleAppointmentSaved() {
    setEditingAppointment(null);
    await loadAppointments();
  }

  async function handleAppointmentDeleted() {
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
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Appointments</h2>
          </div>

          <AppointmentList
            appointments={sortedAppointments}
            onAppointmentClick={handleAppointmentClick}
            emptyMessage="No appointments."
          />
        </section>
      </div>

      {editingAppointment && (
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