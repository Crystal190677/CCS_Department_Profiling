import { useEffect, useState } from 'react';
import { fetchMasterlist, exportToPDF, exportToExcel, paginate, pageCount, getStatusBadge } from '../../utils/reportHelpers';
import './StudentMasterlistReport.css';

const COLUMNS = [
  { field: 'student_id', header: 'Student ID' },
  { field: 'full_name', header: 'Full Name' },
  { field: 'program', header: 'Program' },
  { field: 'year_level', header: 'Year Level' },
  { field: 'section', header: 'Section' },
  { field: 'email', header: 'Email' },
  { field: 'status', header: 'Status' },
];

export default function StudentMasterlistReport() {
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
      const res = await fetchMasterlist({ ...filters, page, limit });
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

  const handleExportPDF = () => exportToPDF('Student_Masterlist', filters, data, COLUMNS);
  const handleExportExcel = () => exportToExcel('Student_Masterlist', filters, data, COLUMNS);

  if (loading) return <div className="report-loading">Loading masterlist...</div>;

  return (
    <div className="report-container">
      <div className="report-header">
        <h2>Student Masterlist</h2>
        <div className="report-actions">
          <button onClick={handleExportPDF} className="btn-export pdf">📄 PDF</button>
          <button onClick={handleExportExcel} className="btn-export excel">📊 Excel</button>
        </div>
      </div>

      <div className="report-filters">
        <select value={filters.program || ''} onChange={(e) => handleFilterChange('program', e.target.value)}>
          <option value="">All Programs</option>
          <option>BSIT</option>
          <option>BSCS</option>
        </select>
        <select value={filters.year_level || ''} onChange={(e) => handleFilterChange('year_level', e.target.value)}>
          <option value="">All Years</option>
          <option>1</option>
          <option>2</option>
          <option>3</option>
          <option>4</option>
        </select>
        <select value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)}>
          <option value="">All Status</option>
          <option>Regular</option>
          <option>Irregular</option>
          <option>LOA</option>
        </select>
        <select value={filters.school_year || ''} onChange={(e) => handleFilterChange('school_year', e.target.value)}>
          <option value="">All School Years</option>
          <option>2024-2025</option>
          <option>2025-2026</option>
        </select>
        <select value={filters.semester || ''} onChange={(e) => handleFilterChange('semester', e.target.value)}>
          <option value="">All Semesters</option>
          <option>1</option>
          <option>2</option>
        </select>
      </div>

      <div className="report-count">
        Showing {data.length} of {total} students
      </div>

      {error && (
        <div className="report-error">
          {error}
          <button onClick={handleRetry} className="btn-retry">Retry</button>
        </div>
      )}

      {data.length === 0 && !loading && !error && (
        <div className="report-empty">
          No records found matching filters
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
                    {COLUMNS.map(col => <td key={col.field}>{row[col.field] || ''}</td>)}
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
