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
  const [incomeSortOrder, setIncomeSortOrder] = useState("amount-desc");

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
    const payment = Number(String(appointment.payment ?? 0).replace(/[$,]/g, ""));
    let labels;
    switch (incomeGroupBy) {
      case "year": labels = [String(date.getFullYear())]; break;
      case "type": labels = [appointment.client?.type || "Unknown client type"]; break;
      case "zip": labels = [appointment.client_address?.zip || appointment.client?.zip || "No ZIP code"]; break;
      case "city": labels = [appointment.client_address?.city || appointment.client?.city || "No town recorded"]; break;
      case "client": labels = [appointment.client?.name || "Unknown client"]; break;
      case "payment": labels = [appointment.payment_type || "Unspecified payment type"]; break;
      case "service": {
        const services = [...new Set((appointment.appointment_pianos || []).map((item) => item.service?.trim()).filter(Boolean))];
        labels = services.length ? services : ["No service recorded"];
        break;
      }
      default: labels = [date.toLocaleDateString("en-US", { month: "long", year: "numeric" })];
    }
    // Split a multi-service appointment evenly so the chart still represents 100% of recorded income.
    labels.forEach((label) => {
      const sortKey = incomeGroupBy === "month" ? date.getFullYear() * 12 + date.getMonth() : label;
      const key = String(sortKey);
      const row = incomeGroups.get(key) || { label, amount: 0, count: 0, sortKey };
      row.amount += payment / labels.length;
      row.count += 1 / labels.length;
      incomeGroups.set(key, row);
    });
  });
  const incomeRows = [...incomeGroups.values()].sort((a, b) => {
    if (incomeSortOrder === "amount-desc") return b.amount - a.amount || String(a.label).localeCompare(String(b.label));
    if (incomeSortOrder === "amount-asc") return a.amount - b.amount || String(a.label).localeCompare(String(b.label));
    if (incomeSortOrder === "label-desc") return String(b.label).localeCompare(String(a.label));
    if (incomeSortOrder === "label-asc") return String(a.label).localeCompare(String(b.label));
    return typeof a.sortKey === "number" && typeof b.sortKey === "number"
      ? b.sortKey - a.sortKey
      : String(a.label).localeCompare(String(b.label));
  });
  const incomeTotal = paidAppointments.reduce((sum, appointment) =>
    sum + Number(String(appointment.payment ?? 0).replace(/[$,]/g, "")), 0);
  // Time-based groupings are displayed chronologically, independently of the breakdown sort control.
  const incomeTimeRows = ["month", "year"].includes(incomeGroupBy)
    ? [...incomeRows].sort((a, b) => {
        if (incomeGroupBy === "month") return a.sortKey - b.sortKey;
        return Number(a.label) - Number(b.label);
      })
    : [];
  // Give each time bucket enough horizontal space to keep labels readable on small screens.
  const lineChartWidth = Math.max(720, 110 + incomeTimeRows.length * (incomeGroupBy === "month" ? 58 : 72));
  const lineChartHeight = 260;
  const lineChartPadding = { top: 24, right: 24, bottom: 54, left: 70 };
  const lineChartMax = Math.max(1, ...incomeTimeRows.map((row) => row.amount));
  const lineChartAverage = incomeTimeRows.length
    ? incomeTimeRows.reduce((sum, row) => sum + row.amount, 0) / incomeTimeRows.length
    : 0;
  const lineChartPlotWidth = lineChartWidth - lineChartPadding.left - lineChartPadding.right;
  const lineChartPlotHeight = lineChartHeight - lineChartPadding.top - lineChartPadding.bottom;
  const lineChartAverageY = lineChartPadding.top + lineChartPlotHeight - (lineChartAverage / lineChartMax) * lineChartPlotHeight;
  const lineChartPoints = incomeTimeRows.map((row, index) => ({
    ...row,
    x: lineChartPadding.left + (incomeTimeRows.length <= 1 ? lineChartPlotWidth / 2 : index * lineChartPlotWidth / (incomeTimeRows.length - 1)),
    y: lineChartPadding.top + lineChartPlotHeight - (row.amount / lineChartMax) * lineChartPlotHeight,
    axisLabel: incomeGroupBy === "month"
      ? new Date(Math.floor(row.sortKey / 12), row.sortKey % 12, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      : row.label,
  }));
  const chartPalette = ["#2463a6", "#d97706", "#16836b", "#b83280", "#7048a8", "#c24135", "#64748b", "#8b7a16", "#0e7490", "#6d4c41", "#4d7c0f", "#a21caf"];
  let chartCursor = 0;
  const incomePieStops = incomeRows.map((row, index) => {
    const start = chartCursor;
    chartCursor += incomeTotal > 0 ? (row.amount / incomeTotal) * 100 : 0;
    return `${chartPalette[index % chartPalette.length]} ${start}% ${chartCursor}%`;
  }).join(", ");

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
                <label>Group by<select value={incomeGroupBy} onChange={(event) => setIncomeGroupBy(event.target.value)}><option value="month">Month</option><option value="year">Year</option><option value="type">Client type</option><option value="city">Town / city</option><option value="zip">ZIP code</option><option value="service">Service type</option><option value="client">Client</option><option value="payment">Payment type</option></select></label><label>Sort order<select value={incomeSortOrder} onChange={(event) => setIncomeSortOrder(event.target.value)}><option value="amount-desc">Income: high to low</option><option value="amount-asc">Income: low to high</option><option value="label-asc">Name: A to Z</option><option value="label-desc">Name: Z to A</option><option value="date-desc">Date: newest first</option></select></label>
              </div>
            </div>
            <div className="income-summary">
              <div className="income-total-card"><span>Total recorded income</span><strong>{currency.format(incomeTotal)}</strong><small>{paidAppointments.length} paid appointment{paidAppointments.length === 1 ? "" : "s"}</small></div>
              <div className="income-breakdown"><h3>Breakdown by {({month:"month",year:"year",type:"client type",city:"town / city",zip:"ZIP code",service:"service type",client:"client",payment:"payment type"})[incomeGroupBy]}</h3>
                {incomeRows.length ? (
                  <>
                    {["month", "year"].includes(incomeGroupBy) ? (
                      <div className="income-line-chart">
                        <div className="income-line-chart-heading"><strong>Income over time</strong><span>{incomeGroupBy === "month" ? "Monthly totals" : "Yearly totals"}</span></div>
                        <div className="income-line-chart-scroll">
                          <svg viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`} role="img" aria-label={`Line chart of income by ${incomeGroupBy}`} preserveAspectRatio="xMidYMid meet">
                            {[0, 1, 2, 3].map((tick) => {
                              const y = lineChartPadding.top + lineChartPlotHeight * tick / 3;
                              const value = lineChartMax * (1 - tick / 3);
                              return <g key={tick}><line x1={lineChartPadding.left} x2={lineChartWidth - lineChartPadding.right} y1={y} y2={y} className="income-line-grid" /><text x={lineChartPadding.left - 9} y={y + 4} textAnchor="end" className="income-line-axis-label">{currency.format(value).replace(/\\.00$/, "")}</text></g>;
                            })}
                            <line x1={lineChartPadding.left} x2={lineChartWidth - lineChartPadding.right} y1={lineChartAverageY} y2={lineChartAverageY} className="income-line-average" />
                            <text x={lineChartWidth - lineChartPadding.right} y={Math.max(13, lineChartAverageY - 7)} textAnchor="end" className="income-line-average-label">Average {currency.format(lineChartAverage)}</text>
                            {lineChartPoints.length > 1 && <polyline points={lineChartPoints.map((point) => `${point.x},${point.y}`).join(" ")} className="income-line-path" />}
                            {lineChartPoints.map((point) => <g key={point.label}><circle cx={point.x} cy={point.y} r="4.5" className="income-line-point"><title>{point.axisLabel}: {currency.format(point.amount)}</title></circle><text x={point.x} y={lineChartHeight - 17} textAnchor="middle" className="income-line-axis-label">{point.axisLabel}</text></g>)}
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="income-pie-wrap"><div className="income-pie" role="img" aria-label={`Income share by ${incomeGroupBy}`} style={{background: `conic-gradient(${incomePieStops})`}}><div className="income-pie-hole"><strong>{currency.format(incomeTotal)}</strong><span>total</span></div></div></div>
                    )}
                    <div className="income-breakdown-list">{incomeRows.map((row, index) => <div className="income-breakdown-row" key={row.label}><span className="income-legend-dot" style={{background: chartPalette[index % chartPalette.length]}} /><div className="income-breakdown-label"><span>{row.label}</span><small>{row.count.toLocaleString(undefined, {maximumFractionDigits: 1})} appointment{row.count === 1 ? "" : "s"} · {incomeTotal > 0 ? ((row.amount / incomeTotal) * 100).toFixed(1) : "0.0"}%</small></div><strong>{currency.format(row.amount)}</strong></div>)}</div>
                  </>
                ) : <p>No recorded payments for this period.</p>}
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
