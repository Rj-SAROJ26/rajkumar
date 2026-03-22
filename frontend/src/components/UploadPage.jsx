import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import "./UploadPage.css";

const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:8000";

const SAMPLE_HOSPITALS = [
  {
    name: "Apollo Hospitals",
    address: "154, Bannerghatta Road, Bengaluru, Karnataka 560076",
    city: "bengaluru",
    pincode: "560076",
    phone: "+91-80-26304050",
    latitude: 12.8956,
    longitude: 77.5993,
  },
  {
    name: "Fortis Hospital",
    address: "730, Anandapur, Kolkata, West Bengal 700107",
    city: "kolkata",
    pincode: "700107",
    phone: "+91-33-66284444",
    latitude: 22.5022,
    longitude: 88.3993,
  },
  {
    name: "AIIMS Delhi",
    address: "Sri Aurobindo Marg, New Delhi 110029",
    city: "delhi",
    pincode: "110029",
    phone: "+91-11-26588500",
    latitude: 28.5672,
    longitude: 77.2100,
  },
  {
    name: "Kokilaben Hospital",
    address: "Four Bungalows, Andheri West, Mumbai, Maharashtra 400053",
    city: "mumbai",
    pincode: "400053",
    phone: "+91-22-42696969",
    latitude: 19.1312,
    longitude: 72.8266,
  },
  {
    name: "SIMS Hospital",
    address: "Vadapalani, Chennai, Tamil Nadu 600026",
    city: "chennai",
    pincode: "600026",
    phone: "+91-44-20002001",
    latitude: 13.0499,
    longitude: 80.2124,
  },
  {
    name: "Ruby Hall Clinic",
    address: "40, Sassoon Road, Pune, Maharashtra 411001",
    city: "pune",
    pincode: "411001",
    phone: "+91-20-66455100",
    latitude: 18.5312,
    longitude: 73.8766,
  },
];

const FALLBACK_DESCRIPTION =
  "A skin condition was detected. Please consult a dermatologist for confirmation.";

const FALLBACK_PRECAUTIONS = [
  "Keep the affected skin clean and dry.",
  "Avoid scratching or picking at the area.",
  "Do not self-medicate without medical advice.",
  "Consult a dermatologist if symptoms worsen or spread.",
];

