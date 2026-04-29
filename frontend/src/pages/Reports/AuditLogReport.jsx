import { useEffect, useState } from 'react';
import { fetchAuditLogs, exportToPDF, exportToExcel, paginate, pageCount, getStatusBadge } from '../../utils/reportHelpers';
import './AuditLogReport.css';

const COLUMNS = [
  { field: 'datetime', header: 'Date & Time' },
  { field: 'action', header: 'Action' },
  { field: 'module', header: 'Module' },
  { field: 'record_affected', header: 'Record Affected' },
  { field: 'performed_by', header: 'Performed By' },
];

export default function AuditLogReport() {
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
      const res = await fetchAuditLogs({ ...filters, page, limit });
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

  const handleExportPDF = () => exportToPDF('Audit_Log', filters, data, COLUMNS);
  const handleExportExcel = () => exportToExcel('Audit_Log', filters, data, COLUMNS);

  if (loading) return <div className="report-loading">Loading audit logs...</div>;

  return (
    <div className="report-container">
      <div className="report-header">
        <h2>Audit Log</h2>
        <div className="report-actions">
          <button onClick={handleExportPDF} className="btn-export pdf">📄 PDF</button>
          <button onClick={handleExportExcel} className="btn-export excel">📊 Excel</button>
        </div>
      </div>

      <div className="report-filters">
        <input 
          type="date" 
          value={filters.start_date || ''} 
          onChange={(e) => handleFilterChange('start_date', e.target.value)}
          placeholder="Start Date"
        />
        <input 
          type="date" 
          value={filters.end_date || ''} 
          onChange={(e) => handleFilterChange('end_date', e.target.value)}
          placeholder="End Date"
        />
        <select value={filters.action || ''} onChange={(e) => handleFilterChange('action', e.target.value)}>
          <option value="">All Actions</option>
          <option>Add</option>
          <option>Edit</option>
          <option>Delete</option>
        </select>
        <select value={filters.module || ''} onChange={(e) => handleFilterChange('module', e.target.value)}>
          <option value="">All Modules</option>
          <option>Student</option>
          <option>Enrollment</option>
        </select>
      </div>

      <div className="report-count">
        Showing {data.length} of {total} audit entries
      </div>

      {error && (
        <div className="report-error">
          {error}
          <button onClick={handleRetry} className="btn-retry">Retry</button>
        </div>
      )}

      {data.length === 0 && !loading && !error && (
        <div className="report-empty">
          No audit logs found matching filters
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
                        {col.field === 'action' ? (
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
