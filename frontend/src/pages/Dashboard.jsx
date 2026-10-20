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
  const [activeTab, setActiveTab] = useState("appointments");
  const [incomePeriod, setIncomePeriod] = useState("year");
  const [incomeGroupBy, setIncomeGroupBy] = useState("month");

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
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  const cancelledAppointments = appointments
    .filter((appointment) => appointment.status?.toLowerCase() === "cancelled")
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  const upcomingAppointments = appointments
    .filter((appointment) => {
      const status = appointment.status?.toLowerCase();
      return status !== "completed" && status !== "cancelled";
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));


  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const now = new Date();
  const incomeStart = incomePeriod === "year" ? new Date(now.getFullYear(), 0, 1)
    : incomePeriod === "12months" ? new Date(now.getFullYear(), now.getMonth() - 11, 1) : null;
  const paidAppointments = appointments.filter((appointment) => {
    const status = appointment.status?.toLowerCase();
    const payment = Number(String(appointment.payment ?? 0).replace(/[$,]/g, ""));
    const date = new Date(appointment.start_time);
    return status !== "cancelled" && Number.isFinite(payment) && payment > 0 &&
      (!incomeStart || (date >= incomeStart && date <= now));
  });
  const incomeGroups = new Map();
  paidAppointments.forEach((appointment) => {
    const date = new Date(appointment.start_time);
    let label, sortKey;
    switch (incomeGroupBy) {
      case "year": label = String(date.getFullYear()); sortKey = date.getFullYear(); break;
      case "type": label = appointment.client?.type || "Unknown client type"; sortKey = label; break;
      case "zip": label = appointment.client_address?.zip || appointment.client?.zip || "No ZIP code"; sortKey = label; break;
      case "client": label = appointment.client?.name || "Unknown client"; sortKey = label; break;
      case "payment": label = appointment.payment_type || "Unspecified payment type"; sortKey = label; break;
      default: sortKey = date.getFullYear() * 12 + date.getMonth(); label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    const key = String(sortKey);
    const row = incomeGroups.get(key) || { label, amount: 0, count: 0, sortKey };
    row.amount += Number(String(appointment.payment ?? 0).replace(/[$,]/g, ""));
    row.count += 1;
    incomeGroups.set(key, row);
  });
  const incomeRows = [...incomeGroups.values()].sort((a, b) =>
    typeof a.sortKey === "number" && typeof b.sortKey === "number" ? b.sortKey - a.sortKey : String(a.label).localeCompare(String(b.label))
  );
  const incomeTotal = paidAppointments.reduce((sum, appointment) =>
    sum + Number(String(appointment.payment ?? 0).replace(/[$,]/g, "")), 0);

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
        <div className="dashboard-tabs" role="tablist" aria-label="Dashboard views">
          <button type="button" role="tab" aria-selected={activeTab === "appointments"} className={activeTab === "appointments" ? "is-active" : ""} onClick={() => setActiveTab("appointments")}>Appointments</button>
          <button type="button" role="tab" aria-selected={activeTab === "income"} className={activeTab === "income" ? "is-active" : ""} onClick={() => setActiveTab("income")}>Income</button>
        </div>
        {activeTab === "income" ? (
          <section className="dashboard-section income-report">
            <div className="income-header">
              <div><h2>Income</h2><p>Based on appointment payments and appointment dates. Cancelled appointments are excluded.</p></div>
              <div className="income-filters">
                <label>Period<select value={incomePeriod} onChange={(event) => setIncomePeriod(event.target.value)}><option value="year">This year</option><option value="12months">Last 12 months</option><option value="all">All time</option></select></label>
                <label>Group by<select value={incomeGroupBy} onChange={(event) => setIncomeGroupBy(event.target.value)}><option value="month">Month</option><option value="year">Year</option><option value="type">Client type</option><option value="zip">ZIP code</option><option value="client">Client</option><option value="payment">Payment type</option></select></label>
              </div>
            </div>
            <div className="income-summary">
              <div className="income-total-card"><span>Total recorded income</span><strong>{currency.format(incomeTotal)}</strong><small>{paidAppointments.length} paid appointment{paidAppointments.length === 1 ? "" : "s"}</small></div>
              <div className="income-breakdown"><h3>Breakdown by {({month:"month",year:"year",type:"client type",zip:"ZIP code",client:"client",payment:"payment type"})[incomeGroupBy]}</h3>
                {incomeRows.length ? <div className="income-breakdown-list">{incomeRows.map((row) => <div className="income-breakdown-row" key={row.label}><div className="income-breakdown-label"><span>{row.label}</span><small>{row.count} appointment{row.count === 1 ? "" : "s"}</small></div><strong>{currency.format(row.amount)}</strong><div className="income-bar-track"><span style={{width: `${incomeTotal > 0 ? (row.amount / incomeTotal) * 100 : 0}%`}} /></div></div>)}</div> : <p>No recorded payments for this period.</p>}
              </div>
            </div>
          </section>
        ) : (<>
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
        </>)}
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
