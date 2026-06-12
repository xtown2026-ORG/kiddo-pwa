import { Box, useTheme, Zoom, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Typography, Divider, Button, TextField, InputAdornment, Chip } from "@mui/material";
import { Add, Close, SmartToy, VolumeUp, Mic, Menu as MenuIcon, ChatBubbleOutline, Search } from "@mui/icons-material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAiChat } from "../hooks/useAiChat";
import ChatList from "../components/ChatList";
import ChatInput from "../components/ChatInput";
import { useAuth } from "../../../auth/AuthProvider";
import deepListeningClip from "../../../assets/gif/deep-listening.mp4";
import deepThinkingClip from "../../../assets/gif/deep-thinking.mp4";
import friendlyHiClip from "../../../assets/gif/friendly-hi.mp4";
import gentleHiClip from "../../../assets/gif/gentle-hi.mp4";
import hiClip from "../../../assets/gif/hi.mp4";
import listeningClip from "../../../assets/gif/listening.mp4";
import teachingClip from "../../../assets/gif/teaching.mp4";
import thinkingClip from "../../../assets/gif/thinking.mp4";

const QUIZ_REDIRECT_THRESHOLD = 30;
const CHAT_INPUT_DOCK_HEIGHT = 96;
const CHAT_INPUT_DOCK_EXPANDED_HEIGHT = 220;
const CHAT_FOOTER_SAFE_GAP = 28;
const DEMO_FOLLOWUP_SUGGESTIONS = [
  { label: "Explain with Example", followupType: "example", isVisual: false },
  { label: "Step by Step", followupType: "step_by_step", isVisual: false },
  { label: "Explain Picture", followupType: "picture", isVisual: true },
  { label: "Short Summary", followupType: "short_summary", isVisual: false },
];

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeSuggestion(item, fallbackQuestion, fallbackAnswer) {
  if (!item?.label || !item?.followupType) return null;

  return {
    label: item.label,
    followupType: item.followupType,
    isVisual: item.followupType === "picture",
    originalQuestion: item.originalQuestion || fallbackQuestion,
    previousAnswer: item.previousAnswer || fallbackAnswer,
  };
}

function isEligibleFollowupTarget(message) {
  if (message?.role !== "ai") return false;
  if (message?.metadata?.source === "ai-followup") return true;
  return Array.isArray(message?.metadata?.followupSuggestions) && message.metadata.followupSuggestions.length > 0;
}

function getFollowupContext(messages = [], aiIndex = -1) {
  if (aiIndex < 0 || !messages[aiIndex] || messages[aiIndex]?.role !== "ai") return null;

  const aiMessage = messages[aiIndex];
  const previousAnswer = normalizeWhitespace(
    aiMessage?.metadata?.previousAnswer || aiMessage.text || aiMessage.content || ""
  );
  if (!previousAnswer) return null;

  const directOriginalQuestion = normalizeWhitespace(aiMessage?.metadata?.originalQuestion || "");
  if (directOriginalQuestion) {
    const serverSuggestions = Array.isArray(aiMessage?.metadata?.followupSuggestions)
      ? aiMessage.metadata.followupSuggestions
      : [];
    const suggestions = (serverSuggestions.length ? serverSuggestions : DEMO_FOLLOWUP_SUGGESTIONS)
      .map((item) => normalizeSuggestion(item, directOriginalQuestion, previousAnswer))
      .filter(Boolean)
      .slice(0, 4);

    return {
      aiIndex,
      originalQuestion: directOriginalQuestion,
      previousAnswer,
      suggestions,
    };
  }

  for (let index = aiIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;

    const originalQuestion = normalizeWhitespace(
      message?.metadata?.originalQuestion || message.text
    );
    if (!originalQuestion) continue;

    const serverSuggestions = Array.isArray(aiMessage?.metadata?.followupSuggestions)
      ? aiMessage.metadata.followupSuggestions
      : [];
    const suggestions = (serverSuggestions.length ? serverSuggestions : DEMO_FOLLOWUP_SUGGESTIONS)
      .map((item) => normalizeSuggestion(item, originalQuestion, previousAnswer))
      .filter(Boolean)
      .slice(0, 4);

    return {
      aiIndex,
      originalQuestion,
      previousAnswer,
      suggestions,
    };
  }

  return null;
}

