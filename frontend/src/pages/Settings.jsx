import { useEffect, useState } from "react";

import PageLayout from "../components/PageLayout";
import {
  getSettings,
  getGoogleStatus,
  getGoogleCalendars,
  updateSettings,
  connectGoogle,
} from "../services/api";

import "../styles/Settings.css";

function Settings() {
  const [settings, setSettings] = useState(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [calendars, setCalendars] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingCalendars, setLoadingCalendars] =
    useState(false);
  const [connectingGoogle, setConnectingGoogle] =
    useState(false);
  const [savingCalendar, setSavingCalendar] =
    useState(false);

  const [error, setError] = useState("");

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const [settingsData, googleStatus] =
        await Promise.all([
          getSettings(),
          getGoogleStatus(),
        ]);

      setSettings(settingsData);
      setGoogleConnected(
        googleStatus.connected === true
      );

      if (googleStatus.connected) {
        await loadCalendars();
      }
    } catch (error) {
      console.error(
        "Failed to load settings:",
        error
      );

      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCalendars() {
    try {
      setLoadingCalendars(true);

      const calendarData =
        await getGoogleCalendars();

      setCalendars(calendarData);
    } catch (error) {
      console.error(
        "Failed to load Google calendars:",
        error
      );

      setError(error.message);
    } finally {
      setLoadingCalendars(false);
    }
  }

  async function handleCalendarChange(event) {
    const calendarId = event.target.value;

    if (!calendarId) {
      return;
    }

    const selectedCalendar =
      calendars.find(
        (calendar) =>
          calendar.id === calendarId
      );

    if (!selectedCalendar) {
      return;
    }

    try {
      setSavingCalendar(true);
      setError("");

      const updatedSettings =
        await updateSettings({
          google_calendar_id:
            selectedCalendar.id,
          google_calendar_name:
            selectedCalendar.name,
        });

      setSettings(updatedSettings);
    } catch (error) {
      console.error(
        "Failed to save Google Calendar:",
        error
      );

      setError(error.message);
    } finally {
      setSavingCalendar(false);
    }
  }

  async function handleConnectGoogle() {
    let popup = null;

    try {
      setConnectingGoogle(true);
      setError("");

      popup = await connectGoogle();

      if (!popup) {
        throw new Error(
          "The Google authorization window could not be opened. Please allow popups for the client manager."
        );
      }

      const checkConnection =
        setInterval(async () => {
          try {
            if (popup.closed) {
              clearInterval(checkConnection);
              setConnectingGoogle(false);
              return;
            }

            const status =
              await getGoogleStatus();

            if (status.connected) {
              clearInterval(checkConnection);

              setGoogleConnected(true);

              const updatedSettings =
                await getSettings();

              setSettings(updatedSettings);

              await loadCalendars();

              setConnectingGoogle(false);

              popup.close();
            }
          } catch (error) {
            console.error(
              "Failed to check Google connection:",
              error
            );
          }
        }, 1000);

      setTimeout(() => {
        clearInterval(checkConnection);

        if (!popup.closed) {
          popup.close();
        }

        setConnectingGoogle(false);
      }, 10 * 60 * 1000);
    } catch (error) {
      console.error(
        "Failed to connect Google:",
        error
      );

      if (popup && !popup.closed) {
        popup.close();
      }

      setError(error.message);
      setConnectingGoogle(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <PageLayout title="Settings">
        <div className="settings-loading">
          Loading settings...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Settings">
      <div className="settings-page">
        {error && (
          <div className="settings-error">
            {error}
          </div>
        )}

        <section className="settings-section">
          <div className="settings-section-header">
            <div>
              <h2>Google Calendar</h2>

              <p>
                Connect your Google account so
                the client manager can keep your appointments
                synchronized with a Google Calendar.
              </p>
            </div>

            {googleConnected && (
              <span className="settings-status settings-status-connected">
                Connected
              </span>
            )}
          </div>

          {!googleConnected ? (
            <div className="settings-section-body">
              <p className="settings-help-text">
                Your Google account is not currently
                connected to the client manager.
              </p>

              <button
                type="button"
                className="settings-button"
                onClick={handleConnectGoogle}
                disabled={connectingGoogle}
              >
                {connectingGoogle
                  ? "Connecting..."
                  : "Connect Google Calendar"}
              </button>
            </div>
          ) : (
            <div className="settings-section-body">
              <div className="settings-field">
                <label htmlFor="google-calendar">
                  Calendar to synchronize
                </label>

                {loadingCalendars ? (
                  <div className="settings-calendar-loading">
                    Loading Google calendars...
                  </div>
                ) : calendars.length === 0 ? (
                  <div className="settings-empty-state">
                    <p>
                      No Google Calendars were found.
                    </p>

                    <span>
                      Make sure your Google account
                      has at least one calendar
                      available to the client manager.
                    </span>

                    <button
                      type="button"
                      className="settings-secondary-button"
                      onClick={loadCalendars}
                    >
                      Reload calendars
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      id="google-calendar"
                      className="settings-calendar-select"
                      value={
                        settings?.google_calendar_id ||
                        ""
                      }
                      onChange={
                        handleCalendarChange
                      }
                      disabled={savingCalendar}
                    >
                      <option value="">
                        Select a calendar
                      </option>

                      {calendars.map(
                        (calendar) => (
                          <option
                            key={calendar.id}
                            value={calendar.id}
                          >
                            {calendar.name}
                            {calendar.primary
                              ? " (Primary)"
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    {savingCalendar && (
                      <span className="settings-saving">
                        Saving...
                      </span>
                    )}

                    {settings?.google_calendar_id && (
                      <p className="settings-selected-help">
                        The client manager will use{" "}
                        <strong>
                          {settings.google_calendar_name ||
                            "this calendar"}
                        </strong>{" "}
                        for calendar synchronization.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}

export default Settings;