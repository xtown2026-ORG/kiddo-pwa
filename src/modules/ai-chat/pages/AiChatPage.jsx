import { Box, useTheme, Zoom, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Typography, Divider, Button } from "@mui/material";
import { SmartToy, VolumeUp, Mic, Menu as MenuIcon, ChatBubbleOutline } from "@mui/icons-material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAiChat } from "../hooks/useAiChat";
import ChatList from "../components/ChatList";
import ChatInput from "../components/ChatInput";
import { useAuth } from "../../../auth/AuthProvider";

const QUIZ_REDIRECT_THRESHOLD = 30;

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
    encodeURI("/gif/Gendle Hi.mp4"),
    encodeURI("/gif/Friendly hi.mp4"),
    encodeURI("/gif/HI.mp4"),
    encodeURI("/gif/Listining.mp4"),
    encodeURI("/gif/Teaching.mp4"),
    encodeURI("/gif/Deep Thinging.mp4"),
    encodeURI("/gif/Deep Listining.mp4"),
    encodeURI("/gif/Thinging (2).mp4"),
  ];
  const { user } = useAuth();
  const theme = useTheme();
  const pageBg = "#ffffff";
  const [showIntro, setShowIntro] = useState(true);
  const [introClipIndex, setIntroClipIndex] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const messagesScrollRef = useRef(null);
  const previousUserCountRef = useRef(0);
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
    sendMessage,
    loadConversation,
    startNewChat,
  } = useAiChat({
    classLevel,
    userId: user?.id,
  });

  const userMessageCount = useMemo(
    () => messages.filter((message) => message?.role === "user").length,
    [messages]
  );

  async function handleSendMessage(text) {
    if (showIntro) setShowIntro(false);
    return sendMessage(text);
  }

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
      {/* Menu / History Button */}
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

      {/* History Drawer */}
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
                    secondary={`${conv.messages?.length || 0} messages`}
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Drawer>

      {/* Robot full-body intro video — fills screen like a background */}
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
            src={introClips[introClipIndex]}
            onError={() => {
              if (introClipIndex !== 2) setIntroClipIndex(2);
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
            pb: "calc(80px + env(safe-area-inset-bottom))",
          }}
        >
          <ChatList messages={messages} userAvatar={user?.avatar_url} />

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

      {/* Fixed input bar at bottom */}
      <Box
        sx={{
          px: 2,
          pt: 1,
          pb: 2,
          bgcolor: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "calc(58px + env(safe-area-inset-bottom))",
          zIndex: 3,
          width: "100%",
          maxWidth: 720,
          mx: "auto",
        }}
      >
        <ChatInput
          onSend={handleSendMessage}
          disabled={loading}
          placeholder="Type a question..."
          placeholderEndAdornment={<Mic fontSize="small" />}
          placeholderEndAriaLabel="Voice input"
          startAdornment={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
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
