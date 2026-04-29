import { useEffect, useState } from 'react';
import { fetchViolations, exportToPDF, exportToExcel, paginate, pageCount, getStatusBadge } from '../../utils/reportHelpers';
import './ViolationSummaryReport.css';

const COLUMNS = [
  { field: 'student_id', header: 'Student ID' },
  { field: 'full_name', header: 'Full Name' },
  { field: 'program_year', header: 'Program & Year' },
  { field: 'violation_type', header: 'Violation Type' },
  { field: 'date', header: 'Date' },
  { field: 'status', header: 'Status' },
  { field: 'remarks', header: 'Remarks' },
];

export default function ViolationSummaryReport() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const limit = 10;
  const paginatedData = paginate(data, page, limit);
  const pageCounts = pageCount(total, limit);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchViolations({ ...filters, page, limit });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError('Unable to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters, page]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleRetry = () => loadData();

  const handleExportPDF = () => exportToPDF('Violation_Summary', filters, data, COLUMNS);
  const handleExportExcel = () => exportToExcel('Violation_Summary', filters, data, COLUMNS);

  if (loading) return <div className="report-loading">Loading violations...</div>;

  return (
    <div className="report-container">
      <div className="report-header">
        <h2>Violation Summary</h2>
        <div className="report-actions">
          <button onClick={handleExportPDF} className="btn-export pdf">📄 PDF</button>
          <button onClick={handleExportExcel} className="btn-export excel">📊 Excel</button>
        </div>
      </div>

      <div className="report-filters">
        <select value={filters.month || ''} onChange={(e) => handleFilterChange('month', e.target.value)}>
          <option value="">All Months</option>
          <option>January</option>
          <option>February</option>
          {/* ... other months */}
        </select>
        <select value={filters.semester || ''} onChange={(e) => handleFilterChange('semester', e.target.value)}>
          <option value="">All Semesters</option>
          <option>1</option>
          <option>2</option>
        </select>
        <select value={filters.violation_type || ''} onChange={(e) => handleFilterChange('violation_type', e.target.value)}>
          <option value="">All Types</option>
          <option>Tardiness</option>
          <option>Absence</option>
        </select>
        <select value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)}>
          <option value="">All Status</option>
          <option>Pending</option>
          <option>Resolved</option>
        </select>
      </div>

      <div className="report-count">
        Showing {data.length} of {total} violations
      </div>

      {error && (
        <div className="report-error">
          {error}
          <button onClick={handleRetry} className="btn-retry">Retry</button>
        </div>
      )}

      {data.length === 0 && !loading && !error && (
        <div className="report-empty">
          No violations found matching filters
        </div>
      )}

      {data.length > 0 && (
        <>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>{COLUMNS.map(col => <th key={col.field}>{col.header}</th>)}</tr>
              </thead>
              <tbody>
                {paginatedData.map((row, i) => (
                  <tr key={i}>
                    {COLUMNS.map(col => (
                      <td key={col.field}>
                        {col.field === 'status' ? (
                          <span className={getStatusBadge(row[col.field])}>{row[col.field]}</span>
                        ) : row[col.field] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p-1)}>Previous</button>
            <span>Page {page} of {pageCounts}</span>
            <button disabled={page >= pageCounts} onClick={() => setPage(p => p+1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
