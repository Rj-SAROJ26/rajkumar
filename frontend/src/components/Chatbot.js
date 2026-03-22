import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useLanguage } from "../context/LanguageContext";
import "./Chatbot.css";

const CHATBOT_ENDPOINTS = [
  "http://localhost:8000/api/chatbot",
  "/api/chatbot",
];
const PREDICT_ENDPOINTS = ["http://localhost:8000/", "/"];
const DISEASE_INFO_ENDPOINTS = [
  "http://localhost:8000/api/get_disease_info",
  "/api/get_disease_info",
];
const CHAT_SESSIONS_STORAGE_KEY = "skinnet_chat_sessions";
const ACTIVE_CHAT_SESSION_KEY = "skinnet_active_chat_session";

const LOCAL_CONDITIONS = {
  ringworm: {
    name: "Ringworm",
    symptoms: ["circular rash", "itching", "scaly skin", "red ring-like border"],
    care: [
      "keep the area clean and dry",
      "avoid sharing towels, clothes, or combs",
      "an over-the-counter antifungal cream may help in mild cases",
    ],
  },
  eczema: {
    name: "Eczema",
    symptoms: ["itching", "dry skin", "redness", "irritation"],
    care: [
      "use a gentle moisturizer often",
      "avoid harsh soaps and scratching",
      "watch for cracking or oozing skin",
    ],
  },
  cellulitis: {
    name: "Cellulitis",
    symptoms: ["redness", "warmth", "swelling", "pain"],
    care: [
      "keep the area clean",
      "avoid squeezing or scratching the skin",
      "see a doctor soon because cellulitis often needs medical treatment",
    ],
  },
  acne: {
    name: "Acne",
    symptoms: ["pimples", "blackheads", "whiteheads", "tender bumps"],
    care: [
      "wash gently",
      "avoid picking pimples",
      "common over-the-counter acne products may help some people",
    ],
  },
};

function inferLocalPossibleConditions(message) {
  const text = message.toLowerCase();
  const possible = [];

  const add = (value) => {
    if (!possible.includes(value)) {
      possible.push(value);
    }
  };

  if (text.includes("itch") || text.includes("itching")) {
    add("eczema");
    add("fungal infection");
    add("contact dermatitis");
  }

  if (text.includes("hand") || text.includes("palm") || text.includes("finger")) {
    add("hand eczema");
    add("contact dermatitis");
  }

  if (text.includes("foot") || text.includes("toe")) {
    add("athlete's foot");
  }

  if (text.includes("circular") || text.includes("ring")) {
    add("ringworm");
  }

  if (text.includes("dry") || text.includes("scaly") || text.includes("peeling")) {
    add("eczema");
    add("psoriasis");
  }

  if (text.includes("red") || text.includes("rash")) {
    add("eczema");
  }

  if (text.includes("swelling") || text.includes("warm") || text.includes("pain")) {
    add("cellulitis");
  }

  return possible.slice(0, 4);
}

function getRecentUserContext(history) {
  return history
    .filter((item) => item.role === "user" && item.content)
    .slice(-3)
    .map((item) => item.content.toLowerCase())
    .join(" ");
}