function deriveQuizTopic(messages = []) {
  const userMessages = messages
    .filter((message) => message?.role === "user" && typeof message?.text === "string")
    .map((message) => message.text.trim())
    .filter(Boolean);

  if (!userMessages.length) return "General Knowledge";

  const latestDetailedMessage =
    [...userMessages].reverse().find((text) => text.length >= 12) ||
    userMessages[userMessages.length - 1];

  return latestDetailedMessage.length > 80
    ? `${latestDetailedMessage.slice(0, 77).trim()}...`
    : latestDetailedMessage;
}

export default function AiChatPage() {
  const introClips = [
    gentleHiClip,
    friendlyHiClip,
    hiClip,
    listeningClip,
    teachingClip,
    deepThinkingClip,
    deepListeningClip,
    thinkingClip,
  ];
  const { user } = useAuth();
  const theme = useTheme();
  const pageBg = "#ffffff";
  const [showIntro, setShowIntro] = useState(true);
  const [introClipIndex, setIntroClipIndex] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const messagesScrollRef = useRef(null);
  const previousUserCountRef = useRef(0);
  const imageInputRef = useRef(null);
  const createdImageUrlsRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const classLevel = user?.class_level ?? "general";
  const openVoiceChat = () => {
    navigate(location.pathname.replace("/ai-chat", "/voice-chat"));
  };

  const {
    messages,
    conversations,
    loading,
    historyLoading,
    historyHasMore,
    historyQuery,
    sendMessage,
    sendFollowup,
    loadConversation,
    startNewChat,
    loadMoreConversations,
    setHistoryQuery,
  } = useAiChat({
    classLevel,
    userId: user?.id,
  });

  const userMessageCount = useMemo(
    () => messages.filter((message) => message?.role === "user").length,
    [messages]
  );
  const latestFollowupContext = useMemo(() => {
    if (loading) return null;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role !== "ai") continue;
      const context = getFollowupContext(messages, index);
      if (context?.suggestions?.length) return context;
      return null;
    }
    return null;
  }, [loading, messages]);
  const chatInputDockHeight =
    selectedImages.length > 0
      ? CHAT_INPUT_DOCK_EXPANDED_HEIGHT
      : CHAT_INPUT_DOCK_HEIGHT;
  const messagesBottomPadding = `calc(${chatInputDockHeight + CHAT_FOOTER_SAFE_GAP}px + env(safe-area-inset-bottom))`;

  async function handleSendMessage(text) {
    if (showIntro) setShowIntro(false);
    const selectedImage = selectedImages[0] || null;
    const reply = await sendMessage(
      text,
      null,
      selectedImage
        ? {
            image: selectedImage.file,
            imagePreviewUrl: selectedImage.previewUrl,
            imageName: selectedImage.name,
          }
        : {}
    );
    clearSelectedImages({ revoke: false });
    return reply;
  }

  async function handleFollowUpClick(suggestion) {
    if (!suggestion || loading) return;

    await sendFollowup({
      label: suggestion.label,
      originalQuestion: suggestion.originalQuestion,
      previousAnswer: suggestion.previousAnswer,
      followupType: suggestion.followupType,
    });
  }

  function handleImageUpload(event) {
    const file = Array.from(event.target.files || []).find((item) =>
      item.type.startsWith("image/")
    );
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    createdImageUrlsRef.current.push(previewUrl);
    setSelectedImages((prev) => {
      prev.forEach((image) => revokeImagePreview(image.previewUrl));
      return [
        {
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
          file,
          name: file.name,
          previewUrl,
        },
      ];
    });
    event.target.value = "";
  }

  function removeSelectedImage(imageId) {
    setSelectedImages((prev) => {
      const image = prev.find((item) => item.id === imageId);
      if (image?.previewUrl) revokeImagePreview(image.previewUrl);
      return prev.filter((item) => item.id !== imageId);
    });
  }

  function clearSelectedImages({ revoke = true } = {}) {
    setSelectedImages((prev) => {
      if (revoke) {
        prev.forEach((image) => revokeImagePreview(image.previewUrl));
      }
      return [];
    });
  }

  function revokeImagePreview(previewUrl) {
    if (!previewUrl) return;
    URL.revokeObjectURL(previewUrl);
    createdImageUrlsRef.current = createdImageUrlsRef.current.filter((url) => url !== previewUrl);
  }

  useEffect(() => {
    return () => {
      createdImageUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      createdImageUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const scroller = messagesScrollRef.current;
    if (!scroller) return;
    const id = requestAnimationFrame(() => {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, loading]);

  useEffect(() => {
    const previousCount = previousUserCountRef.current;
    previousUserCountRef.current = userMessageCount;

    if (userMessageCount < QUIZ_REDIRECT_THRESHOLD || previousCount >= QUIZ_REDIRECT_THRESHOLD) {
      return;
    }

    const quizTopic = deriveQuizTopic(messages);
    const basePath = location.pathname.startsWith("/students") ? "/students" : "/student";

    navigate(`${basePath}/quiz/single`, {
      state: {
        prefilledTopic: quizTopic,
        autoStart: true,
        source: "ai-chat",
      },
    });
  }, [location.pathname, messages, navigate, userMessageCount]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
        minHeight: 0,
        bgcolor: pageBg,
        overflow: "hidden",
        position: "relative",
        overscrollBehavior: "none",
      }}
    >
      <IconButton
        onClick={() => setIsHistoryOpen(true)}
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          bgcolor: "rgba(255,255,255,0.85)",
          boxShadow: 1,
          zIndex: 4,
          backdropFilter: "blur(4px)",
          color: "text.primary"
        }}
        aria-label="open chat history"
      >
        <MenuIcon />
      </IconButton>

      <Drawer
        anchor="left"
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        PaperProps={{
          sx: { width: 280, display: 'flex', flexDirection: 'column' }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ChatBubbleOutline color="primary" />
            <Typography variant="h6" fontWeight="bold">Chat History</Typography>
          </Box>
          <Button
            size="small"
            onClick={() => {
              startNewChat();
              setIsHistoryOpen(false);
            }}
          >
            New
          </Button>
        </Box>
        <Divider />
        <Box sx={{ p: 1.5 }}>
          <TextField
            value={historyQuery}
            onChange={(event) => setHistoryQuery(event.target.value)}
            placeholder="Search conversations"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Divider />
        <List sx={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
              <Typography variant="body2">No previous chats yet.</Typography>
            </Box>
          ) : (
            conversations.map((conv) => (
              <ListItem key={conv.id} disablePadding>
                <ListItemButton
                  onClick={() => {
                    loadConversation(conv.id);
                    setShowIntro(false);
                    setIsHistoryOpen(false);
                  }}
                >
                  <ListItemText
                    primary={conv.title || "New Chat"}
                    secondary={
                      conv.previewText
                        ? `${conv.previewText.slice(0, 52)}${conv.previewText.length > 52 ? "..." : ""} • ${conv.messageCount ?? conv.messages?.length ?? 0} messages`
                        : `${conv.messageCount ?? conv.messages?.length ?? 0} messages`
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
        {historyHasMore ? (
          <Box sx={{ p: 1.5 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={loadMoreConversations}
              disabled={historyLoading}
            >
              {historyLoading ? "Loading..." : "Load More"}
            </Button>
          </Box>
        ) : null}
      </Drawer>

      {showIntro && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            zIndex: 1,
            bgcolor: pageBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
  component="video"
  autoPlay
  loop
  muted
  playsInline
  preload="auto"
  src={introClips[introClipIndex]}
  onLoadedData={() => {
    console.log("VIDEO LOADED:", introClips[introClipIndex]);
  }}
  onError={(e) => {
    console.error("VIDEO ERROR:", introClips[introClipIndex], e);

    if (introClipIndex !== 2) {
      setIntroClipIndex(2);
    }
  }}
            sx={{
              width: "100%",
              height: "calc(100% - 80px)",
              objectFit: "contain",
              objectPosition: "center center",
              display: "block",
              bgcolor: pageBg,
            }}
          />
        </Box>
      )}

      {!showIntro && (
        <Box
          ref={messagesScrollRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            scrollBehavior: "smooth",
            display: "flex",
            flexDirection: "column",
            pb: messagesBottomPadding,
          }}
        >
          <ChatList
            messages={messages}
            userAvatar={user?.avatar_url}
            renderAfterMessage={(message, index) => {
              if (!latestFollowupContext?.suggestions?.length) return null;
              if (index !== latestFollowupContext.aiIndex) return null;
              if (!isEligibleFollowupTarget(message)) return null;

              return (
                <Box
                  sx={{
                    ml: { xs: 0, sm: 5.75 },
                    mb: 3.5,
                    mt: -0.5,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.75,
                    alignItems: "center",
                    maxWidth: { xs: "100%", sm: "calc(100% - 56px)" },
                    pr: 0.5,
                    overflow: "hidden",
                  }}
                >
                  {latestFollowupContext.suggestions.map((suggestion, suggestionIndex) => (
                    <Chip
                      key={`${suggestion.followupType}-${suggestion.label}-${suggestionIndex}`}
                      label={suggestion.label}
                      clickable
                      disabled={loading}
                      onClick={() => handleFollowUpClick(suggestion)}
                      variant="outlined"
                      size="small"
                      sx={{
                        height: 32,
                        borderRadius: "999px",
                        px: 0.4,
                        fontWeight: 600,
                        fontSize: 13,
                        maxWidth: "100%",
                        color: "#1f2937",
                        bgcolor: "rgba(255,255,255,0.94)",
                        borderColor: suggestion.isVisual ? "primary.main" : "rgba(15, 23, 42, 0.14)",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                        "& .MuiChip-label": {
                          px: 1.1,
                          whiteSpace: "normal",
                        },
                        "&:hover": {
                          bgcolor: "#ffffff",
                          borderColor: suggestion.isVisual ? "primary.main" : "rgba(15, 23, 42, 0.24)",
                        },
                      }}
                    />
                  ))}
                </Box>
              );
            }}
          />

          {loading && (
            <Box sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "center" }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: theme.palette.primary.main,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SmartToy sx={{ fontSize: 20, color: "white" }} />
              </Box>
              <Zoom in={true}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: theme.palette.background.paper,
                    borderRadius: 2,
                    borderBottomLeftRadius: 0,
                    boxShadow: 1,
                  }}
                >
                  <div className="typing-indicator">
                    <span>●</span><span>●</span><span>●</span>
                  </div>
                </Box>
              </Zoom>
            </Box>
          )}
        </Box>
      )}

      <Box
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 8,
          display: "flex",
          justifyContent: "center",
          px: { xs: 1.5, sm: 2 },
          pt: 1.25,
          pb: "calc(12px + env(safe-area-inset-bottom))",
          bgcolor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          borderTop: "1px solid rgba(226, 232, 240, 0.9)",
          boxShadow: "0 -10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <Box
          sx={{
            width: "min(calc(100% - 8px), 900px)",
            px: 0,
            pt: 0,
            bgcolor: "transparent",
            minHeight: chatInputDockHeight,
            display: "flex",
            flexDirection: "column",
          }}
        >
        {selectedImages.length > 0 && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mb: 1,
              overflowX: "auto",
              pb: 0.5,
              px: 1,
            }}
          >
            {selectedImages.map((image) => (
              <Box
                key={image.id}
                sx={{
                  position: "relative",
                  flex: "0 0 auto",
                  width: 58,
                  height: 58,
                  borderRadius: 1.5,
                  overflow: "hidden",
                  border: "1px solid #d8e0ec",
                  bgcolor: "#f8fafc",
                }}
              >
                <Box
                  component="img"
                  src={image.previewUrl}
                  alt={image.name}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <IconButton
                  size="small"
                  aria-label="Remove image"
                  onClick={() => removeSelectedImage(image.id)}
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 20,
                    height: 20,
                    p: 0,
                    color: "#ffffff",
                    bgcolor: "rgba(15, 23, 42, 0.72)",
                    "&:hover": {
                      bgcolor: "rgba(15, 23, 42, 0.86)",
                    },
                  }}
                >
                  <Close sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
        <ChatInput
          onSend={handleSendMessage}
          disabled={loading}
          placeholder="Type a question..."
          placeholderEndAdornment={<Mic fontSize="small" />}
          placeholderEndAriaLabel="Voice input"
          startAdornment={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageUpload}
              />
              <IconButton
                size="small"
                color="primary"
                aria-label="Upload image"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  imageInputRef.current?.click();
                }}
                onTouchStart={(event) => {
                  event.stopPropagation();
                }}
              >
                <Add />
              </IconButton>
              <IconButton
                size="small"
                color="primary"
                aria-label="Open voice chat"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openVoiceChat();
                }}
                onTouchStart={(event) => {
                  event.stopPropagation();
                }}
              >
                <VolumeUp />
              </IconButton>
            </Box>
          }
        />
        </Box>
      </Box>

      <style>{`
        .typing-indicator span {
          animation: blink 1.4s infinite both;
          font-size: 12px;
          margin: 0 1px;
          color: ${theme.palette.text.secondary};
        }
        .typing-indicator span:nth-of-type(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-of-type(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
    </Box>
  );
}
