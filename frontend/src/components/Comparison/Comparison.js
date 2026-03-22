import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import './Comparison.css';

function Comparison() {
  const [reports, setReports] = useState([]);
  const [selectedCurrent, setSelectedCurrent] = useState(null);
  const [selectedPrevious, setSelectedPrevious] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('comparison'); // 'comparison' or 'trend'

  const { token } = useAuth();
  const { t } = useLanguage();
  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
    if (token) {
      fetchReports();
      fetchTrendData();
    }
  }, [token]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/reports/history`, {
        params: { token, limit: 50 },
      });
      setReports(response.data);
      if (response.data.length >= 2) {
        setSelectedCurrent(response.data[0].id);
        setSelectedPrevious(response.data[1].id);
      }
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const response = await axios.get(`${API_URL}/compare/trend`, {
        params: { token, limit: 10 },
      });
      setTrendData(response.data);
    } catch (err) {
      console.error('Failed to load trend data:', err);
    }
  };

  const handleCompare = async () => {
    if (!selectedCurrent || !selectedPrevious) {
      setError('Please select two reports to compare');
      return;
    }

    if (selectedCurrent === selectedPrevious) {
      setError('Please select two different reports');
      return;
    }

    try {
      setComparing(true);
      setError('');
      const response = await axios.post(`${API_URL}/compare/reports`, null, {
        params: {
          token,
          current_report_id: selectedCurrent,
          previous_report_id: selectedPrevious,
        },
      });
      setComparisonResult(response.data);
    } catch (err) {
      setError('Failed to compare reports');
      console.error(err);
    } finally {
      setComparing(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="comparison-container">
        <div className="loading">{t('messages.loading')}</div>
      </div>
    );
  }

  if (reports.length < 2) {
    return (
      <div className="comparison-container">
        <h1>{t('comparison.compare')}</h1>
        <div className="no-data">
          {t('comparison.no_previous_report')}
        </div>
      </div>
    );
  }

  return (
    <div className="comparison-container">
      <h1>{t('comparison.compare')}</h1>

      {/* View Mode Toggle */}
      <div className="view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'comparison' ? 'active' : ''}`}
          onClick={() => setViewMode('comparison')}
        >
          ⚖️ {t('comparison.compare')}
        </button>
        <button
          className={`toggle-btn ${viewMode === 'trend' ? 'active' : ''}`}
          onClick={() => setViewMode('trend')}
        >
          📈 Trend
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {viewMode === 'comparison' && (
        <div className="comparison-section">
          {/* Selection Section */}
          <div className="selection-section">
            <div className="select-group">
              <label>{t('comparison.current_diagnosis')}</label>
              <select
                value={selectedCurrent || ''}
                onChange={(e) => setSelectedCurrent(parseInt(e.target.value))}
              >
                <option value="">Select Current Report</option>
                {reports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.disease_detected} - {formatDate(report.created_at)} (
                    {(report.confidence_score * 100).toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="select-group">
              <label>{t('comparison.previous_diagnosis')}</label>
              <select
                value={selectedPrevious || ''}
                onChange={(e) => setSelectedPrevious(parseInt(e.target.value))}
              >
                <option value="">Select Previous Report</option>
                {reports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.disease_detected} - {formatDate(report.created_at)} (
                    {(report.confidence_score * 100).toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>

            <button
              className="compare-button"
              onClick={handleCompare}
              disabled={comparing || !selectedCurrent || !selectedPrevious}
            >
              {comparing ? t('messages.loading') : '⚖️ ' + t('comparison.compare')}
            </button>
          </div>

          {/* Comparison Results */}
          {comparisonResult && (
            <div className="results-section">
              <h2>{t('comparison.comparison_results')}</h2>

              <div className="comparison-cards">
                {/* Current Report Card */}
                <div className="report-card current">
                  <h3>{t('comparison.current_diagnosis')}</h3>
                  <div className="card-content">
                    <p className="disease">{comparisonResult.current_report.disease}</p>
                    <p>
                      <strong>Confidence:</strong>{' '}
                      <span className="confidence">
                        {(comparisonResult.current_report.confidence * 100).toFixed(1)}%
                      </span>
                    </p>
                    <p>
                      <strong>Severity:</strong>{' '}
                      <span className={`severity ${comparisonResult.current_report.severity?.toLowerCase()}`}>
                        {comparisonResult.current_report.severity}
                      </span>
                    </p>
                    <p className="date">{comparisonResult.current_report.created_at}</p>
                  </div>
                </div>

                {/* VS */}
                <div className="vs-indicator">VS</div>

                {/* Previous Report Card */}
                <div className="report-card previous">
                  <h3>{t('comparison.previous_diagnosis')}</h3>
                  <div className="card-content">
                    <p className="disease">{comparisonResult.previous_report.disease}</p>
                    <p>
                      <strong>Confidence:</strong>{' '}
                      <span className="confidence">
                        {(comparisonResult.previous_report.confidence * 100).toFixed(1)}%
                      </span>
                    </p>
                    <p>
                      <strong>Severity:</strong>{' '}
                      <span className={`severity ${comparisonResult.previous_report.severity?.toLowerCase()}`}>
                        {comparisonResult.previous_report.severity}
                      </span>
                    </p>
                    <p className="date">{comparisonResult.previous_report.created_at}</p>
                  </div>
                </div>
              </div>

              {/* Analysis Section */}
              <div className="analysis-section">
                <h3>📊 {t('comparison.comparison_results')}</h3>

                <div className="analysis-grid">
                  <div className={`analysis-item ${comparisonResult.same_disease ? 'same' : 'different'}`}>
                    <p className="label">Disease Status</p>
                    <p className="value">
                      {comparisonResult.same_disease
                        ? t('comparison.same_disease')
                        : t('comparison.disease_changed')}
                    </p>
                  </div>

                  <div className={`analysis-item ${comparisonResult.improvement ? 'improvement' : 'decline'}`}>
                    <p className="label">Confidence Change</p>
                    <p className="value">
                      {comparisonResult.improvement ? '📈 ' : '📉 '}
                      {comparisonResult.confidence_difference.toFixed(2)}%
                    </p>
                  </div>

                  <div className="analysis-item">
                    <p className="label">Time Difference</p>
                    <p className="value">{comparisonResult.days_difference} days</p>
                  </div>

                  <div className="analysis-item">
                    <p className="label">Severity Analysis</p>
                    <p className="value">{comparisonResult.severity_comparison}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'trend' && trendData && (
        <div className="trend-section">
          <h2>📈 Diagnosis Trend</h2>

          {/* Stats */}
          <div className="trend-stats">
            <div className="stat">
              <p className="label">Total Reports</p>
              <p className="value">{trendData.stats.total_reports}</p>
            </div>
            <div className="stat">
              <p className="label">First Diagnosis</p>
              <p className="value">{trendData.stats.first_diagnosis}</p>
            </div>
            <div className="stat">
              <p className="label">Latest Diagnosis</p>
              <p className="value">{trendData.stats.latest_diagnosis}</p>
            </div>
            <div className="stat">
              <p className="label">Trend</p>
              <p className="value">{trendData.stats.confidence_trend}</p>
            </div>
          </div>

          {/* Trend Timeline */}
          <div className="trend-timeline">
            {trendData.trend.map((item, index) => (
              <div key={item.report_id} className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <div className="timeline-disease">{item.disease}</div>
                  <p className="timeline-date">{item.date}</p>
                  <p className="timeline-confidence">
                    Confidence: {(item.confidence * 100).toFixed(1)}%
                  </p>
                  {item.vs_previous && (
                    <div className="timeline-change">
                      <p>
                        {item.vs_previous.disease_changed ? '🔄 Disease Changed' : '✓ Same Disease'}
                      </p>
                      <p>
                        Confidence {item.vs_previous.confidence_change > 0 ? '📈' : '📉'}:{' '}
                        {Math.abs(item.vs_previous.confidence_change).toFixed(2)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Comparison;