function createLocalResponse(message, history = []) {
  const text = message.trim().toLowerCase();
  const simpleText = text.replace(/[^a-z0-9\s]/g, "").trim();
  const recentContext = getRecentUserContext(history);

  if (
    ["hi", "hii", "hello", "hey", "helo"].includes(simpleText) ||
    ["hi ", "hii ", "hello ", "hey "].some((prefix) => simpleText.startsWith(prefix))
  ) {
    return [
      "Hey! What can I help you with today?",
      "- Describe your skin symptoms",
      "- Ask about conditions like eczema, ringworm, acne, or cellulitis",
      "- Or use the photo tools to upload or capture a skin image",
      "- I give general guidance only, not a final diagnosis",
    ].join("\n");
  }

  if (
    ["thank you", "thanks", "thx", "thankyou"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "You are welcome.",
      "If you want, tell me your symptoms, ask about a skin condition, or upload a skin photo.",
    ].join("\n");
  }

  if (
    ["bye", "goodbye", "see you", "ok bye"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "Take care.",
      "If you need help again, come back with your symptoms, your question, or a skin photo.",
    ].join("\n");
  }

  if (
    ["how are you", "how r you", "whats up", "what is up", "how do you do"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "I am doing well and ready to help.",
      "Tell me your symptoms, ask about a skin condition, or upload a photo and I will guide you.",
    ].join("\n");
  }

  if (
    ["who are you", "what are you", "what can you do", "can you help me"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "I am your skin health assistant.",
      "- I can explain symptoms and possible conditions",
      "- I can give general skin-care guidance",
      "- I can review a skin photo from your upload",
      "- I cannot give a final diagnosis, but I can help you understand what to do next",
    ].join("\n");
  }

  if (
    ["good morning", "good afternoon", "good evening"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "Hello. I am here and ready to help.",
      "You can ask me about skin symptoms, possible conditions, or upload a skin photo.",
    ].join("\n");
  }

  if (
    ["okay", "ok", "fine", "alright", "hmm"].some((phrase) =>
      simpleText === phrase
    )
  ) {
    return [
      "Sure.",
      "Whenever you are ready, tell me the skin problem, where it is, how long it has been there, or upload a photo.",
    ].join("\n");
  }

  if (
    ["i am worried", "im worried", "worried", "scared", "anxious", "concerned"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "I understand why you are concerned.",
      "Tell me what the skin problem looks like, where it is, and whether it is itchy, painful, or spreading.",
      "If it is severe, rapidly worsening, bleeding, or causing fever, please see a doctor soon.",
    ].join("\n");
  }

  if (
    ["i am confused", "im confused", "confused", "dont understand", "do not understand"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "No problem. We can keep it simple.",
      "Just tell me:",
      "- where the skin problem is",
      "- how long it has been there",
      "- whether it itches, hurts, burns, or is spreading",
    ].join("\n");
  }

  if (
    ["what should i do", "what do i do", "help me", "please help"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "I can help with the next steps.",
      "Describe the skin problem or upload a photo, and I will explain possible causes, general care, and when to see a doctor.",
    ].join("\n");
  }

  if (
    ["are you real", "are you ai", "are you a bot", "are you human"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "I am an AI skin health assistant.",
      "I can help explain symptoms, possible skin conditions, photo findings, and general next steps.",
    ].join("\n");
  }

  if (
    ["good job", "nice", "great", "awesome", "well done"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "Thank you.",
      "I am glad to help. If you want, you can continue with another symptom question or upload a photo.",
    ].join("\n");
  }

  if (
    ["can you explain", "explain this", "tell me more", "more details"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "Yes, I can explain it in a simpler way.",
      "Tell me the skin condition name, your symptoms, or share a photo, and I will break it down clearly.",
    ].join("\n");
  }

  if (
    ["i dont know", "i do not know", "not sure", "unsure"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "That is okay.",
      "Start with anything you notice, like itching, redness, scaling, pain, blisters, or where it is on the body.",
    ].join("\n");
  }

  if (
    ["can i send photo", "can i upload photo", "should i upload photo", "can i show you"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "Yes, you can upload a skin photo or use the camera option.",
      "I will review it and explain the likely condition, common symptoms, and general next steps.",
    ].join("\n");
  }

  if (
    ["what diseases", "which diseases", "what can you detect"].some((phrase) =>
      simpleText.includes(phrase)
    )
  ) {
    return [
      "I can help with common skin concerns such as ringworm, eczema, acne, cellulitis, impetigo, psoriasis, athlete's foot, and similar symptoms.",
      "You can ask by symptom, disease name, or upload a photo.",
    ].join("\n");
  }

  if (["yes", "yeah", "yep", "no", "nope"].includes(simpleText)) {
    if (recentContext.includes("itch") || recentContext.includes("rash") || recentContext.includes("skin")) {
      return [
        "Thanks, that helps.",
        "You can now tell me:",
        "- where it is on the body",
        "- how long it has been there",
        "- whether there is redness, scaling, pain, or spreading",
        "- or upload a photo if that is easier",
      ].join("\n");
    }
    return [
      "Thanks.",
      "Please add a little more detail about the skin problem so I can guide you better.",
    ].join("\n");
  }

  if (simpleText.split(" ").length <= 6 && recentContext) {
    if (["hand", "leg", "arm", "face", "foot", "back", "neck", "chest"].some((term) => simpleText.includes(term))) {
      return [
        "Thanks, that body area helps.",
        "Now tell me whether it is itchy, painful, scaly, red, or spreading.",
        "If you want, you can also upload a skin photo.",
      ].join("\n");
    }

    if (["itch", "itching", "pain", "burning", "red", "rash", "scaly", "dry"].some((term) => simpleText.includes(term))) {
      const possibleConditions = inferLocalPossibleConditions(`${recentContext} ${simpleText}`);
      if (possibleConditions.length > 0) {
        return [
          "Thanks, that gives me more context.",
          "Possible causes could include:",
          ...possibleConditions.map((item) => `- ${item}`),
          "",
          "General next steps:",
          "- keep the area clean and dry",
          "- avoid scratching or rubbing it",
          "- please see a dermatologist if it worsens or spreads",
        ].join("\n");
      }
    }
  }

  const matchedEntry = Object.entries(LOCAL_CONDITIONS).find(([key, value]) => {
    return text.includes(key) || text.includes(value.name.toLowerCase());
  });

  if (matchedEntry) {
    const [, condition] = matchedEntry;
    return [
      `This may be related to ${condition.name}.`,
      "Common symptoms can include:",
      ...condition.symptoms.map((item) => `- ${item}`),
      "General care steps:",
      ...condition.care.map((item) => `- ${item}`),
      "Please consult a dermatologist for a proper diagnosis and prescription advice.",
    ].join("\n");
  }

  const possibleConditions = inferLocalPossibleConditions(message);

  if (possibleConditions.length > 0) {
    const advice = [
      "Based on what you described, possible causes could include:",
      ...possibleConditions.map((item) => `- ${item}`),
      "",
      "You can try:",
      "- keeping the area clean and dry",
      "- avoiding scratching, rubbing, or picking the skin",
    ];

    if (text.includes("hand")) {
      advice.push("- avoiding harsh soaps, detergents, or sanitizers if they make it worse");
    }

    if (text.includes("itch") || text.includes("itching")) {
      advice.push("- using a gentle moisturizer if the skin is dry or irritated");
    }

    advice.push("");
    advice.push("Helpful follow-up:");
    advice.push("- Is there redness, scaling, blisters, pain, or spreading?");
    advice.push("- If it is getting worse, painful, or infected, please see a dermatologist.");
    advice.push("- I can explain possible conditions and general care, but not give a final diagnosis.");

    return advice.join("\n");
  }

  return [
    "I can still help you with general skin guidance.",
    "- Tell me where the skin problem is on the body",
    "- Mention itching, pain, burning, scaling, rash, blisters, or spreading",
    "- If there is fever, bleeding, severe pain, or rapid spreading, please see a doctor soon",
    "- I can explain possible conditions and general care, but not give a final diagnosis",
  ].join("\n");
}

