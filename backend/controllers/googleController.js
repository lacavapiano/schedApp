import crypto from "crypto";
import { google } from "googleapis";

import supabase, {
  getSupabaseForUser,
} from "../services/supabase.js";

function getAccessToken(req) {
  return req.headers.authorization?.replace("Bearer ", "");
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function connectGoogle(req, res) {
  try {
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const userSupabase =
      getSupabaseForUser(accessToken);

    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({
        error: "Invalid authentication token",
      });
    }

    /*
     * Generate a cryptographically secure, single-use
     * OAuth state value.
     */
    const state = crypto
      .randomBytes(32)
      .toString("hex");

    /*
     * OAuth state is valid for 10 minutes.
     */
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    ).toISOString();

    const { error: stateError } =
      await supabase
        .from("google_oauth_states")
        .insert({
          state,
          user_id: user.id,
          expires_at: expiresAt,
        });

    if (stateError) {
      console.error(
        "Error creating Google OAuth state:",
        stateError
      );

      return res.status(500).json({
        error:
          "Failed to start Google authorization",
      });
    }

    const oauth2Client =
      createOAuthClient();

    const authUrl =
      oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
          "https://www.googleapis.com/auth/calendar",
          "openid",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ],
        state,
      });

    return res.json({
      auth_url: authUrl,
    });
  } catch (error) {
    console.error(
      "Google connect error:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to start Google authorization",
    });
  }
}

export async function googleCallback(req, res) {
  try {
    const {
      code,
      state,
      error: googleError,
    } = req.query;

    if (googleError) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Authorization Cancelled</title>
          </head>
          <body>
            <h1>Google authorization cancelled</h1>
            <p>
              You can close this window and return to schedApp.
            </p>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send(
        "Missing Google authorization data."
      );
    }

    /*
     * The Google callback does not contain the user's
     * Supabase access token.
     *
     * The server-side Supabase client uses the existing
     * SUPABASE_SECRET_KEY from services/supabase.js.
     */
    const {
      data: oauthState,
      error: stateError,
    } = await supabase
      .from("google_oauth_states")
      .select(
        "state, user_id, expires_at"
      )
      .eq("state", state)
      .maybeSingle();

    if (stateError) {
      console.error(
        "Error retrieving Google OAuth state:",
        stateError
      );

      return res.status(500).send(
        "Failed to validate authorization."
      );
    }

    if (!oauthState) {
      return res.status(400).send(
        "Invalid or expired authorization state."
      );
    }

    /*
     * Verify that the OAuth state has not expired.
     */
    if (
      new Date(
        oauthState.expires_at
      ).getTime() <= Date.now()
    ) {
      await supabase
        .from("google_oauth_states")
        .delete()
        .eq("state", state);

      return res.status(400).send(
        "Authorization request expired. Please try again."
      );
    }

    /*
     * Consume the state before continuing so that it
     * cannot be reused.
     */
    const {
      error: deleteStateError,
    } = await supabase
      .from("google_oauth_states")
      .delete()
      .eq("state", state);

    if (deleteStateError) {
      console.error(
        "Error consuming Google OAuth state:",
        deleteStateError
      );

      return res.status(500).send(
        "Failed to validate authorization."
      );
    }

    const oauth2Client =
      createOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    console.log("Google tokens received:", {
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type,
    });

    if (!tokens.access_token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Authorization Failed</title>
          </head>
          <body>
            <h1>Google authorization failed</h1>
            <p>
              Google did not return an access token.
            </p>
          </body>
        </html>
      `);
    }

    if (!tokens.refresh_token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Authorization Failed</title>
          </head>
          <body>
            <h1>Google authorization failed</h1>
            <p>
              Google did not return a refresh token.
            </p>
            <p>
              Please try connecting your Google account again.
            </p>
          </body>
        </html>
      `);
    }

    oauth2Client.setCredentials(tokens);

    const accessToken = await oauth2Client.getAccessToken();

    console.log(
      "Google access token available:",
      !!accessToken.token
    );

    const oauth2 = google.oauth2({
      version: "v2",
      auth: oauth2Client,
    });

    const {
      data: googleUser,
    } = await oauth2.userinfo.get();

    console.log("Google user:", {
      id: googleUser.id,
      email: googleUser.email,
    });

    if (!googleUser?.id) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Authorization Failed</title>
          </head>
          <body>
            <h1>Google authorization failed</h1>
            <p>
              Google account information could not be retrieved.
            </p>
          </body>
        </html>
      `);
    }

    const {
      error: connectionError,
    } = await supabase
      .from("google_connections")
      .upsert(
        {
          user_id: oauthState.user_id,
          google_account_id: googleUser.id,
          refresh_token: tokens.refresh_token,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (connectionError) {
      console.error(
        "Error saving Google connection:",
        connectionError
      );

      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Connection Failed</title>
          </head>
          <body>
            <h1>Google connection failed</h1>
            <p>
              Your Google account was authorized,
              but schedApp could not save the connection.
            </p>
          </body>
        </html>
      `);
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Calendar Connected</title>
        </head>
        <body>
          <h1>Google Calendar connected</h1>
          <p>
            Connected as ${
              googleUser.email || "your Google account"
            }.
          </p>
          <p>
            You can close this window and return to schedApp.
          </p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(
      "Google callback error:",
      error
    );

    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Authorization Failed</title>
        </head>
        <body>
          <h1>Google authorization failed</h1>
          <p>
            Please close this window and try again.
          </p>
        </body>
      </html>
    `);
  }
}

export async function getGoogleStatus(req, res) {
  try {
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const userSupabase =
      getSupabaseForUser(accessToken);

    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({
        error: "Invalid authentication token",
      });
    }

    const {
      data,
      error,
    } = await supabase
      .from("google_connections")
      .select(
        "google_account_id, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Google status error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to retrieve Google connection",
      });
    }

    return res.json({
      connected: !!data,
      google_account_id:
        data?.google_account_id ?? null,
    });
  } catch (error) {
    console.error(
      "Google status error:",
      error
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}

export async function getGoogleCalendars(req, res) {
  try {
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const userSupabase =
      getSupabaseForUser(accessToken);

    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({
        error: "Invalid authentication token",
      });
    }

    const {
      data: connection,
      error: connectionError,
    } = await supabase
      .from("google_connections")
      .select("refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connectionError) {
      console.error(
        "Error retrieving Google connection:",
        connectionError
      );

      return res.status(500).json({
        error: "Failed to retrieve Google connection",
      });
    }

    if (!connection) {
      return res.status(400).json({
        error: "Google account is not connected",
      });
    }

    const oauth2Client = createOAuthClient();

    oauth2Client.setCredentials({
      refresh_token: connection.refresh_token,
    });

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const response =
      await calendar.calendarList.list({
        showDeleted: false,
        minAccessRole: "reader",
      });

    const calendars =
      response.data.items?.map((calendar) => ({
        id: calendar.id,
        name:
          calendar.summary ||
          calendar.id,
        description:
          calendar.description || null,
        access_role:
          calendar.accessRole || null,
        primary:
          calendar.primary === true,
      })) || [];

    return res.json(calendars);
  } catch (error) {
    console.error(
      "Google calendars error:",
      error
    );

    return res.status(500).json({
      error: "Failed to retrieve Google calendars",
    });
  }
}