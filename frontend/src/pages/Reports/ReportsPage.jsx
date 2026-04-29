import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReportsPage.css';

function ReportsLayout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('ccs_user') || '{}');

  useEffect(() => {
    if (user.role !== 'ADMIN' && user.role !== 'OFFICER') {
      navigate('/admin-dashboard');
    }
  }, [user.role, navigate]);

  if (user.role !== 'ADMIN' && user.role !== 'OFFICER') {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>Generate Reports</h1>
        <p className="reports-subtitle">Admin-only read-only reports from student data</p>
      </div>
      <div className="reports-container">
        {children}
      </div>
    </div>
  );
}

import StudentMasterlistReport from './StudentMasterlistReport';
import TalentDirectoryReport from './TalentDirectoryReport';
import ViolationSummaryReport from './ViolationSummaryReport';
import AuditLogReport from './AuditLogReport';

function ReportsPage() {
  const [activeReport, setActiveReport] = useState('masterlist');

  const renderReport = () => {
    switch (activeReport) {
      case 'masterlist': return <StudentMasterlistReport />;
      case 'talent': return <TalentDirectoryReport />;
      case 'violation': return <ViolationSummaryReport />;
      case 'audit': return <AuditLogReport />;
      default: return <StudentMasterlistReport />;
    }
  };

  return (
    <ReportsLayout>
      <div className="reports-grid">
        <div className={`report-card ${activeReport === 'masterlist' ? 'active' : ''}`} onClick={() => setActiveReport('masterlist')}>
          <div className="icon">📋</div>
          <h3>Student Masterlist</h3>
          <p>Complete student directory with filters by program, year, status</p>
        </div>
        <div className={`report-card ${activeReport === 'talent' ? 'active' : ''}`} onClick={() => setActiveReport('talent')}>
          <div className="icon">⭐</div>
          <h3>Talent Directory</h3>
          <p>Student talents, skills, achievements by category and program</p>
        </div>
        <div className={`report-card ${activeReport === 'violation' ? 'active' : ''}`} onClick={() => setActiveReport('violation')}>
          <div className="icon">⚠️</div>
          <h3>Violation Summary</h3>
          <p>Behavioral records with status badges and time filters</p>
        </div>
        <div className={`report-card ${activeReport === 'audit' ? 'active' : ''}`} onClick={() => setActiveReport('audit')}>
          <div className="icon">📊</div>
          <h3>Audit Log</h3>
          <p>System activity log filtered by date, action, module</p>
        </div>
      </div>
      <div className="reports-detail">
        {renderReport()}
      </div>
    </ReportsLayout>
  );
}

export default ReportsPage;
