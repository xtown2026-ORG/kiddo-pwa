import { useState, useEffect, useRef } from "react";
import {
  Box,
  IconButton,
  Alert,
  Typography,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import ChatInput from "../../ai-chat/components/ChatInput";
import { askAiVoice } from "../api/voiceChat.api";
import { useAuth } from "../../../auth/AuthProvider";

const STATE_LABELS = {
  listening: "Listening...",
  thinking: "Thinking...",
  teaching: "Speaking...",
  hi: "Hello!",
};

export default function VoiceChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [robotState, setRobotState] = useState("listening");
  const [error, setError] = useState("");
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  useEffect(() => {
    const introTimer = setTimeout(() => setShowIntro(false), 1800);
    return () => {
      clearTimeout(introTimer);
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const playAudioBuffer = async (buffer) => {
    if (!buffer) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    const blob = new Blob([buffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onplay = () => {
      setRobotState("teaching");
    };
    audio.onended = () => {
      setRobotState("listening");
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
    audio.onerror = () => {
      setRobotState("listening");
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };

    await audio.play();
  };

  const handleVoiceQuery = async (text) => {
    if (!text || loading) return;
    setLoading(true);
    setError("");
    setRobotState("thinking");

    try {
      const audioRes = await askAiVoice(text, user?.class_level);
      await playAudioBuffer(audioRes?.data);
    } catch (err) {
      console.error("Voice chat failed:", err);
      setError("Voice response failed. Please check voice service/API.");
      setRobotState("listening");
    } finally {
      setLoading(false);
    }
  };

  const gifState = showIntro ? "hi" : robotState;

  const gifSrcMap = {
    hi: encodeURI("/gif/HI.mp4"),
    listening: encodeURI("/gif/Listining.mp4"),
    thinking: encodeURI("/gif/Thinging (2).mp4"),
    teaching: encodeURI("/gif/Teaching.mp4"),
  };

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        bgcolor: "#ffffff",
      }}
    >
      {/* Back button */}
      <IconButton
        onClick={() => navigate(-1)}
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          bgcolor: "rgba(255,255,255,0.9)",
          boxShadow: 2,
          zIndex: 10,
          backdropFilter: "blur(4px)",
          "&:hover": { bgcolor: "rgba(255,255,255,1)" },
        }}
      >
        <ArrowBack />
      </IconButton>

      {/* Robot GIF — fills available space above the input */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          pb: 0,
        }}
      >
        <Box
          component="video"
          key={gifSrcMap[gifState]}
          src={gifSrcMap[gifState]}
          autoPlay
          loop
          muted
          playsInline
          sx={{
            width: "100%",
            maxWidth: 480,
            height: "100%",
            objectFit: "contain",
            objectPosition: "center center",
            display: "block",
          }}
        />
      </Box>

      {/* State label */}
      <Box sx={{ textAlign: "center", pb: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            color: gifState === "thinking"
              ? "warning.main"
              : gifState === "teaching"
                ? "success.main"
                : "primary.main",
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
            fontSize: "0.7rem",
          }}
        >
          {STATE_LABELS[gifState] ?? ""}
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>{error}</Alert>
        </Box>
      )}

      {/* Input bar */}
      <Box
        sx={{
          px: 2,
          pb: "calc(12px + env(safe-area-inset-bottom))",
          pt: 1,
          bgcolor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <ChatInput
          onSend={(text) => handleVoiceQuery(text)}
          disabled={loading}
          placeholder="Type a question..."
        />
      </Box>
    </Box>
  );
}