const releaseObjectUrl = (url) => {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

function UploadSection({
  file,
  preview,
  isUploading,
  isDragActive,
  getRootProps,
  getInputProps,
  onAnalyze,
  onClearImage,
}) {
  return (
    <section className="card upload-card">
      <h1 className="page-title">Skin Disease Detection System</h1>
      <p className="section-subtitle">Upload Card</p>

      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "dropzone-active" : ""}`}
      >
        <input {...getInputProps()} />
        {!preview ? (
          <div className="dropzone-copy">
            <strong>Drag & drop an image here</strong>
            <span>or click to browse JPG/PNG files (max 5MB)</span>
          </div>
        ) : (
          <div className="preview-wrap">
            <img src={preview} alt="Skin preview" className="preview-image" />
            <span>Click to replace image</span>
          </div>
        )}
      </div>

      {file && (
        <p className="file-meta">
          Selected: <strong>{file.name}</strong> (
          {(file.size / 1024 / 1024).toFixed(2)} MB)
        </p>
      )}

      <div className="upload-actions">
        <button
          type="button"
          className="primary-btn"
          disabled={!file || isUploading}
          onClick={onAnalyze}
        >
          {isUploading ? "Analyzing skin condition..." : "Analyze"}
        </button>
        <button
          type="button"
          className="ghost-btn"
          disabled={!file || isUploading}
          onClick={onClearImage}
        >
          Clear Image
        </button>
      </div>
    </section>
  );
}

function ResultSection({ result }) {
  return (
    <section className="card result-card">
      <p className="section-subtitle">Result Card</p>
      <h2 className="section-title">Analysis Result</h2>

      <div className="result-grid">
        <article className="info-tile">
          <span className="tile-label">Predicted Disease</span>
          <strong>{result.disease}</strong>
        </article>
        <article className="info-tile">
          <span className="tile-label">Confidence</span>
          <strong>{result.confidence}%</strong>
        </article>
      </div>

      <article className="detail-card">
        <h3>Short Description</h3>
        <p>{result.description}</p>
      </article>

      <article className="detail-card">
        <h3>Precautions</h3>
        <ul className="precaution-list">
          {result.precautions.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      </article>

      <div className="disclaimer-box">
        <strong>This is not a medical diagnosis</strong>
      </div>
    </section>
  );
}

function HospitalSection({
  hospitalInput,
  setHospitalInput,
  hospitalError,
  onFindHospitals,
  hospitals,
  searchStarted,
  searchingHospitals,
  mapToHospital,
}) {
  return (
    <section className="card hospital-card">
      <p className="section-subtitle">Hospital Card</p>
      <h2 className="section-title">Nearby Hospitals & Clinics</h2>

      <div className="hospital-search-row">
        <input
          type="text"
          value={hospitalInput}
          onChange={(event) => setHospitalInput(event.target.value)}
          placeholder="Enter your city or pincode"
          className="hospital-input"
        />
        <button
          type="button"
          className="primary-btn"
          onClick={onFindHospitals}
          disabled={searchingHospitals}
        >
          {searchingHospitals ? "Searching..." : "Find Hospitals"}
        </button>
      </div>

      {hospitalError ? <p className="input-error">{hospitalError}</p> : null}

      {/* Hospitals render only after explicit user action */}
      {searchStarted && (
        <div className="hospital-results">
          {hospitals.length > 0 ? (
            <div className="hospital-grid">
              {hospitals.map((hospital) => (
                <article className="hospital-item" key={hospital.name}>
                  <h3>{hospital.name}</h3>
                  <p>{hospital.address}</p>
                  {hospital.phone ? <p>Contact: {hospital.phone}</p> : null}
                  <button
                    type="button"
                    className="map-btn"
                    onClick={() => mapToHospital(hospital)}
                  >
                    View on Map 📍
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-message">No hospital data found for this location.</p>
          )}
        </div>
      )}
    </section>
  );
}

function UploadPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [result, setResult] = useState(null);

  const [hospitalInput, setHospitalInput] = useState("");
  const [searchStarted, setSearchStarted] = useState(false);
  const [searchingHospitals, setSearchingHospitals] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalError, setHospitalError] = useState("");
  const [highlightHospitalSection, setHighlightHospitalSection] =
    useState(false);

  const resultRef = useRef(null);
  const hospitalRef = useRef(null);
  useEffect(() => () => releaseObjectUrl(preview), [preview]);

  const preprocessImage = (imageFile) =>
    new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        const maxSize = 512;
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > width && height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      };

      img.src = URL.createObjectURL(imageFile);
    });

  const parsePrecautions = (symptomsCare) => {
    if (!symptomsCare) return FALLBACK_PRECAUTIONS;

    const bulletPrecautions = symptomsCare
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-"))
      .map((line) => line.replace(/^-+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 4);

    return bulletPrecautions.length > 0
      ? bulletPrecautions
      : FALLBACK_PRECAUTIONS;
  };

  const fetchDiseaseInfo = async (disease) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/get_disease_info`, {
        disease,
        severity: "Moderate",
        location: "",
      });

      return {
        description: response.data?.description || FALLBACK_DESCRIPTION,
        precautions: parsePrecautions(response.data?.symptoms_care || ""),
      };
    } catch (error) {
      return {
        description: FALLBACK_DESCRIPTION,
        precautions: FALLBACK_PRECAUTIONS,
      };
    }
  };

  const onDrop = (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const reason = rejectedFiles[0].errors?.[0]?.code;
      if (reason === "file-too-large") {
        alert("File is too large. Please select an image under 5MB.");
      } else {
        alert("Only JPG and PNG image files are allowed.");
      }
      return;
    }

    if (acceptedFiles.length === 0) return;

    const selectedFile = acceptedFiles[0];
    releaseObjectUrl(preview);
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));

    // Reset downstream sections when the user uploads a new image.
    setResult(null);
    setSearchStarted(false);
    setHospitals([]);
    setHospitalInput("");
    setHospitalError("");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    disabled: isUploading,
  });

  const clearImage = () => {
    releaseObjectUrl(preview);
    setFile(null);
    setPreview("");
    setResult(null);
    setSearchStarted(false);
    setHospitals([]);
    setHospitalInput("");
    setHospitalError("");
  };

  const analyzeImage = async () => {
    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
      const processedBlob = await preprocessImage(file);
      const processedFile = new File([processedBlob], file.name, {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.append("file", processedFile);

      const response = await axios.post(`${BASE_URL}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const topPrediction = response.data?.predictions?.[0];
      if (!topPrediction) {
        alert("Unable to analyze image. Please try with another image.");
        return;
      }

      const disease = String(topPrediction[0] || "Unknown");
      const confidence = Math.round(Number(topPrediction[1] || 0) * 100);
      const details = await fetchDiseaseInfo(disease);

      setResult({
        disease,
        confidence,
        description: details.description,
        precautions: details.precautions,
      });
      setHighlightHospitalSection(true);

      // Bring result into view after analysis completes.
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      setTimeout(() => setHighlightHospitalSection(false), 2200);
    } catch (error) {
      alert("Something went wrong while analyzing the image.");
    } finally {
      setIsUploading(false);
    }
  };

  const findHospitals = () => {
    const normalizedInput = hospitalInput.trim().toLowerCase();
    if (!normalizedInput) {
      setHospitalError("Please enter a city name or pincode.");
      setSearchStarted(false);
      setHospitals([]);
      return;
    }

    setHospitalError("");
    setSearchStarted(true);
    setSearchingHospitals(true);

    // Simulated lookup from sample data.
    window.setTimeout(() => {
      const filteredHospitals = SAMPLE_HOSPITALS.filter((hospital) => {
        const cityMatch = hospital.city.includes(normalizedInput);
        const pincodeMatch = hospital.pincode.includes(normalizedInput);
        const addressMatch = hospital.address.toLowerCase().includes(normalizedInput);
        return cityMatch || pincodeMatch || addressMatch;
      });

      setHospitals(filteredHospitals);
      setSearchingHospitals(false);

      hospitalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 600);
  };

  const mapToHospital = (hospital) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="upload-page-root">
      <UploadSection
        file={file}
        preview={preview}
        isUploading={isUploading}
        isDragActive={isDragActive}
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        onAnalyze={analyzeImage}
        onClearImage={clearImage}
      />

      {result ? (
        <div ref={resultRef} className="section-wrap">
          <ResultSection result={result} />
        </div>
      ) : null}

      {result ? (
        <div
          ref={hospitalRef}
          className={`section-wrap ${
            highlightHospitalSection ? "hospital-highlight" : ""
          }`}
        >
          <HospitalSection
            hospitalInput={hospitalInput}
            setHospitalInput={setHospitalInput}
            hospitalError={hospitalError}
            onFindHospitals={findHospitals}
            hospitals={hospitals}
            searchStarted={searchStarted}
            searchingHospitals={searchingHospitals}
            mapToHospital={mapToHospital}
          />
        </div>
      ) : null}
    </div>
  );
}

export default UploadPage;
