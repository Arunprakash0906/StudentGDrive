import { useState, useEffect } from 'react';
import './Studentform.css';
import {
  loadGoogleScripts,
  initPickerApi,
  requestAccessToken,
  openGooglePicker,
  appendStudentToGoogleSheet
} from '../services/googlePickerService';
import { submitToGoogleSheet } from '../services/googleSheetService';

function Studentform({ onNavigateToDashboard }) {
  const initialFormState = {
    studentname: '',
    mobileno: '',
    mailid: '',
    course: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [submittedData, setSubmittedData] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [error, setError] = useState('');

  // Read credentials from .env
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const appId = import.meta.env.VITE_GOOGLE_APP_ID;
  const defaultSheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;

  // Google Picker & Auth state
  const [accessToken, setAccessToken] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(
    defaultSheetId
      ? {
          id: defaultSheetId,
          name: 'Student Records',
          url: `https://docs.google.com/spreadsheets/d/${defaultSheetId}/edit`
        }
      : null
  );
  const [attachedFile, setAttachedFile] = useState(null);

  // Pre-load Google scripts on mount
  useEffect(() => {
    loadGoogleScripts()
      .then(() => initPickerApi())
      .then(() => {
        console.log('[Google Drive] Google Picker and GIS ready.');
      })
      .catch((err) => {
        console.warn('[Google Drive] Scripts loading deferred:', err);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
    if (error) setError('');
  };

  /**
   * Triggers the Google Drive Picker dialog
   * @param {'spreadsheets'|'all'} viewMode
   */
  const handleOpenPicker = async (viewMode = 'spreadsheets') => {
    setError('');

    if (!clientId || !apiKey) {
      setError(
        'Missing VITE_GOOGLE_CLIENT_ID or VITE_GOOGLE_API_KEY in your .env file.'
      );
      return;
    }

    setIsPickerLoading(true);

    try {
      await loadGoogleScripts();
      await initPickerApi();

      const token = await requestAccessToken(clientId, accessToken);
      setAccessToken(token);

      openGooglePicker({
        apiKey,
        appId,
        accessToken: token,
        viewMode,
        onPick: (file) => {
          if (viewMode === 'spreadsheets') {
            setSelectedSheet(file);
          } else {
            setAttachedFile(file);
          }
        },
        onCancel: () => {
          console.log('Picker cancelled by user.');
        }
      });
    } catch (err) {
      console.error('Picker error:', err);
      setError(
        err?.message ||
          'Failed to open Google Drive Picker. Please ensure Google Picker API is enabled in Google Cloud Console.'
      );
    } finally {
      setIsPickerLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Student Name validation
    if (!formData.studentname.trim()) {
      setError('Please enter the student name.');
      return;
    }

    // 2. Mobile Number validation
    if (!formData.mobileno.trim()) {
      setError('Please enter the mobile number.');
      return;
    }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.mobileno.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // 3. Mail ID validation
    if (!formData.mailid.trim()) {
      setError('Please enter the email address (Mail ID).');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.mailid.trim())) {
      setError('Please enter a valid email address (e.g. student@gmail.com).');
      return;
    }

    // 4. Course validation
    if (!formData.course.trim()) {
      setError('Please select a course.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const targetSheetId = selectedSheet?.id || defaultSheetId;

      // Method A: Direct Google Sheets API via OAuth token
      if (targetSheetId && clientId) {
        let currentToken = accessToken;

        if (!currentToken) {
          await loadGoogleScripts();
          currentToken = await requestAccessToken(clientId);
          setAccessToken(currentToken);
        }

        try {
          await appendStudentToGoogleSheet(currentToken, targetSheetId, {
            ...formData,
            attachedFileUrl: attachedFile?.url || ''
          });
        } catch (appendErr) {
          // If token expired, refresh and retry once
          if (
            appendErr?.message &&
            (appendErr.message.includes('401') ||
              appendErr.message.toLowerCase().includes('unauthenticated'))
          ) {
            currentToken = await requestAccessToken(clientId);
            setAccessToken(currentToken);
            await appendStudentToGoogleSheet(currentToken, targetSheetId, {
              ...formData,
              attachedFileUrl: attachedFile?.url || ''
            });
          } else {
            throw appendErr;
          }
        }

        setSubmittedData({
          ...formData,
          sheetName: selectedSheet?.name || 'Google Sheet',
          sheetUrl:
            selectedSheet?.url ||
            `https://docs.google.com/spreadsheets/d/${targetSheetId}/edit`,
          attachedFile: attachedFile ? attachedFile.name : null
        });
        setIsDemo(false);
      } else {
        // Method B: Google Apps Script Web App or Demo
        const response = await submitToGoogleSheet(formData);
        setSubmittedData({
          ...formData,
          attachedFile: attachedFile ? attachedFile.name : null
        });
        setIsDemo(!!response?.isDemo);
      }

      // Reset form
      setFormData(initialFormState);
      setAttachedFile(null);
    } catch (err) {
      console.error('Submission failed:', err);
      setError(
        err?.message ||
          'Failed to save student details. Please verify Google Sheets API is enabled.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setError('');
    setSubmittedData(null);
    setAttachedFile(null);
  };

  return (
    <div className="student-form-container">
      <div className="student-form-header">
        <h2>Student Registration Form</h2>
        <p>Register student details and store them in Google Drive</p>
        <div className="gdrive-badge">
          <span>📁</span>
          <span>Google Drive & Picker API</span>
        </div>
      </div>

      {/* Target Google Sheet & Picker Panel */}
      <div className="gdrive-picker-panel">
        <div className="picker-panel-header">
          <h3>
            <span>📊</span> Target Google Sheet
          </h3>
          <div className="picker-button-group">
            <button
              type="button"
              className="btn-picker"
              onClick={() => handleOpenPicker('spreadsheets')}
              disabled={isPickerLoading || isSubmitting}
            >
              {isPickerLoading ? (
                <>
                  <span
                    className="spinner"
                    style={{
                      borderColor: 'var(--accent)',
                      borderTopColor: 'transparent'
                    }}
                  ></span>
                  <span>Opening Picker...</span>
                </>
              ) : (
                '📂 Browse Drive Sheets'
              )}
            </button>
            <button
              type="button"
              className="btn-picker"
              onClick={() => handleOpenPicker('all')}
              disabled={isPickerLoading || isSubmitting}
            >
              📎 Attach File from Drive
            </button>
          </div>
        </div>

        {/* Selected Sheet Display */}
        {selectedSheet && (
          <div className="selected-sheet-badge">
            <div className="selected-sheet-info">
              <span>📗 Target Sheet:</span>
              <a
                href={selectedSheet.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selectedSheet.name} (Open Sheet ↗)
              </a>
            </div>
            {selectedSheet.id !== defaultSheetId && (
              <button
                type="button"
                className="btn-remove-selected"
                onClick={() =>
                  setSelectedSheet(
                    defaultSheetId
                      ? {
                          id: defaultSheetId,
                          name: 'Student Records',
                          url: `https://docs.google.com/spreadsheets/d/${defaultSheetId}/edit`
                        }
                      : null
                  )
                }
                title="Reset to default sheet"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Attached Document Display */}
        {attachedFile && (
          <div className="attachment-badge">
            <div>
              <span>📎 Attached from Drive: </span>
              <a href={attachedFile.url} target="_blank" rel="noopener noreferrer">
                {attachedFile.name}
              </a>
            </div>
            <button
              type="button"
              className="btn-remove-selected"
              onClick={() => setAttachedFile(null)}
              title="Remove attachment"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <form className="student-form" onSubmit={handleSubmit}>
        {/* Student Name */}
        <div className="form-group">
          <label htmlFor="studentname">
            Student Name <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="studentname"
            name="studentname"
            value={formData.studentname}
            onChange={handleChange}
            placeholder="Enter student full name"
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Mobile Number */}
        <div className="form-group">
          <label htmlFor="mobileno">
            Mobile No <span className="required-star">*</span>
          </label>
          <input
            type="tel"
            id="mobileno"
            name="mobileno"
            value={formData.mobileno}
            onChange={handleChange}
            placeholder="Enter 10-digit mobile number"
            maxLength={10}
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Mail ID */}
        <div className="form-group">
          <label htmlFor="mailid">
            Mail ID <span className="required-star">*</span>
          </label>
          <input
            type="email"
            id="mailid"
            name="mailid"
            value={formData.mailid}
            onChange={handleChange}
            placeholder="Enter student email (e.g. student@gmail.com)"
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Course */}
        <div className="form-group">
          <label htmlFor="course">
            Course <span className="required-star">*</span>
          </label>
          <select
            id="course"
            name="course"
            value={formData.course}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          >
            <option value="">-- Select a Course --</option>
            <option value="Computer Science Engineering">Computer Science Engineering</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Data Science & AI">Data Science & AI</option>
            <option value="Electronics & Communication">Electronics & Communication</option>
            <option value="Mechanical Engineering">Mechanical Engineering</option>
            <option value="Civil Engineering">Civil Engineering</option>
            <option value="BCA">BCA (Bachelor of Computer Applications)</option>
            <option value="MCA">MCA (Master of Computer Applications)</option>
            <option value="BBA">BBA (Bachelor of Business Administration)</option>
            <option value="MBA">MBA (Master of Business Administration)</option>
          </select>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                <span>Saving to Google Sheet...</span>
              </>
            ) : (
              'Save to Google Sheet'
            )}
          </button>
          <button
            type="button"
            className="btn-reset"
            onClick={handleReset}
            disabled={isSubmitting}
          >
            Reset
          </button>
        </div>
      </form>

      {/* Submitted Details Feedback */}
      {submittedData && (
        <div className="alert-success">
          <h4>✓ Student Registered Successfully!</h4>
          <p>The student details have been saved directly to your Google Sheet:</p>
          <ul>
            <li><strong>Student Name:</strong> {submittedData.studentname}</li>
            <li><strong>Mobile No:</strong> {submittedData.mobileno}</li>
            <li><strong>Mail ID:</strong> {submittedData.mailid}</li>
            <li><strong>Course:</strong> {submittedData.course}</li>
            {submittedData.sheetUrl && (
              <li>
                <strong>Target Sheet:</strong>{' '}
                <a
                  href={submittedData.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Google Sheet ↗
                </a>
              </li>
            )}
            {submittedData.attachedFile && (
              <li><strong>Attached File:</strong> {submittedData.attachedFile}</li>
            )}
          </ul>
          {onNavigateToDashboard && (
            <button
              type="button"
              className="btn-submit"
              style={{ marginTop: '14px', width: 'auto', padding: '8px 18px', fontSize: '14px' }}
              onClick={onNavigateToDashboard}
            >
              📊 View in Dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Studentform;
