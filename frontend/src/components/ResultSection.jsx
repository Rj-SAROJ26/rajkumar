import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ResultSection.css";

const clampPercentage = (value) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return 0;

  // Backend may return confidence as 0-1 or 0-100; normalize to percentage.
  const normalizedValue = parsedValue <= 1 ? parsedValue * 100 : parsedValue;
  return Math.max(0, Math.min(100, Math.round(normalizedValue)));
};

const normalizePredictions = (predictions = []) => {
  return (Array.isArray(predictions) ? predictions : [])
    .map((prediction, index) => {
      if (Array.isArray(prediction)) {
        return {
          id: `prediction-${index}`,
          name: String(prediction[0] || "Unknown"),
          confidence: clampPercentage(prediction[1]),
        };
      }

      const name =
        prediction?.name ||
        prediction?.disease ||
        prediction?.label ||
        "Unknown";
      const confidence =
        prediction?.confidence ?? prediction?.score ?? prediction?.probability;

      return {
        id: `prediction-${index}`,
        name: String(name),
        confidence: clampPercentage(confidence),
      };
    })
    .sort((first, second) => second.confidence - first.confidence)
    .slice(0, 3);
};

// Severity rules requested by the product spec.
export const getSeverityMeta = (confidencePercentage) => {
  const confidence = clampPercentage(confidencePercentage);

  if (confidence >= 80) {
    return {
      key: "severe",
      label: "Severe",
      icon: "🔴",
      message: "Consult a doctor",
    };
  }

  if (confidence >= 50) {
    return {
      key: "moderate",
      label: "Moderate",
      icon: "🟠",
      message: "Monitor condition",
    };
  }

  return {
    key: "mild",
    label: "Mild",
    icon: "🟢",
    message: "Basic care recommended",
  };
};

function ResultSection({ primaryDisease, predictions, finalReport, location }) {
  const topPredictions = normalizePredictions(predictions);
  const primaryConfidence =
    topPredictions[0]?.confidence ?? clampPercentage(primaryDisease?.confidence);
  const severity = getSeverityMeta(primaryConfidence);

  const diseaseName =
    finalReport?.disease ||
    topPredictions[0]?.name ||
    primaryDisease?.name ||
    "Not Available";

  return (
    <section className="result-section-card">
      <div className="result-head">
        <div>
          <p className="summary-label">Result Summary</p>
          <h3 className="result-disease-name">Disease: {diseaseName}</h3>
        </div>
        <span className={`severity-chip severity-chip-${severity.key}`}>
          {severity.icon} Severity: {severity.label}
        </span>
      </div>

      <div className="result-metrics-grid">
        <div className="result-metric-card">
          <span>Confidence</span>
          <strong>{primaryConfidence}%</strong>
        </div>
        <div className="result-metric-card">
          <span>Severity</span>
          <strong>{severity.label}</strong>
        </div>
        <div className="result-metric-card">
          <span>Location</span>
          <strong>{location || "Not Entered"}</strong>
        </div>
      </div>

      {topPredictions.length > 0 && (
        <div className="top-predictions-card">
          <h4>Top 3 Predictions</h4>
          <ul className="top-predictions-list">
            {topPredictions.map((prediction) => (
              <li key={prediction.id} className="top-predictions-item">
                <span>{prediction.name}</span>
                <strong>{prediction.confidence}%</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="condition-cards-grid">
        <article className="cond-card">
          <div className="card-icon" aria-hidden="true">
            📋
          </div>
          <h5>Short Description</h5>
          <p>
            {finalReport?.description ||
              "Detailed description of the detected condition."}
          </p>
        </article>

        <article className="cond-card">
          <div className="card-icon" aria-hidden="true">
            💊
          </div>
          <h5>Precautions</h5>
          <div className="treatment-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {finalReport?.symptoms_care ||
                "Recommended treatment and care instructions."}
            </ReactMarkdown>
          </div>
        </article>
      </div>

      <p className="severity-guidance">{severity.message}</p>

      <div className="medical-disclaimer">
        <div className="disclaimer-icon">⚠️</div>
        <div className="disclaimer-text">
          <strong>This is not a medical diagnosis</strong>
          <p>
            This analysis is for educational purposes only. Please consult a
            qualified healthcare professional for proper diagnosis and
            treatment.
          </p>
        </div>
      </div>
    </section>
  );
}

export default ResultSection;