function formatSymptomsCare(markdownText) {
  return markdownText
    .replace(/^##\s*/gm, "")
    .replace(/^- /gm, "- ")
    .trim();
}

function Chatbot() {
  const { t } = useLanguage();
  const createWelcomeMessage = useCallback(
    () => ({
      id: "welcome",
      role: "assistant",
      content: `${t("chatbot.intro")}\n\n${t("chatbot.disclaimer")}`,
    }),
    [t]
  );

  const createNewSession = useCallback(
    () => ({
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: t("chatbot.newChatTitle"),
      updatedAt: new Date().toISOString(),
      messages: [createWelcomeMessage()],
    }),
    [createWelcomeMessage, t]
  );

  const starterTips = useMemo(
    () => [t("chatbot.tip1"), t("chatbot.tip2"), t("chatbot.tip3")],
    [t]
  );

  const [chatSessions, setChatSessions] = useState(() => {
    try {
      const savedSessions = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
      const parsedSessions = savedSessions ? JSON.parse(savedSessions) : [];
      return Array.isArray(parsedSessions) && parsedSessions.length > 0
        ? parsedSessions
        : [createNewSession()];
    } catch (error) {
      console.error("Error loading chatbot sessions:", error);
      return [createNewSession()];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem(ACTIVE_CHAT_SESSION_KEY) || null;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  useEffect(() => {
    if (!activeSessionId && chatSessions.length > 0) {
      setActiveSessionId(chatSessions[0].id);
    }
  }, [activeSessionId, chatSessions]);

  const activeSession = useMemo(() => {
    return (
      chatSessions.find((session) => session.id === activeSessionId) ||
      chatSessions[0] || {
        id: "fallback-session",
        title: t("chatbot.newChatTitle"),
        updatedAt: new Date().toISOString(),
        messages: [createWelcomeMessage()],
      }
    );
  }, [activeSessionId, chatSessions, createWelcomeMessage, t]);

  const messages = activeSession.messages || [createWelcomeMessage()];

  const filteredSessions = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return chatSessions;
    }

    return chatSessions.filter((session) =>
      (session.title || "").toLowerCase().includes(normalizedSearch)
    );
  }, [chatSessions, searchQuery]);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (selectedImagePreview && selectedImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  useEffect(() => {
    localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(chatSessions));
  }, [chatSessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_CHAT_SESSION_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  const getSessionTitle = (sessionMessages) => {
    const firstUserMessage = sessionMessages.find((message) => message.role === "user");
    if (!firstUserMessage?.content) {
      return t("chatbot.newChatTitle");
    }

    const normalized = firstUserMessage.content.replace(/\s+/g, " ").trim();
    return normalized.length > 36 ? `${normalized.slice(0, 36)}...` : normalized;
  };

  const updateActiveSession = (nextMessages) => {
    const updatedSession = {
      ...activeSession,
      messages: nextMessages,
      title: getSessionTitle(nextMessages),
      updatedAt: new Date().toISOString(),
    };

    setChatSessions((previousSessions) => {
      const exists = previousSessions.some((session) => session.id === updatedSession.id);
      const mergedSessions = exists
        ? previousSessions.map((session) =>
            session.id === updatedSession.id ? updatedSession : session
          )
        : [updatedSession, ...previousSessions];

      return [...mergedSessions].sort(
        (left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)
      );
    });
  };

  const handleNewChat = () => {
    const nextSession = createNewSession();
    setChatSessions((previousSessions) => [nextSession, ...previousSessions]);
    setActiveSessionId(nextSession.id);
    setInput("");
    clearSelectedImage();
    stopCamera();
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

  const setPreviewFromFile = (file) => {
    if (selectedImagePreview && selectedImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  };

  const handleImageChange = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      return;
    }
    stopCamera();
    setCameraError("");
    setPreviewFromFile(nextFile);
    setIsToolMenuOpen(false);
    event.target.value = "";
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
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
      setIsToolMenuOpen(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error opening chatbot camera:", error);
      setCameraError(t("upload.cameraAccessError"));
      setIsCameraOpen(false);
    }
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

        const capturedFile = new File([blob], `chatbot-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setCameraError("");
        setPreviewFromFile(capturedFile);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const clearSelectedImage = () => {
    if (selectedImagePreview && selectedImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImageFile(null);
    setSelectedImagePreview("");
    setCameraError("");
  };

  const clearChatHistory = () => {
    setChatSessions((previousSessions) => {
      const remainingSessions = previousSessions.filter(
        (session) => session.id !== activeSession.id
      );

      if (remainingSessions.length === 0) {
        const fallbackSession = createNewSession();
        setActiveSessionId(fallbackSession.id);
        return [fallbackSession];
      }

      setActiveSessionId(remainingSessions[0].id);
      return remainingSessions;
    });
  };

  const analyzeImage = async () => {
    if (!selectedImageFile || isSending) {
      return;
    }

    const previewToSend = selectedImagePreview;
    const userMessage = {
      id: `user-image-${Date.now()}`,
      role: "user",
      content: t("chatbot.imagePrompt"),
      imageUrl: previewToSend,
    };
    const updatedMessages = [...messages, userMessage];
    updateActiveSession(updatedMessages);
    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedImageFile);

      let predictResponse = null;
      for (const endpoint of PREDICT_ENDPOINTS) {
        try {
          predictResponse = await axios.post(endpoint, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          break;
        } catch (error) {
          console.error(`Image prediction failed for ${endpoint}:`, error);
        }
      }

      if (!predictResponse?.data?.predictions?.length) {
        throw new Error("Image prediction unavailable");
      }

      const predictions = predictResponse.data.predictions;
      const primaryPrediction = predictions[0];
      const diseaseName = primaryPrediction[0];
      const confidence = (primaryPrediction[1] * 100).toFixed(0);

      let detailsResponse = null;
      for (const endpoint of DISEASE_INFO_ENDPOINTS) {
        try {
          detailsResponse = await axios.post(endpoint, {
            disease: diseaseName,
            severity: "Moderate",
            location: "",
          });
          break;
        } catch (error) {
          console.error(`Disease info failed for ${endpoint}:`, error);
        }
      }

      const detailText = detailsResponse?.data?.symptoms_care
        ? formatSymptomsCare(detailsResponse.data.symptoms_care)
        : "";

      const assistantReply = [
        `Based on the photo, this may be related to ${diseaseName}.`,
        `Confidence: ${confidence}%`,
        "",
        "Top possible conditions:",
        ...predictions.slice(0, 3).map((item) => `- ${item[0]} (${(item[1] * 100).toFixed(0)}%)`),
        detailText ? `\n${detailText}` : "",
        "",
        "Please consult a dermatologist for confirmation and prescription advice.",
      ]
        .filter(Boolean)
        .join("\n");

      updateActiveSession([
        ...updatedMessages,
        {
          id: `assistant-image-${Date.now()}`,
          role: "assistant",
          content: assistantReply,
        },
      ]);
      clearSelectedImage();
    } catch (error) {
      console.error("Chatbot image analysis error:", error);
      updateActiveSession([
        ...updatedMessages,
        {
          id: `assistant-image-error-${Date.now()}`,
          role: "assistant",
          content: t("chatbot.imageError"),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async (presetMessage) => {
    const nextMessage = (presetMessage ?? input).trim();
    if (!nextMessage || isSending) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: nextMessage,
    };

    const updatedMessages = [...messages, userMessage];
    updateActiveSession(updatedMessages);
    setInput("");
    setIsSending(true);

    try {
      let response = null;
      const payload = {
        message: nextMessage,
        history: updatedMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      };

      for (const endpoint of CHATBOT_ENDPOINTS) {
        try {
          response = await axios.post(endpoint, payload);
          break;
        } catch (requestError) {
          console.error(`Chatbot request failed for ${endpoint}:`, requestError);
        }
      }

      if (!response) {
        throw new Error("All chatbot endpoints failed");
      }

      updateActiveSession([
        ...updatedMessages,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.data.reply || t("chatbot.error"),
        },
      ]);
    } catch (error) {
      console.error("Chatbot error:", error);
      updateActiveSession([
        ...updatedMessages,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: createLocalResponse(nextMessage, updatedMessages),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chatbot-page">
      <div className="chatbot-shell">
        <div className="chatbot-header">
          <div>
            <h1>{t("chatbot.title")}</h1>
            <p>{t("chatbot.subtitle")}</p>
          </div>
        </div>

        <div className="chatbot-body">
          <aside className="chatbot-sidebar">
            <div className="chatbot-side-card">
              <div className="chatbot-side-header">
                <h3>{t("chatbot.yourChats")}</h3>
                <button
                  type="button"
                  className="chatbot-clear-history"
                  onClick={handleNewChat}
                >
                  {t("chatbot.newChat")}
                </button>
              </div>
              <div className="chatbot-search">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("chatbot.searchChats")}
                />
              </div>
              <div className="chatbot-saved-history">
                <div className="chatbot-side-subheader">
                  <h4>{t("chatbot.savedHistoryTitle")}</h4>
                  <button
                    type="button"
                    className="chatbot-clear-history secondary"
                    onClick={clearChatHistory}
                  >
                    {t("chatbot.clearHistory")}
                  </button>
                </div>
                {filteredSessions.length > 0 ? (
                  <div className="chatbot-saved-history-list">
                    {filteredSessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        className={`chatbot-saved-history-item session-button${
                          session.id === activeSession.id ? " active" : ""
                        }`}
                        onClick={() => setActiveSessionId(session.id)}
                      >
                        <span>{session.title}</span>
                        <small>
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="chatbot-saved-history-empty">{t("chatbot.savedHistoryEmpty")}</p>
                )}
              </div>
              <div className="chatbot-tip-list">
                {starterTips.map((tip) => (
                  <button
                    key={tip}
                    type="button"
                    className="chatbot-tip"
                    onClick={() => sendMessage(tip)}
                  >
                    {tip}
                  </button>
                ))}
              </div>
              <p className="chatbot-history-note">{t("chatbot.historySaved")}</p>
            </div>
          </aside>

          <section className="chatbot-main">
            <div className="chatbot-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${message.role === "user" ? "user" : "assistant"}`}
                >
                  <span className="chat-role">
                    {message.role === "user" ? t("chatbot.userLabel") : t("chatbot.botLabel")}
                  </span>
                  {message.imageUrl && (
                    <img src={message.imageUrl} alt="Chat upload" className="chat-message-image" />
                  )}
                  <p>{message.content}</p>
                </div>
              ))}

              {isSending && (
                <div className="chat-message assistant">
                  <span className="chat-role">{t("chatbot.botLabel")}</span>
                  <p>{t("chatbot.thinking")}</p>
                </div>
              )}
            </div>

            <form
              className="chatbot-input-row"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <div className="chatbot-composer">
                <div className="chatbot-tool-menu-wrapper">
                  <button
                    type="button"
                    className="chatbot-plus-button"
                    onClick={() => setIsToolMenuOpen((current) => !current)}
                    disabled={isSending}
                  >
                    +
                  </button>
                  {isToolMenuOpen && (
                    <div className="chatbot-tool-menu">
                      <label htmlFor="chatbot-image-upload" className="chatbot-tool-menu-item">
                        <span className="chatbot-tool-icon">📎</span>
                        <span>{t("chatbot.uploadImage")}</span>
                      </label>
                      <button
                        type="button"
                        className="chatbot-tool-menu-item"
                        onClick={startCamera}
                      >
                        <span className="chatbot-tool-icon">📷</span>
                        <span>{t("chatbot.takePhoto")}</span>
                      </button>
                    </div>
                  )}
                  <input
                    id="chatbot-image-upload"
                    type="file"
                    accept="image/*"
                    className="chatbot-file-input"
                    onChange={handleImageChange}
                  />
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={t("chatbot.placeholder")}
                />
                <button type="submit" disabled={isSending}>
                  {t("chatbot.send")}
                </button>
              </div>
              <p className="chatbot-input-help">{t("chatbot.inputHelp")}</p>
              {cameraError && <p className="chatbot-camera-error">{cameraError}</p>}
              {isCameraOpen && (
                <div className="chatbot-camera-panel">
                  <video ref={videoRef} autoPlay playsInline muted className="chatbot-camera-feed" />
                  <div className="chatbot-camera-actions">
                    <button type="button" className="chatbot-tool-button secondary" onClick={captureFromCamera}>
                      {t("chatbot.capturePhoto")}
                    </button>
                    <button type="button" className="chatbot-tool-button secondary" onClick={stopCamera}>
                      {t("upload.stopCamera")}
                    </button>
                  </div>
                </div>
              )}
              {selectedImagePreview && (
                <div className="chatbot-image-preview">
                  <img src={selectedImagePreview} alt="Selected skin preview" />
                  <div className="chatbot-image-preview-actions">
                    <button
                      type="button"
                      className="chatbot-tool-button secondary"
                      onClick={analyzeImage}
                      disabled={isSending}
                    >
                      {t("chatbot.analyzePhoto")}
                    </button>
                    <button
                      type="button"
                      className="chatbot-tool-button secondary"
                      onClick={clearSelectedImage}
                    >
                      {t("upload.removeImage")}
                    </button>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="chatbot-hidden-canvas" />
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;
