import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import './History.css';

function History() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minConfidence, setMinConfidence] = useState('0');
  const [showDetails, setShowDetails] = useState(null);

  const { token } = useAuth();
  const { t } = useLanguage();
  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
    if (token) {
      fetchReports();
      fetchStats();
    }
  }, [token]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/reports/history`, {
        params: { token },
      });
      setReports(response.data);
    } catch (err) {
      console.warn('API history endpoint failed, loading local history fallback', err);
      const localHistory = JSON.parse(localStorage.getItem('skinnet_report_history') || '[]');
      setReports(Array.isArray(localHistory) ? localHistory : []);
      setError('Failed to load reports from server; showing local history instead.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/reports/stats/summary`, {
        params: { token },
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleDelete = async (reportId) => {
    if (window.confirm(t('messages.are_you_sure_delete'))) {
      try {
        await axios.delete(`${API_URL}/reports/${reportId}`, {
          params: { token },
        });
        setReports(reports.filter((r) => r.id !== reportId));
      } catch (err) {
        console.warn('API delete failed; removing local-only entry', err);
        setReports(reports.filter((r) => r.id !== reportId));
      }
    }
  };

  const handleClearAll = () => {
    if (window.confirm(t('messages.are_you_sure_clear_history') || 'Clear all history records?')) {
      setReports([]);
      localStorage.removeItem('skinnet_report_history');
      try {
        axios.delete(`${API_URL}/reports`, { params: { token } });
      } catch (err) {
        // ignore backend failure for now
      }
    }
  };

  const exportCsv = () => {
    if (reports.length === 0) {
      return;
    }

    const header = ['Date', 'Disease', 'Confidence', 'Severity', 'Location'];
    const rows = reports.map((report) => [
      formatDate(report.created_at || report.createdAt),
      report.disease_detected || report.disease || 'N/A',
      report.confidence_score ? `${(report.confidence_score * 100).toFixed(1)}%` : report.confidence || 'N/A',
      report.severity || (report.severity_level ? report.severity_level : 'N/A'),
      report.location || 'N/A',
    ]);

    const csvContent = [header, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `skin_report_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const filteredReports = reports.filter((report) => {
    const disease = (report.disease_detected || report.disease || '').toLowerCase();
    const searchMatch = disease.includes(searchTerm.toLowerCase());
    const confidence = report.confidence_score
      ? report.confidence_score * 100
      : parseFloat(report.confidence) || 0;

    const afterFrom = fromDate ? new Date(report.created_at || report.createdAt) >= new Date(fromDate) : true;
    const beforeTo = toDate ? new Date(report.created_at || report.createdAt) <= new Date(toDate) : true;
    const confidenceMatch = confidence >= Number(minConfidence);

    return searchMatch && afterFrom && beforeTo && confidenceMatch;
  });

  if (loading) {
    return (
      <div className="history-container">
        <div className="loading">{t('messages.loading')}</div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <h1>{t('history.my_reports')}</h1>

      {/* Statistics Section */}
      {stats && (
        <div className="stats-section">
          <div className="stat-card">
            <h3>{t('history.total_reports')}</h3>
            <p className="stat-value">{stats.total_reports}</p>
          </div>
          {stats.most_common_disease && (
            <div className="stat-card">
              <h3>{t('history.most_common_disease')}</h3>
              <p className="stat-value">{stats.most_common_disease}</p>
            </div>
          )}
          {stats.recent_diagnosis && (
            <div className="stat-card">
              <h3>{t('history.recent_diagnosis')}</h3>
              <p className="stat-value">{formatDate(stats.recent_diagnosis)}</p>
            </div>
          )}
        </div>
      )}

      <div className="filters-section">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('history.searchPlaceholder') || 'Search disease'}
          className="filter-input"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="filter-input"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="filter-input"
        />
        <input
          type="number"
          min="0"
          max="100"
          value={minConfidence}
          onChange={(e) => setMinConfidence(e.target.value)}
          className="filter-input"
          placeholder={t('history.minConfidence') || 'Min confidence'}
        />
        <button className="btn-action" onClick={exportCsv}>
          {t('history.exportCSV') || 'Export CSV'}
        </button>
        <button className="btn-action" onClick={handleClearAll}>
          {t('history.clearAll') || 'Clear All'}
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => setViewMode('table')}
        >
          📊 Table
        </button>
        <button
          className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
          onClick={() => setViewMode('cards')}
        >
          📇 Cards
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {filteredReports.length === 0 ? (
        <div className="no-reports">{t('history.no_reports')}</div>
      ) : viewMode === 'table' ? (
        <TableView reports={filteredReports} onDelete={handleDelete} onView={setShowDetails} formatDate={formatDate} t={t} />
      ) : (
        <CardsView reports={filteredReports} onDelete={handleDelete} onView={setShowDetails} formatDate={formatDate} t={t} />
      )}

      {showDetails && (
        <div className="details-modal">
          <div className="details-card">
            <button className="close-modal" onClick={() => setShowDetails(null)}>
              ×
            </button>
            <h2>{showDetails.disease_detected || showDetails.disease || 'Report Details'}</h2>
            <p><strong>{t('history.report_date')}:</strong> {formatDate(showDetails.created_at || showDetails.createdAt)}</p>
            <p><strong>{t('history.confidence')}:</strong> {(showDetails.confidence_score ? showDetails.confidence_score * 100 : showDetails.confidence || 0).toFixed ? (showDetails.confidence_score ? `${(showDetails.confidence_score * 100).toFixed(1)}%` : `${Number(showDetails.confidence || 0).toFixed(1)}%`) : showDetails.confidence || 'N/A'}</p>
            <p><strong>Severity:</strong> {showDetails.severity || 'N/A'}</p>
            <p><strong>Location:</strong> {showDetails.location || 'N/A'}</p>
            {showDetails.predictions && showDetails.predictions.length > 0 && (
              <div>
                <strong>Predictions:</strong>
                <ul>
                  {showDetails.predictions.map((p, idx) => (
                    <li key={idx}>{p[0]} - {(p[1] * 100).toFixed(1)}%</li>
                  ))}
                </ul>
              </div>
            )}
            {showDetails.symptomsCare && <p><strong>Treatment:</strong> {showDetails.symptomsCare}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Table View Component
function TableView({ reports, onDelete, onView, formatDate, t }) {
  return (
    <div className="table-wrapper">
      <table className="reports-table">
        <thead>
          <tr>
            <th>{t('history.report_date')}</th>
            <th>{t('history.disease')}</th>
            <th>{t('history.confidence')}</th>
            <th>Severity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>{formatDate(report.created_at)}</td>
              <td className="disease-name">{report.disease_detected}</td>
              <td>
                <span className="confidence">
                  {(report.confidence_score * 100).toFixed(1)}%
                </span>
              </td>
              <td>
                <span className={`severity-badge ${report.severity?.toLowerCase()}`}>
                  {report.severity || 'N/A'}
                </span>
              </td>
              <td>
                <button
                  className="btn-view"
                  onClick={() => onView(report)}
                  title={t('history.view') || 'View'}
                >
                  🔍
                </button>
                <button
                  className="btn-delete"
                  onClick={() => onDelete(report.id)}
                  title={t('history.delete')}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Cards View Component
function CardsView({ reports, onDelete, onView, formatDate, t }) {
  return (
    <div className="cards-grid">
      {reports.map((report) => (
        <div key={report.id} className="report-card">
          <div className="card-header">
            <h3>{report.disease_detected}</h3>
            <button
              className="btn-delete-card"
              onClick={() => onDelete(report.id)}
            >
              ×
            </button>
          </div>
          <div className="card-body">
            <p>
              <strong>{t('history.report_date')}:</strong> {formatDate(report.created_at)}
            </p>
            <p>
              <strong>{t('history.confidence')}:</strong>{' '}
              <span className="confidence">{(report.confidence_score * 100).toFixed(1)}%</span>
            </p>
            <p>
              <strong>Severity:</strong>{' '}
              <span className={`severity-badge ${report.severity?.toLowerCase()}`}>
                {report.severity || 'N/A'}
              </span>
            </p>
            {report.location && (
              <p>
                <strong>📍 Location:</strong> {report.location}
              </p>
            )}
            <div className="card-actions">
              <button
                className="btn-view-card"
                onClick={() => onView(report)}
              >
                🔍 {t('history.viewDetails') || 'View Details'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default History;
