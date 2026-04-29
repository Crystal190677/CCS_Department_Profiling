import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Base API config
const API_BASE = '/api';
const getHeaders = () => {
  const token = localStorage.getItem('ccs_token');
  return {
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Date utils
export const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH');
export const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString('en-PH');
export const today = () => new Date().toISOString().split('T')[0];

// Fetch helpers for reports (assume backend endpoints /api/reports/{type}?filters...)
export const fetchMasterlist = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const res = await axios.get(`${API_BASE}/reports/masterlist?${params}`, { headers: getHeaders() });
  return res.data;
};

export const fetchTalentDirectory = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const res = await axios.get(`${API_BASE}/reports/talent-directory?${params}`, { headers: getHeaders() });
  return res.data;
};

export const fetchViolations = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const res = await axios.get(`${API_BASE}/reports/violations?${params}`, { headers: getHeaders() });
  return res.data;
};

export const fetchAuditLogs = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const res = await axios.get(`${API_BASE}/reports/audit-logs?${params}`, { headers: getHeaders() });
  return res.data;
};

// PDF Export
export const exportToPDF = (reportName, filters, data, columns) => {
  const doc = new jsPDF();
  const header = `CCS Student Profiling System`;
  const subHeader = `${reportName} - Filters: ${JSON.stringify(filters)} - Generated: ${new Date().toLocaleDateString()}`;
  const filename = `${reportName}_${today()}.pdf`;

  doc.text(header, 14, 20);
  doc.text(subHeader, 14, 30);

  doc.autoTable({
    startY: 40,
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => row[c.field] || '')),
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [216, 90, 48] }, // #D85A30
    margin: { left: 10, right: 10 },
  });

  doc.save(filename);
};

// Excel Export
export const exportToExcel = (reportName, filters, data, columns) => {
  const wsData = [
    ['CCS Student Profiling System'],
    [`${reportName} - Filters: ${JSON.stringify(filters)}`],
    [], // empty row
    columns.map(c => c.header),
    ...data.map(row => columns.map(c => row[c.field] || '')),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${reportName}_${today()}.xlsx`);
};

// Badge classes for status
export const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'bg-amber-500 text-white px-2 py-1 rounded text-xs';
    case 'resolved': return 'bg-green-500 text-white px-2 py-1 rounded text-xs';
    case 'add': return 'bg-green-500 text-white px-2 py-1 rounded text-xs';
    case 'edit': return 'bg-amber-500 text-white px-2 py-1 rounded text-xs';
    case 'delete': return 'bg-red-500 text-white px-2 py-1 rounded text-xs';
    default: return 'bg-gray-500 text-white px-2 py-1 rounded text-xs';
  }
};

// Pagination helper
export const paginate = (items, page, limit = 10) => {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
};

export const pageCount = (total, limit = 10) => Math.ceil(total / limit);
