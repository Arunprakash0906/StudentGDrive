/**
 * Google Drive Picker Service
 * Based on Google's official browser samples:
 * https://github.com/googleworkspace/browser-samples/tree/main/drive/picker
 *
 * Optimized for React / Vite with synchronous click handling to prevent popup blockers.
 */

// Required scopes for Google Drive Picker and Google Sheets reading/writing
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets'
].join(' ');

/**
 * Ensures Google API (gapi) and Google Identity Services (gis) are loaded.
 */
export function loadGoogleScripts() {
  return new Promise((resolve, reject) => {
    let gapiReady = !!window.gapi;
    let gisReady = !!(window.google && window.google.accounts);

    if (gapiReady && gisReady) {
      return resolve();
    }

    const checkReady = () => {
      gapiReady = !!window.gapi;
      gisReady = !!(window.google && window.google.accounts);
      if (gapiReady && gisReady) {
        resolve();
      }
    };

    if (!gapiReady) {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        gapiReady = true;
        checkReady();
      };
      gapiScript.onerror = () => reject(new Error('Failed to load Google API (api.js)'));
      document.body.appendChild(gapiScript);
    }

    if (!gisReady) {
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = () => {
        gisReady = true;
        checkReady();
      };
      gisScript.onerror = () => reject(new Error('Failed to load Google Identity Services (gsi/client)'));
      document.body.appendChild(gisScript);
    }

    // Safety timeout after 10s
    setTimeout(() => {
      if (!gapiReady || !gisReady) {
        reject(new Error('Timed out waiting for Google API scripts to load. Check your internet connection.'));
      }
    }, 10000);
  });
}

/**
 * Initializes gapi.picker module
 */
export function initPickerApi() {
  return new Promise((resolve, reject) => {
    if (!window.gapi) {
      return reject(new Error('Google API client (gapi) is not loaded.'));
    }
    if (window.google && window.google.picker) {
      return resolve();
    }
    window.gapi.load('picker', {
      callback: () => resolve(),
      onerror: () => reject(new Error('Failed to load Google Picker module.'))
    });
  });
}

/**
 * Requests an OAuth 2.0 access token via Google Identity Services (GIS).
 */
export function requestAccessToken(clientId, currentToken = null) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services (google.accounts.oauth2) is not ready yet. Please wait a moment and retry.'));
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) {
          return reject(new Error(resp.error_description || resp.error || 'Authentication failed'));
        }
        resolve(resp.access_token);
      }
    });

    tokenClient.requestAccessToken({ prompt: currentToken ? '' : 'consent' });
  });
}

/**
 * Launches the Google Drive Picker modal.
 */
export function openGooglePicker({
  apiKey,
  appId,
  accessToken,
  viewMode = 'spreadsheets',
  onPick,
  onCancel
}) {
  if (!window.google?.picker) {
    throw new Error('Google Picker library is not ready.');
  }

  // Configure views based on mode
  let view;
  if (viewMode === 'spreadsheets') {
    view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS);
    view.setMimeTypes('application/vnd.google-apps.spreadsheet');
    view.setIncludeFolders(true);
  } else {
    view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    view.setIncludeFolders(true);
  }

  const builder = new window.google.picker.PickerBuilder()
    .setOAuthToken(accessToken)
    .setDeveloperKey(apiKey)
    .addView(view)
    .addView(new window.google.picker.DocsUploadView())
    .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
    .setCallback((data) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const doc = data[window.google.picker.Response.DOCUMENTS][0];
        const selectedFile = {
          id: doc[window.google.picker.Document.ID],
          name: doc[window.google.picker.Document.NAME],
          url: doc[window.google.picker.Document.URL],
          mimeType: doc[window.google.picker.Document.MIME_TYPE],
          iconUrl: doc[window.google.picker.Document.ICON_URL]
        };
        if (onPick) onPick(selectedFile);
      } else if (data.action === window.google.picker.Action.CANCEL) {
        if (onCancel) onCancel();
      }
    });

  if (appId && String(appId).trim()) {
    builder.setAppId(String(appId).trim());
  }

  if (window.location.origin) {
    builder.setOrigin(window.location.origin);
  }

  const picker = builder.build();
  picker.setVisible(true);
}

/**
 * Appends student details to a specified Google Sheet via Google Sheets REST API v4.
 * Automatically checks and writes header row if sheet is empty.
 */
export async function appendStudentToGoogleSheet(accessToken, spreadsheetId, studentData) {
  // 1. Auto-check if header row exists
  try {
    const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:E1`;
    const checkRes = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (checkRes.ok) {
      const data = await checkRes.json();
      if (!data.values || data.values.length === 0) {
        // Sheet is empty: insert header row
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:E1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [['Student Name', 'Mobile Number', 'Mail ID', 'Course', 'Submitted At']]
            })
          }
        );
      }
    }
  } catch (headerErr) {
    console.warn('Could not check/insert header row:', headerErr);
  }

  // 2. Append new student record
  const range = 'A:E';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const values = [
    [
      studentData.studentname,
      studentData.mobileno,
      studentData.mailid,
      studentData.course,
      new Date().toLocaleString()
    ]
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message ||
        `Failed to write to Google Sheet (HTTP ${response.status})`
    );
  }

  return await response.json();
}

