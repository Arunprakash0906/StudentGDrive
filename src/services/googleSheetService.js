/**
 * Service to handle saving and fetching student details to/from Google Sheets & Google Drive.
 */

export async function submitToGoogleSheet(studentData) {
  const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

  const payload = {
    ...studentData,
    submittedAt: new Date().toLocaleString()
  };

  if (!scriptUrl || scriptUrl.trim() === '') {
    console.warn(
      '[Google Drive Service] VITE_GOOGLE_SCRIPT_URL is not configured in .env. Running in demo mode.'
    );
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      success: true,
      isDemo: true,
      message: 'Demo mode: Form submitted locally.'
    };
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    return {
      success: true,
      isDemo: false,
      data: result
    };
  } catch (error) {
    console.error('[Google Drive Service] Error submitting to Google Sheet:', error);
    throw error;
  }
}

/**
 * Parses raw 2D array from Google Sheets into structured student objects.
 */
function parseSheetValues(values) {
  if (!values || values.length === 0) return [];

  // Detect if row 0 has headers (contains 'name' or 'student')
  const firstRow = values[0].map((c) => String(c || '').toLowerCase());
  const hasHeader =
    firstRow.some((c) => c.includes('name') || c.includes('student') || c.includes('mobile'));

  const dataRows = hasHeader ? values.slice(1) : values;

  return dataRows
    .filter((row) => row && row.some((cell) => cell && String(cell).trim() !== ''))
    .map((row, index) => ({
      id: index + 1,
      studentname: row[0] || 'N/A',
      mobileno: String(row[1] || 'N/A').replace(/^'/, ''), // strip leading quote if present
      mailid: row[2] || 'N/A',
      course: row[3] || 'N/A',
      submittedAt: row[4] || ''
    }));
}

/**
 * Fetches all student records from a Google Sheet.
 * Tries OAuth token -> API Key -> Google Visualization (GViz) public feed.
 *
 * @param {string} spreadsheetId
 * @param {string|null} accessToken
 * @param {string|null} apiKey
 * @returns {Promise<Array>} List of students
 */
export async function fetchStudentsFromSheet(spreadsheetId, accessToken = null, apiKey = null) {
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is missing.');
  }

  // Strategy 1: Google Sheets REST API v4 using OAuth Token (Private sheets)
  if (accessToken) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:E`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        return parseSheetValues(data.values);
      }
    } catch (e) {
      console.warn('OAuth fetch failed, trying next strategy...', e);
    }
  }

  // Strategy 2: Google Sheets REST API v4 using Developer API Key
  if (apiKey) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:E?key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return parseSheetValues(data.values);
      }
    } catch (e) {
      console.warn('API Key fetch failed, trying GViz endpoint...', e);
    }
  }

  // Strategy 3: Google Visualization API (GViz)
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
    const res = await fetch(gvizUrl);
    if (res.ok) {
      const text = await res.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
      if (match && match[1]) {
        const json = JSON.parse(match[1]);
        const rows = json.table?.rows || [];
        return rows
          .map((r, idx) => {
            const cells = r.c || [];
            return {
              id: idx + 1,
              studentname: cells[0]?.v || '',
              mobileno: String(cells[1]?.v || ''),
              mailid: cells[2]?.v || '',
              course: cells[3]?.v || '',
              submittedAt: cells[4]?.v || ''
            };
          })
          .filter(
            (s) =>
              s.studentname &&
              !s.studentname.toLowerCase().includes('student name')
          );
      }
    }
  } catch (e) {
    console.warn('GViz fetch failed:', e);
  }

  throw new Error(
    'Unable to fetch records from the Google Sheet. Please click "Authorize Google Account" or check that your sheet is shared/accessible.'
  );
}
