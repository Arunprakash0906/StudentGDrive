import { useState, useEffect, useMemo } from 'react';
import './StudentdetailsDashboard.css';
import { fetchStudentsFromSheet } from '../services/googleSheetService';
import {
  loadGoogleScripts,
  initPickerApi,
  requestAccessToken
} from '../services/googlePickerService';

function StudentdetailsDashboard({ onNavigateToForm }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const loadData = async (token = accessToken) => {
    setLoading(true);
    setError('');

    try {
      const records = await fetchStudentsFromSheet(spreadsheetId, token, apiKey);
      setStudents(records);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching sheet records:', err);
      setError(
        err?.message ||
          'Could not load records from Google Sheet. If your sheet is private, click "Authorize Google Account" below.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAuthorizeAndRefresh = async () => {
    try {
      setLoading(true);
      setError('');
      await loadGoogleScripts();
      await initPickerApi();

      const token = await requestAccessToken(clientId, accessToken);
      setAccessToken(token);
      await loadData(token);
    } catch (authErr) {
      console.error('Auth error:', authErr);
      setError(authErr?.message || 'Authorization failed. Please try again.');
      setLoading(false);
    }
  };

  // Unique list of courses for the dropdown filter
  const courseOptions = useMemo(() => {
    const courses = new Set();
    students.forEach((s) => {
      if (s.course && s.course !== 'N/A') courses.add(s.course);
    });
    return ['All', ...Array.from(courses)];
  }, [students]);

  // Filtered students based on search and selected course
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesCourse =
        selectedCourse === 'All' || student.course === selectedCourse;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        student.studentname.toLowerCase().includes(q) ||
        student.mobileno.toLowerCase().includes(q) ||
        student.mailid.toLowerCase().includes(q);

      return matchesCourse && matchesSearch;
    });
  }, [students, searchQuery, selectedCourse]);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h2>Student Details Dashboard</h2>
          <p>
            Real-time records from your connected{' '}
            <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
              Google Sheet ↗
            </a>
          </p>
        </div>

        <div className="dashboard-header-actions">
          {onNavigateToForm && (
            <button
              type="button"
              className="btn-dashboard-action btn-primary-action"
              onClick={onNavigateToForm}
            >
              ➕ Register New Student
            </button>
          )}

          <button
            type="button"
            className="btn-dashboard-action btn-secondary-action"
            onClick={() => loadData()}
            disabled={loading}
          >
            🔄 Refresh
          </button>

          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-dashboard-action btn-secondary-action"
          >
            📊 Open in Google Sheets ↗
          </a>
        </div>
      </div>

      {/* Error Banner with Authorize Button */}
      {error && (
        <div className="error-banner-dashboard">
          <div>
            ⚠️ <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn-dashboard-action btn-primary-action"
            style={{ padding: '6px 12px', fontSize: '13px' }}
            onClick={handleAuthorizeAndRefresh}
          >
            🔑 Authorize Google Account
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-info">
            <h4>Total Students</h4>
            <div className="stat-value">{students.length}</div>
            <div className="stat-sub">Registered across all courses</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <h4>Active Courses</h4>
            <div className="stat-value">
              {courseOptions.length > 1 ? courseOptions.length - 1 : 0}
            </div>
            <div className="stat-sub">Specializations offered</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🕒</div>
          <div className="stat-info">
            <h4>Last Synced</h4>
            <div className="stat-value" style={{ fontSize: '20px' }}>
              {lastUpdated || 'Never'}
            </div>
            <div className="stat-sub">Direct Google Sheets sync</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="dashboard-filters">
        <div className="search-input-box">
          <span className="search-icon-inside">🔍</span>
          <input
            type="text"
            placeholder="Search by student name, mobile, or mail ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          {courseOptions.map((c) => (
            <option key={c} value={c}>
              Course: {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Fetching student details from Google Sheet...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No student records found</h3>
          <p>
            {students.length === 0
              ? 'No students have been registered yet, or the sheet is empty.'
              : 'No students match your current search or course filter.'}
          </p>
          {onNavigateToForm && students.length === 0 && (
            <button
              type="button"
              className="btn-dashboard-action btn-primary-action"
              style={{ marginTop: '14px' }}
              onClick={onNavigateToForm}
            >
              Register First Student
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="student-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Student Name</th>
                <th>Mobile No</th>
                <th>Mail ID</th>
                <th>Course</th>
                <th>Registered At</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => (
                <tr key={student.id || idx}>
                  <td><strong>{idx + 1}</strong></td>
                  <td>
                    <strong>{student.studentname}</strong>
                  </td>
                  <td>{student.mobileno}</td>
                  <td>
                    <a
                      href={`mailto:${student.mailid}`}
                      className="student-email"
                    >
                      {student.mailid}
                    </a>
                  </td>
                  <td>
                    <span className="course-badge">{student.course}</span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text)' }}>
                    {student.submittedAt || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default StudentdetailsDashboard;

