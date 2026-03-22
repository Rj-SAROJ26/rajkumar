import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useDropzone } from "react-dropzone";
import { useLanguage } from "../context/LanguageContext";
import ImageAdjuster from "./ImageAdjuster";
import ResultSection from "./ResultSection";
// import Footer from "./Footer";
import "./Upload.css";

function Upload() {
  const { t } = useLanguage();
  const HISTORY_STORAGE_KEY = "skinnet_report_history";
  const MAX_HISTORY_ITEMS = 12;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [location, setLocation] = useState(""); // Store user-entered location
  const [predictions, setPredictions] = useState([]); // Store predictions array
  const [primaryDisease, setPrimaryDisease] = useState(null); // Store primary disease info
  const [backendStatus, setBackendStatus] = useState("checking");
  const [questions] = useState([]); // Stores symptom questions
  const [answers, setAnswers] = useState({}); // Stores user responses
  const [diseaseKeys] = useState([]); // Stores disease keys from prediction
  const [awaitingSymptoms, setAwaitingSymptoms] = useState(false); // Waiting for symptom input
  const [finalReport, setFinalReport] = useState(null); // Stores full AI-generated report
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Tracks button loading state
  const outputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const selectedImagesRef = useRef([]);
  const [isUploading, setIsUploading] = useState(false); // Tracks Submit button loading state
  const [hospitals, setHospitals] = useState([]); // Store hospital suggestions
  const [hospitalsLoading, setHospitalsLoading] = useState(false); // Track hospital loading
  const [treatmentInfo, setTreatmentInfo] = useState(""); // Store treatment/prescription info
  const [conditionDescription, setConditionDescription] = useState("");
  const [treatmentError, setTreatmentError] = useState("");
  const [infoLoading, setInfoLoading] = useState(false); // Track info loading state
  const [hospitalSearchRequested, setHospitalSearchRequested] = useState(false);
  const [hospitalSearchError, setHospitalSearchError] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [activeImageId, setActiveImageId] = useState(null);
  const [qualityWarning, setQualityWarning] = useState("");
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);

  const MAX_UPLOAD_IMAGES = 3;
  const FRONTEND_BLUR_THRESHOLD = 90;
  const MODEL_INPUT_SIZE = 224;

  const revokeImageItemUrls = (item) => {
    if (item?.previewUrl && item.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(item.previewUrl);
    }
    if (item?.processedPreviewUrl && item.processedPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(item.processedPreviewUrl);
    }
  };

  const calculateLaplacianVariance = (grayPixels, width, height) => {
    if (!grayPixels || width < 3 || height < 3) {
      return 0;
    }

    let sum = 0;
    let sumSquares = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const center = y * width + x;
        const laplacianValue =
          grayPixels[center - width] +
          grayPixels[center - 1] -
          4 * grayPixels[center] +
          grayPixels[center + 1] +
          grayPixels[center + width];

        sum += laplacianValue;
        sumSquares += laplacianValue * laplacianValue;
        count += 1;
      }
    }

    if (count === 0) {
      return 0;
    }

    const mean = sum / count;
    return sumSquares / count - mean * mean;
  };

  const preprocessImage = (inputFile, includePreview = false) => {
    return new Promise((resolve) => {
      const tempUrl = URL.createObjectURL(inputFile);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        let { width, height } = img;
        if (width > height) {
          height = Math.round((height * MODEL_INPUT_SIZE) / width);
          width = MODEL_INPUT_SIZE;
        } else {
          width = Math.round((width * MODEL_INPUT_SIZE) / height);
          height = MODEL_INPUT_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(img, 0, 0, width, height);

        const imageData = context.getImageData(0, 0, width, height);
        const data = imageData.data;
        const contrast = 1.12;
        const brightnessShift = 0.06;

        for (let i = 0; i < data.length; i += 4) {
          const normalizedRed = data[i] / 255;
          const normalizedGreen = data[i + 1] / 255;
          const normalizedBlue = data[i + 2] / 255;

          const enhancedRed = Math.min(
            1,
            Math.max(0, (normalizedRed - 0.5) * contrast + 0.5 + brightnessShift),
          );
          const enhancedGreen = Math.min(
            1,
            Math.max(0, (normalizedGreen - 0.5) * contrast + 0.5 + brightnessShift),
          );
          const enhancedBlue = Math.min(
            1,
            Math.max(0, (normalizedBlue - 0.5) * contrast + 0.5 + brightnessShift),
          );

          // Normalize to [0,1] then scale back to image space for upload blob.
          data[i] = Math.round(enhancedRed * 255);
          data[i + 1] = Math.round(enhancedGreen * 255);
          data[i + 2] = Math.round(enhancedBlue * 255);
        }

        context.putImageData(imageData, 0, 0);

        const grayPixels = new Float32Array(width * height);
        for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
          grayPixels[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }

        const blurScore = calculateLaplacianVariance(grayPixels, width, height);
        const isBlurry = blurScore < FRONTEND_BLUR_THRESHOLD;

        canvas.toBlob(
          (optimizedBlob) => {
            const response = {
              optimizedBlob,
              blurScore,
              isBlurry,
            };

            if (!includePreview) {
              URL.revokeObjectURL(tempUrl);
              resolve(response);
              return;
            }

            canvas.toBlob(
              (previewBlob) => {
                response.processedPreviewUrl = previewBlob
                  ? URL.createObjectURL(previewBlob)
                  : null;
                URL.revokeObjectURL(tempUrl);
                resolve(response);
              },
              "image/jpeg",
              0.9,
            );
          },
          "image/jpeg",
          0.9,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        resolve({
          optimizedBlob: null,
          blurScore: 0,
          isBlurry: false,
          processedPreviewUrl: null,
        });
      };

      img.src = tempUrl;
    });
  };

  const syncActiveImage = (images, preferredImageId = null) => {
    if (!images.length) {
      setActiveImageId(null);
      setFile(null);
      setPreview(null);
      return;
    }

    const selected =
      images.find((image) => image.id === preferredImageId) || images[0];

    setActiveImageId(selected.id);
    setFile(selected.file);
    setPreview(selected.previewUrl);
  };

  const addImages = async (incomingFiles) => {
    if (!incomingFiles || incomingFiles.length === 0) {
      return;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError("");

    const availableSlots = MAX_UPLOAD_IMAGES - selectedImages.length;
    if (availableSlots <= 0) {
      alert("You can upload up to 3 images only.");
      return;
    }

    const acceptedFiles = incomingFiles.slice(0, availableSlots);
    if (incomingFiles.length > availableSlots) {
      alert("Only the first 3 images are allowed. Extra images were skipped.");
    }

    setIsOptimizingImages(true);

    const preparedImages = [];
    for (const incomingFile of acceptedFiles) {
      const qualityResult = await preprocessImage(incomingFile, true);
      preparedImages.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: incomingFile,
        previewUrl: URL.createObjectURL(incomingFile),
        processedPreviewUrl: qualityResult.processedPreviewUrl || null,
        blurScore: qualityResult.blurScore || 0,
        isBlurry: Boolean(qualityResult.isBlurry),
      });
    }

    const mergedImages = [...selectedImages, ...preparedImages];
    setSelectedImages(mergedImages);
    syncActiveImage(mergedImages, preparedImages[0]?.id || mergedImages[0]?.id);
    setPrimaryDisease(null);
    setPredictions([]);
    resetLocationBasedResults();

    const blurryCount = mergedImages.filter((image) => image.isBlurry).length;
    if (blurryCount > 0) {
      setQualityWarning(
        "Image is not clear. Please upload a sharper image for better results.",
      );
    } else {
      setQualityWarning("");
    }

    setIsOptimizingImages(false);
  };

  const removeImageById = (imageId) => {
    const imageToRemove = selectedImages.find((image) => image.id === imageId);
    if (imageToRemove) {
      revokeImageItemUrls(imageToRemove);
    }

    const updatedImages = selectedImages.filter((image) => image.id !== imageId);
    setSelectedImages(updatedImages);
    syncActiveImage(updatedImages);
    setPrimaryDisease(null);
    setPredictions([]);
    resetLocationBasedResults();

    if (!updatedImages.some((image) => image.isBlurry)) {
      setQualityWarning("");
    }
  };

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  // Drag and drop configuration
  const onDrop = async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === "file-too-large") {
        alert("File is too large. Please select an image under 5MB.");
      } else if (error.code === "file-invalid-type") {
        alert("Please select a valid image file (JPG, PNG).");
      } else {
        alert("Invalid file selected.");
      }
      return;
    }

    await addImages(acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: MAX_UPLOAD_IMAGES,
    multiple: true,
    disabled: isUploading,
  });

  const getConditionDetailsMarkdown = () => {
    const sections = [];

    if (finalReport?.description) {
      sections.push(`## Condition Summary\n${finalReport.description}`);
    }

    if (finalReport?.symptoms_care) {
      sections.push(finalReport.symptoms_care);
    }

    if (finalReport?.prescription) {
      sections.push(`## Prescription\n${finalReport.prescription}`);
    }

    if (treatmentInfo && treatmentInfo !== finalReport?.symptoms_care) {
      sections.push(`## Treatment Info\n${treatmentInfo}`);
    }

    if (
      conditionDescription &&
      conditionDescription !== finalReport?.description
    ) {
      sections.push(`## Additional Info\n${conditionDescription}`);
    }

    return sections.filter(Boolean).join("\n\n");
  };

  const [reportHistory, setReportHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      const parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];
      return Array.isArray(parsedHistory) ? parsedHistory : [];
    } catch (error) {
      console.error("Error loading report history:", error);
      return [];
    }
  });
  const BASE_URL = "http://localhost:8000"; // Backend API runs on port 8000

  const buildLocationBasedHospitals = (disease, selectedLocation) => {
    const cleanLocation = (selectedLocation || "").trim();
    if (!cleanLocation) {
      return [];
    }

    const diseaseLabel = (disease || "skin disease").replace(/-/g, " ");
    const suggestionTemplates = [
      {
        name: "Nearby General Hospital",
        query: `general hospital near ${cleanLocation}`,
      },
      {
        name: "Nearby Skin Specialist Hospital",
        query: `dermatologist hospital near ${cleanLocation}`,
      },
      {
        name: `Nearby Care For ${diseaseLabel}`,
        query: `${diseaseLabel} treatment hospital near ${cleanLocation}`,
      },
    ];

    return suggestionTemplates.map((item) => ({
      name: item.name,
      location: cleanLocation,
      address: `${item.name}, ${cleanLocation}`,
      phone: "Search on Google Maps",
      details: item.query,
      maps_url: `https://www.google.com/maps/search/${encodeURIComponent(item.query)}`,
    }));
  };

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }

      selectedImagesRef.current.forEach((image) => revokeImageItemUrls(image));
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(reportHistory));
  }, [reportHistory]);

  const resetLocationBasedResults = () => {
    setHospitals([]);
    setTreatmentInfo("");
    setTreatmentError("");
    setFinalReport(null);
    setHospitalSearchRequested(false);
    setHospitalSearchError("");
  };

  const getFormattedTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return timestamp;
    }
  };

  const getSeverityLabel = (confidence) => {
    if (confidence >= 80) return "Severe";
    if (confidence >= 50) return "Moderate";
    return "Mild";
  };

  const saveReportToHistory = ({
    disease,
    confidence,
    location: selectedLocation,
    predictions: predictionList,
    symptomsCare,
    hospitals: hospitalList,
  }) => {
    const reportEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      disease,
      confidence,
      location: selectedLocation,
      predictions: predictionList || [],
      symptomsCare: symptomsCare || "",
      hospitals: hospitalList || [],
      createdAt: new Date().toISOString(),
    };

    setReportHistory((previousHistory) =>
      [reportEntry, ...previousHistory].slice(0, MAX_HISTORY_ITEMS),
    );
  };

  const loadHistoryReport = (report) => {
    selectedImages.forEach((image) => revokeImageItemUrls(image));
    setSelectedImages([]);
    setActiveImageId(null);
    setFile(null);
    setPreview(null);

    setLocation(report.location || "");
    setPrimaryDisease(
      report.disease
        ? {
            name: report.disease,
            confidence: Number(report.confidence) || 0,
          }
        : null,
    );
    setPredictions(report.predictions || []);
    setTreatmentInfo(report.symptomsCare || "");
    setHospitals(report.hospitals || []);
    setHospitalSearchRequested((report.hospitals || []).length > 0);
    setHospitalSearchError("");
    setFinalReport({
      disease: report.disease || "",
      severity: "Moderate",
      location: report.location || "",
      symptoms_care: report.symptomsCare || "",
      hospitals: report.hospitals || [],
      out_of_class: false,
    });
  };

  const clearReportHistory = () => {
    setReportHistory([]);
  };

  const checkBackendStatus = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/`); // Backend health check endpoint
      if (response.status === 200) {
        setBackendStatus("online");
      } else {
        setBackendStatus("unknown");
      }
    } catch (error) {
      console.error("Error connecting to backend:", error);
      setBackendStatus("offline");
    }
  };

  useEffect(() => {
    checkBackendStatus(); // Check backend status on component mount
  }, []);

  const clearCapturedPreview = () => {
    if (activeImageId) {
      removeImageById(activeImageId);
      return;
    }

    selectedImages.forEach((image) => revokeImageItemUrls(image));
    setSelectedImages([]);
    setFile(null);
    setPreview(null);
    setPrimaryDisease(null);
    setPredictions([]);
    resetLocationBasedResults();
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(t("upload.cameraNotSupported"));
      return;
    }

    try {
      setCameraError("");
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setIsCameraOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error starting camera:", error);
      setCameraError(t("upload.cameraAccessError"));
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError(t("upload.cameraPreviewNotReady"));
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context || !video.videoWidth || !video.videoHeight) {
      setCameraError(t("upload.cameraCaptureFailed"));
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError(t("upload.cameraBlobFailed"));
          return;
        }

        const capturedFile = new File(
          [blob],
          `skin-capture-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          },
        );

        addImages([capturedFile]);
        setCameraError("");
        stopCamera();
      },
      "image/jpeg",
      0.92,
    );
  };

  const handleUpload = async (selectedLocation = location.trim()) => {
    if (!selectedImages.length) {
      alert(t("upload.pleaseUploadImage"));
      return;
    }

    // Location is optional here; backend can handle empty location gracefully.
    selectedLocation = selectedLocation || "";

    const blurryImages = selectedImages.filter((image) => image.isBlurry);
    if (blurryImages.length === selectedImages.length) {
      alert("Image is not clear. Please upload a sharper image for better results.");
      return;
    }

    if (blurryImages.length > 0) {
      const shouldContinue = window.confirm(
        "Image is not clear. Please upload a sharper image for better results.\n\nDo you still want to continue analysis with the clearer images?",
      );
      if (!shouldContinue) {
        return;
      }
    }

    setIsUploading(true); // Start loading animation
    setIsOptimizingImages(true);

    try {
      const clearImages = selectedImages.filter((image) => !image.isBlurry);
      const imagesForAnalysis = (clearImages.length ? clearImages : selectedImages).slice(
        0,
        MAX_UPLOAD_IMAGES,
      );

      let response;

      try {
        const multiFormData = new FormData();

        for (const image of imagesForAnalysis) {
          const processedResult = await preprocessImage(image.file);
          const uploadBlob = processedResult.optimizedBlob || image.file;
          const processedFile = new File(
            [uploadBlob],
            `${image.file.name.replace(/\.[^.]+$/, "")}-optimized.jpg`,
            { type: "image/jpeg" },
          );
          multiFormData.append("files", processedFile);
        }

        response = await axios.post(`${BASE_URL}/api/predict_images`, multiFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (multiEndpointError) {
        // Fallback: analyze the best quality image via legacy endpoint.
        const bestImage = imagesForAnalysis.reduce((best, current) =>
          current.blurScore > best.blurScore ? current : best,
        );

        const bestProcessedResult = await preprocessImage(bestImage.file);
        const bestProcessedFile = new File(
          [bestProcessedResult.optimizedBlob || bestImage.file],
          `${bestImage.file.name.replace(/\.[^.]+$/, "")}-optimized.jpg`,
          { type: "image/jpeg" },
        );

        const fallbackFormData = new FormData();
        fallbackFormData.append("file", bestProcessedFile);
        fallbackFormData.append("location", selectedLocation);

        response = await axios.post(`${BASE_URL}/`, fallbackFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      console.log("Upload response:", response.data);
      console.log("Predictions:", response.data.predictions);

      if (response.data?.warning) {
        setQualityWarning(response.data.warning);
      }

      if (response.data.predictions && response.data.predictions.length > 0) {
        const predictionsData = response.data.predictions;
        const topPrediction = predictionsData[0];
        const diseaseName = topPrediction[0];
        const confidenceNumber = Math.round(topPrediction[1] * 100);
        const severity = getSeverityLabel(confidenceNumber);

        // Store predictions and primary disease in state
        setPredictions(predictionsData);
        setPrimaryDisease({
          name: diseaseName,
          confidence: confidenceNumber,
          severity,
        });

        // Fetch complete disease information (description, treatment, hospitals)
        await fetchCompleteDiseasInfo(
          diseaseName,
          severity,
          selectedLocation,
          predictionsData,
          confidenceNumber,
        );

        setAwaitingSymptoms(false);
      } else {
        console.log("No predictions in response");
        alert(t("upload.errorUnableProcess"));
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      console.error("Error response:", error.response?.data);
      alert(t("upload.errorProcessingImage"));
    } finally {
      setIsUploading(false); // Stop loading animation
      setIsOptimizingImages(false);
    }
  };

  const handleLocationSubmit = async () => {
    const submittedLocation = location.trim();
    setHospitalSearchError("");

    if (!submittedLocation && selectedImages.length === 0) {
      alert(t("upload.pleaseEnterLocation"));
      return;
    }

    if (primaryDisease?.name) {
      await fetchCompleteDiseasInfo(
        primaryDisease.name,
        getSeverityLabel(primaryDisease.confidence || 0),
        submittedLocation,
        predictions,
        primaryDisease.confidence || 0,
      );
      if (finalReport?.disease) {
        await fetchFullDiseaseInfo(
          finalReport.disease,
          finalReport.severity || "Moderate",
          submittedLocation,
        );
      }
      return;
    }

    await handleUpload(submittedLocation);
  };

  const handleFindHospitals = async () => {
    const submittedLocation = location.trim();
    setHospitalSearchRequested(true);

    if (!submittedLocation) {
      setHospitalSearchError("Please enter your city or pincode.");
      setHospitals([]);
      return;
    }

    setHospitalSearchError("");
    await handleLocationSubmit();
  };

  const handleAnswerChange = (symptom, value) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [symptom]: value, // Store answer using symptom as key
    }));
  };

  const handleSubmitSymptoms = async () => {
    if (!location.trim()) {
      alert(t("upload.pleaseEnterLocationBeforeSymptoms"));
      return;
    }

    setIsSubmitting(true); // Show loading icon

    try {
      const response = await axios.post(`${BASE_URL}/api/confirm_symptoms`, {
        answers,
        disease_keys: diseaseKeys, // Include disease keys in request
      });
      fetchFullDiseaseInfo(response.data.disease, response.data.severity);
    } catch (error) {
      console.error("Error confirming symptoms:", error);
      alert(t("upload.errorProcessingImage"));
      setIsSubmitting(false); // Remove loading if error occurs
    }
  };

  const fetchFullDiseaseInfo = async (
    disease,
    severity,
    selectedLocation = location.trim(),
  ) => {
    try {
      console.log(
        `Sending request for Disease: ${disease}, Severity: ${severity}, Location: ${selectedLocation}`,
      );

      const response = await axios.post(`${BASE_URL}/api/get_disease_info`, {
        disease,
        severity,
        location: selectedLocation,
      });

      const locationBasedHospitals = buildLocationBasedHospitals(
        disease,
        selectedLocation,
      );

      setIsSubmitted(true); // Hide "Submit Responses" button after clicking

      // If severity is "Out of Class", set special message & stop further display
      if (response.data.out_of_class) {
        setFinalReport({ outOfClass: true });
        return;
      }

      console.log("Received AI Response:", response.data);
      if (response.data?.error) {
        console.warn(
          "Disease info endpoint returned error:",
          response.data.error,
          response.data.exception,
        );
        setTreatmentError(
          response.data.exception
            ? `Backend error: ${response.data.exception}`
            : "Unable to fetch treatment information at this time.",
        );
      }

      console.log(
        "Symptoms Care Length:",
        response.data.symptoms_care?.length || 0,
      );
      console.log(
        "Symptoms Care Content:",
        response.data.symptoms_care?.substring(0, 500),
      );
      console.log("Hospitals Data:", response.data.hospitals);
      console.log("Number of hospitals:", response.data.hospitals?.length || 0);
      if (response.data.hospitals && response.data.hospitals.length > 0) {
        console.log("First hospital:", response.data.hospitals[0]);
      }
      console.log("Full Response Data:", response.data);

      if (response.data?.error) {
        setFinalReport({
          disease: disease,
          severity: severity,
          location: selectedLocation,
          description: "",
          symptoms_care: "",
          hospitals: locationBasedHospitals,
          out_of_class: false,
        });
        setHospitals(locationBasedHospitals);
        setIsSubmitted(true);
        setInfoLoading(false);
        setHospitalsLoading(false);
        return;
      }

      setFinalReport({
        ...response.data,
        location: selectedLocation,
        hospitals: locationBasedHospitals,
        prescription: response.data.prescription || "",
      });
    } catch (error) {
      console.error(
        "Error fetching disease info:",
        error.response?.data || error.message,
      );
      setFinalReport({ error: "Failed to retrieve additional details." });
    }
  };

  const fetchCompleteDiseasInfo = async (
    disease,
    severity,
    selectedLocation = location.trim(),
    predictionList = predictions,
    confidence = primaryDisease?.confidence || 0,
  ) => {
    try {
      setInfoLoading(true);
      setHospitalsLoading(true);
      console.log(
        `Fetching complete info for Disease: ${disease}, Severity: ${severity}, Location: ${selectedLocation}`,
      );

      const response = await axios.post(`${BASE_URL}/api/get_disease_info`, {
        disease,
        severity,
        location: selectedLocation,
      });

      const locationBasedHospitals = buildLocationBasedHospitals(
        disease,
        selectedLocation,
      );

      if (response.data?.error) {
        console.warn(
          "Disease info endpoint returned error:",
          response.data.error,
          response.data.exception,
        );
        setTreatmentInfo("");
        setConditionDescription("");
        setTreatmentError(
          response.data.exception
            ? `Backend error: ${response.data.exception}`
            : t("upload.treatmentUnavailable"),
        );
        setHospitals(locationBasedHospitals);
        setFinalReport({
          disease,
          severity,
          location: selectedLocation,
          description: "",
          symptoms_care: "",
          hospitals: locationBasedHospitals,
          out_of_class: false,
        });
        saveReportToHistory({
          disease,
          confidence,
          location: selectedLocation,
          predictions: predictionList,
          symptomsCare: "",
          hospitals: locationBasedHospitals,
        });
        return;
      }

      const fetchedHospitals =
        response.data.hospitals && response.data.hospitals.length > 0
          ? response.data.hospitals
          : locationBasedHospitals;

      // Extract and set description and treatment information
      const receivedConditionDetails =
        response.data.symptoms_care || response.data.description || "";
      if (receivedConditionDetails) {
        setTreatmentInfo(response.data.symptoms_care || "");
        setConditionDescription(response.data.description || "");
        setTreatmentError("");
      } else {
        setTreatmentInfo("");
        setConditionDescription("");
        setTreatmentError(t("upload.treatmentUnavailable"));
      }

      // Extract and set hospital data
      console.log("Hospital data generated for location:", fetchedHospitals);
      setHospitals(fetchedHospitals);

      setFinalReport({
        disease: response.data.disease || disease,
        severity: response.data.severity || severity,
        location: response.data.location || selectedLocation,
        description: response.data.description || "",
        symptoms_care: response.data.symptoms_care || "",
        prescription: response.data.prescription || "",
        hospitals: fetchedHospitals,
        out_of_class: response.data.out_of_class || false,
      });

      saveReportToHistory({
        disease: response.data.disease || disease,
        confidence,
        location: response.data.location || selectedLocation,
        predictions: predictionList,
        symptomsCare: response.data.symptoms_care || "",
        hospitals: fetchedHospitals,
      });
    } catch (error) {
      console.error(
        "Error fetching disease info:",
        error.response?.data || error.message,
      );
      const locationBasedHospitals = buildLocationBasedHospitals(
        disease,
        selectedLocation,
      );
      setTreatmentInfo("");
      setConditionDescription("");
      setTreatmentError(t("upload.treatmentUnavailable"));
      setHospitals(locationBasedHospitals);
      setFinalReport({
        disease: disease,
        severity: severity,
        location: selectedLocation,
        description: "",
        symptoms_care: "",
        prescription: "",
        hospitals: locationBasedHospitals,
        out_of_class: false,
      });
    } finally {
      setInfoLoading(false);
      setHospitalsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = outputRef.current;

    html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let y = 0; // Position to start adding images

      while (y < imgHeight) {
        pdf.addImage(imgData, "PNG", 0, -y, imgWidth, imgHeight);
        y += pageHeight; // Move to the next page
        if (y < imgHeight) pdf.addPage(); // Add new page if content is not fully captured
      }

      pdf.save(t("upload.reportFile"));
    });
  };

  const openHospitalInMaps = (hospital) => {
    if (!hospital) return;

    const latitude = hospital?.coordinates?.lat ?? hospital?.latitude;
    const longitude = hospital?.coordinates?.lng ?? hospital?.longitude;

    let mapsUrl = hospital?.maps_url || "";
    if (latitude !== undefined && longitude !== undefined) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    } else if (!mapsUrl) {
      const searchQuery = `${hospital.name || ""} ${hospital.address || hospital.location || ""}`.trim();
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
    }

    window.open(mapsUrl, "_blank");
  };

  const confidenceValue = primaryDisease?.confidence
    ? Math.round(primaryDisease.confidence)
    : 0;

  const conditionDetailsMarkdown = getConditionDetailsMarkdown();
  const activeImage =
    selectedImages.find((image) => image.id === activeImageId) ||
    selectedImages[0] ||
    null;

  return (
    <div ref={outputRef} className="upload-container scan-dashboard">
      <p className="backend-status">
        {backendStatus === "checking"
          ? t("upload.statusChecking")
          : backendStatus === "online"
            ? t("upload.statusOnline")
            : backendStatus === "unknown"
              ? t("upload.statusUnknown")
              : t("upload.statusOffline")}
      </p>
      {backendStatus === "checking" ? null : backendStatus === "online" ? (
        <>
          <div className="scan-hero">
            <div className="scan-hero-copy">
              <div className="scan-kicker">DERMSCAN AI</div>
              <h1 className="upload-title">{t("upload.title")}</h1>
              <h3>{t("upload.subtitle")}</h3>
            </div>
            <div className="scan-hero-status">
              <div className="status-orb"></div>
              <span>{t("upload.serverOnlineShort")}</span>
            </div>
          </div>

          <div className="scan-layout">
            <aside className="scan-sidebar">
              <div className="scan-side-card">
                <div className="side-card-label">{t("upload.workflow")}</div>
                <ul className="side-list">
                  {t("upload.workflowSteps").map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>

              <div className="scan-side-card">
                <div className="side-card-label">{t("upload.liveContext")}</div>
                <div className="side-stat">
                  <span>{t("upload.location")}</span>
                  <strong>{location || t("upload.notEntered")}</strong>
                </div>
                <div className="side-stat">
                  <span>{t("upload.primaryResult")}</span>
                  <strong>{primaryDisease?.name || t("upload.waiting")}</strong>
                </div>
                <div className="side-stat">
                  <span>{t("upload.confidence")}</span>
                  <strong>
                    {primaryDisease ? `${confidenceValue}%` : "--"}
                  </strong>
                </div>
              </div>

              <div className="scan-side-card accent">
                <div className="side-card-label">
                  {t("upload.disclaimerTitle")}
                </div>
                <p>{t("upload.disclaimerText")}</p>
              </div>

              <div className="scan-side-card history-card">
                <div className="history-header">
                  <div className="side-card-label">
                    {t("upload.historyTitle")}
                  </div>
                  <div className="history-actions">
                    {reportHistory.length > 0 && (
                      <button
                        type="button"
                        className="history-clear-button"
                        onClick={clearReportHistory}
                      >
                        {t("upload.clearHistory")}
                      </button>
                    )}
                  </div>
                </div>

                {reportHistory.length === 0 ? (
                  <p className="history-empty">{t("upload.historyEmpty")}</p>
                ) : (
                  <div className="history-list">
                    {reportHistory.map((report) => (
                      <button
                        key={report.id}
                        type="button"
                        className="history-item"
                        onClick={() => loadHistoryReport(report)}
                      >
                        <strong>
                          {report.disease || t("upload.notAvailable")}
                        </strong>
                        <span>{report.location || t("upload.notEntered")}</span>
                        <span>
                          {report.confidence
                            ? `${Math.round(report.confidence)}% ${t("upload.confidence").toLowerCase()}`
                            : t("upload.awaitingPrediction")}
                        </span>
                        <small>{getFormattedTimestamp(report.createdAt)}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <section className="scan-main">
              <div className="scan-panel upload-panel">
                <div className="panel-header">
                  <div>
                    <p className="panel-eyebrow">{t("upload.scanNew")}</p>
                    <h2>{t("upload.uploadImage")}</h2>
                  </div>
                </div>

                <div className="upload-dropzone">
                  <div
                    {...getRootProps({
                      className: `normal-upload-box ${isDragActive ? "dropzone-active" : ""}`,
                    })}
                  >
                    <input {...getInputProps()} />
                    <label className="upload-label">
                      <span className="upload-icon">📁</span>
                      <div>
                        <strong>Upload Image(s)</strong>
                        <p className="upload-hint">
                          Supported formats: JPG, PNG (max 5MB each)
                        </p>
                        <p className="upload-instructions">
                          📸 Upload 1 to 3 clear images of the affected skin
                          <br />
                          💡 Drag & drop supported for quick upload
                        </p>
                      </div>
                    </label>
                  </div>

                  {selectedImages.length > 0 && (
                    <div className="selected-file-info multi-file-info">
                      <strong>{selectedImages.length} / 3 image(s) selected</strong>
                    </div>
                  )}

                  {isOptimizingImages && (
                    <p className="loading-text">
                      Optimizing image for better accuracy...
                    </p>
                  )}

                  {qualityWarning && <p className="camera-error">{qualityWarning}</p>}

                  <div className="upload-alternatives">
                    <button
                      type="button"
                      className="upload-button camera-trigger-button"
                      onClick={startCamera}
                      disabled={isUploading}
                    >
                      {t("upload.openCamera")}
                    </button>
                    <button
                      type="button"
                      className="upload-button"
                      onClick={() => handleUpload(location.trim())}
                      disabled={!file || selectedImages.length === 0 || isUploading}
                    >
                      {isUploading
                        ? "Analyzing skin condition..."
                        : "Analyze Image"}
                    </button>
                  </div>
                  {cameraError && <p className="camera-error">{cameraError}</p>}
                  {isCameraOpen && (
                    <div className="camera-panel">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="camera-feed"
                      />
                      <div className="camera-actions">
                        <button
                          type="button"
                          className="upload-button"
                          onClick={captureFromCamera}
                        >
                          {t("upload.capturePhoto")}
                        </button>
                        <button
                          type="button"
                          className="camera-stop-button"
                          onClick={stopCamera}
                        >
                          {t("upload.stopCamera")}
                        </button>
                      </div>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="camera-canvas" />
                </div>

                <div className="preview-analysis-row">
                  <div className="image-preview futuristic-preview">
                    <h3>{t("upload.preview")}</h3>
                    {preview ? (
                      <>
                        <ImageAdjuster src={preview} alt="Selected Preview" />

                        {activeImage?.processedPreviewUrl && (
                          <div className="processed-preview-box">
                            <p>Processed Preview</p>
                            <img
                              src={activeImage.processedPreviewUrl}
                              alt="Processed Preview"
                              className="processed-preview-img"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="preview-placeholder">
                        {t("upload.noImage")}
                      </div>
                    )}

                    {selectedImages.length > 0 && (
                      <div className="image-thumbnail-grid">
                        {selectedImages.map((image) => (
                          <div
                            key={image.id}
                            className={`image-thumb-item ${
                              image.id === activeImageId ? "active" : ""
                            }`}
                          >
                            <button
                              type="button"
                              className="image-thumb-button"
                              onClick={() => syncActiveImage(selectedImages, image.id)}
                            >
                              <img src={image.previewUrl} alt={image.file.name} />
                            </button>
                            {image.isBlurry ? (
                              <span className="blur-tag">Low Quality</span>
                            ) : null}
                            <button
                              type="button"
                              className="remove-thumb-btn"
                              onClick={() => removeImageById(image.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {preview && selectedImages.length > 0 && (
                      <div className="camera-actions preview-actions">
                        <button
                          type="button"
                          className="camera-stop-button"
                          onClick={clearCapturedPreview}
                        >
                          {t("upload.removeImage")}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="scan-panel mini-results">
                    <p className="panel-eyebrow">
                      {t("upload.analysisResults")}
                    </p>
                    <div
                      className="confidence-gauge"
                      style={{ "--score": confidenceValue * 3.6 }}
                    >
                      <div className="gauge-value">
                        {primaryDisease ? `${confidenceValue}%` : "--"}
                      </div>
                      <div className="gauge-label">
                        {t("upload.confidenceScore")}
                      </div>
                    </div>
                    <div className="mini-results-copy">
                      <strong>
                        {primaryDisease?.name || t("upload.waitingForUpload")}
                      </strong>
                      <span>
                        {primaryDisease
                          ? t("upload.primaryDetected")
                          : t("upload.uploadToStart")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="location-input futuristic-location">
                  <h4 id="location-title">{t("upload.enterLocation")}</h4>
                  <input
                    id="location-box"
                    type="text"
                    placeholder={t("upload.locationPlaceholder")}
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      resetLocationBasedResults();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLocationSubmit();
                      }
                    }}
                    autoComplete="address-level2"
                  />
                  <button
                    type="button"
                    className="upload-button location-submit-button"
                    onClick={handleLocationSubmit}
                    disabled={isUploading || infoLoading || hospitalsLoading}
                  >
                    {isUploading || infoLoading || hospitalsLoading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      t("upload.runScan")
                    )}
                  </button>
                </div>
              </div>

              {(primaryDisease ||
                predictions.length > 0 ||
                hospitals.length > 0 ||
                conditionDetailsMarkdown ||
                treatmentError) && (
                <div className="scan-panel results-panel">
                  <div className="panel-header">
                    <div>
                      <p className="panel-eyebrow">
                        {t("upload.analysisResults")}
                      </p>
                      <h2>{t("upload.clinicalSummary")}</h2>
                    </div>
                    <button
                      type="button"
                      className="download-btn"
                      onClick={handleDownloadPDF}
                    >
                      {t("upload.downloadReport")}
                    </button>
                  </div>

                  <ResultSection
                    primaryDisease={primaryDisease}
                    predictions={predictions}
                    finalReport={finalReport}
                    location={location}
                  />

                  {finalReport && (
                    <div className="result-detail-block condition-dashboard">
                      <div className="condition-action-row">
                        <button
                          type="button"
                          className="upload-button"
                          onClick={() =>
                            window.open(
                              `https://www.google.com/maps/search/dermatologist+near+${encodeURIComponent(location || "")}`,
                              "_blank",
                            )
                          }
                        >
                          Find Dermatologist
                        </button>
                        <button
                          type="button"
                          className="upload-button"
                          onClick={() => {
                            selectedImages.forEach((image) => revokeImageItemUrls(image));
                            setSelectedImages([]);
                            setActiveImageId(null);
                            setLocation("");
                            setFile(null);
                            setPreview(null);
                            setPrimaryDisease(null);
                            setPredictions([]);
                            setFinalReport(null);
                            setTreatmentInfo("");
                            setConditionDescription("");
                            setTreatmentError("");
                            setHospitals([]);
                            setHospitalSearchRequested(false);
                            setHospitalSearchError("");
                            setQualityWarning("");
                            setIsOptimizingImages(false);
                          }}
                        >
                          Start New Scan
                        </button>
                        <button
                          type="button"
                          className="download-btn"
                          onClick={handleDownloadPDF}
                        >
                          Download Report
                        </button>
                      </div>

                      <div className="hospital-suggestions hospital-section">
                        <div className="hospital-header">
                          <h3>Nearby Hospitals & Clinics</h3>
                          <p>Enter your city or pincode to find nearby options.</p>
                        </div>

                        <div className="location-controls">
                          <input
                            type="text"
                            className="location-input-field"
                            placeholder="Enter your city or pincode"
                            value={location}
                            onChange={(e) => {
                              setLocation(e.target.value);
                              setHospitalSearchRequested(false);
                              setHospitalSearchError("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleFindHospitals();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="location-btn"
                            onClick={handleFindHospitals}
                            disabled={isUploading || infoLoading || hospitalsLoading}
                          >
                            {isUploading || infoLoading || hospitalsLoading
                              ? "Searching..."
                              : "Find Hospitals"}
                          </button>
                        </div>

                        {hospitalSearchError && (
                          <div className="no-hospitals">{hospitalSearchError}</div>
                        )}

                        {hospitalSearchRequested && !hospitalSearchError && (
                          <>
                            {isUploading || infoLoading || hospitalsLoading ? (
                              <p className="loading-text">
                                Searching nearby hospitals...
                              </p>
                            ) : hospitals.length > 0 ? (
                              <div className="hospitals-grid">
                                {hospitals.map((hospital, index) => (
                                  <div
                                    key={`${hospital.name || "hospital"}-${index}`}
                                    className="hospital-card"
                                  >
                                    <div className="hospital-card-header">
                                      <h4>
                                        {hospital.name || `Hospital ${index + 1}`}
                                      </h4>
                                    </div>

                                    <div className="hospital-details">
                                      <p>
                                        <strong>Address:</strong>{" "}
                                        {hospital.address ||
                                          hospital.location ||
                                          "Address not available"}
                                      </p>
                                      {hospital.phone ? (
                                        <p>
                                          <strong>Contact:</strong> {hospital.phone}
                                        </p>
                                      ) : null}
                                    </div>

                                    <div className="hospital-actions">
                                      <button
                                        type="button"
                                        className="directions-btn"
                                        onClick={() => openHospitalInMaps(hospital)}
                                      >
                                        View on Map 📍
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="no-hospitals">
                                No hospitals found for this location.
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {!awaitingSymptoms ? null : (
            <div className="symptom-questions">
              <h2>{t("upload.answerQuestions")}</h2>
              {questions &&
                Object.entries(questions).map(([symptom, question], index) => (
                  <div key={index} className="question">
                    <p>{question}</p>
                    <button
                      className={answers[symptom] === "1" ? "selected" : ""}
                      onClick={() => handleAnswerChange(symptom, "1")}
                    >
                      {t("upload.yes")}
                    </button>
                    <button
                      className={answers[symptom] === "0" ? "selected" : ""}
                      onClick={() => handleAnswerChange(symptom, "0")}
                    >
                      {t("upload.no")}
                    </button>
                  </div>
                ))}
              {!isSubmitted && (
                <button
                  className="upload-button"
                  onClick={handleSubmitSymptoms}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="loading-spinner"></span> // Show loading icon
                  ) : (
                    t("upload.submitResponses")
                  )}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <h2 className="offline-message">{t("upload.offline")}</h2>
      )}
    </div>
  );
  // <Footer/>
}

export default Upload;
