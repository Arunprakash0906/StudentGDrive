import { useState } from 'react';
import Studentform from './Comp/Studentform';
import StudentdetailsDashboard from './Comp/StudentdetailsDashboard';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'form'

  const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return (
    <div className="app-wrapper">
      {/* Top Navbar */}
      <header className="app-navbar">
        <div className="navbar-brand">
          <span>🎓 Student Portal</span>
          <span className="brand-badge">Google Drive & Sheets</span>
        </div>

        <nav className="nav-tabs">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            📝 Register Student
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Student Dashboard
          </button>
        </nav>
      </header>

      {/* Main Content View */}
      <main className="app-content">
        {activeTab === 'form' ? (
          <Studentform onNavigateToDashboard={() => setActiveTab('dashboard')} />
        ) : (
          <StudentdetailsDashboard onNavigateToForm={() => setActiveTab('form')} />
        )}
      </main>
    </div>
  );
}

export default App;
