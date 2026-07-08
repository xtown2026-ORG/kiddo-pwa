import { Box, Button, CircularProgress } from "@mui/material";
import MessageBubble from "./MessageBubble";
import { useEffect, useRef } from "react";

export default function ChatList({
  messages,
  userAvatar,
  ragAnswerLoadingByMessageId = {},
  onRagAnswerMode,
}) {
  const bottomRef = useRef(null);
  const prevLenRef = useRef(0);

  useEffect(() => {
    const isFirstPaint = prevLenRef.current === 0;
    const behavior = isFirstPaint ? "auto" : "smooth";

    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    });

    prevLenRef.current = messages.length;
    return () => cancelAnimationFrame(id);
  }, [messages]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", p: 2, minWidth: 0, overflowX: "hidden" }}>
      {messages.map((msg, index) => (
        <Box key={index} sx={{ minWidth: 0 }}>
          <MessageBubble message={msg} userAvatar={userAvatar} />
          {shouldShowRagAnswerControls(msg) ? (
            <RagAnswerControls
              message={msg}
              loadingMode={ragAnswerLoadingByMessageId[msg.id] || ""}
              onSelectMode={onRagAnswerMode}
            />
          ) : null}
        </Box>
      ))}
      <div ref={bottomRef} />
    </Box>
  );
}

function shouldShowRagAnswerControls(message) {
  return (
    (message?.role === "ai" || message?.role === "assistant") &&
    message?.metadata?.ragAnswerControls === true &&
    message?.metadata?.originalQuestion
  );
}

function RagAnswerControls({ message, loadingMode, onSelectMode }) {
  const isLoading = Boolean(loadingMode);

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
        ml: { xs: 5.75, sm: 5.75 },
        mt: -1,
        mb: 2,
      }}
    >
      <Button
        size="small"
        variant="outlined"
        disabled={isLoading}
        onClick={() => onSelectMode?.(message, "short")}
        startIcon={loadingMode === "short" ? <CircularProgress size={14} /> : null}
        sx={{ borderRadius: 999, textTransform: "none" }}
      >
        {loadingMode === "short" ? "Loading..." : "Short Answer"}
      </Button>
      <Button
        size="small"
        variant="outlined"
        disabled={isLoading}
        onClick={() => onSelectMode?.(message, "brief")}
        startIcon={loadingMode === "brief" ? <CircularProgress size={14} /> : null}
        sx={{ borderRadius: 999, textTransform: "none" }}
      >
        {loadingMode === "brief" ? "Loading..." : "Brief Answer"}
      </Button>
    </Box>
  );
}
