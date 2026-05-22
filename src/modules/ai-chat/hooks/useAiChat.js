import { useEffect, useMemo, useState } from "react";
import { askAiImageQuestion, askAiQuestion } from "../api/aiChat.api";

export function useAiChat({ classLevel, userId }) {
  const historyKey = useMemo(
    () => `ai_chat_conversations_${userId || "guest"}_${classLevel || "general"}`,
    [userId, classLevel]
  );

  const [conversations, setConversations] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(historyKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [messages, setMessages] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(historyKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setConversations(Array.isArray(parsed) ? parsed : []);
    } catch {
      setConversations([]);
    }
  }, [historyKey]);

  function persistConversations(next) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(historyKey, JSON.stringify(next.slice(0, 50)));
    } catch {
      // Ignore storage failures (private mode, quota, etc.)
    }
  }

  function getConversationTitle(msgs) {
    const firstUser = msgs.find((m) => m.role === "user" && typeof m.text === "string");
    const raw = (firstUser?.text || "New Chat").trim();
    return raw.length > 60 ? `${raw.slice(0, 57)}...` : raw;
  }

  function saveConversation(nextMessages) {
    const now = new Date().toISOString();
    const convId =
      activeConversationId || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      id: convId,
      title: getConversationTitle(nextMessages),
      updatedAt: now,
      createdAt: now,
      messages: nextMessages.slice(-200),
    };

    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === convId);
      let next = prev;

      if (idx >= 0) {
        const existing = prev[idx];
        const updated = {
          ...existing,
          ...payload,
          createdAt: existing.createdAt || payload.createdAt,
        };
        next = [...prev];
        next[idx] = updated;
      } else {
        next = [payload, ...prev];
      }

      next.sort(
        (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
      persistConversations(next);
      return next;
    });

    if (!activeConversationId) {
      setActiveConversationId(convId);
    }
  }

  async function sendMessage(text, preferredLanguage = null, sendOptions = {}) {
    const options =
      preferredLanguage && typeof preferredLanguage === "object"
        ? preferredLanguage
        : sendOptions;
    const language =
      preferredLanguage && typeof preferredLanguage === "string"
        ? preferredLanguage
        : null;
    const selectedImage = options?.image || null;

    const userMsg = {
      role: "user",
      text,
      imagePreviewUrl: options?.imagePreviewUrl,
      imageName: options?.imageName,
      timestamp: new Date(),
    };

    setMessages((prev) => {
      const next = [...prev, userMsg];
      // Persist immediately so no message is lost even if app closes before AI reply.
      saveConversation(next);
      return next;
    });
    setLoading(true);

    try {
      const res = selectedImage
        ? await askAiImageQuestion({
            image: selectedImage,
            question: text,
          })
        : await askAiQuestion(
            {
              question: text,
              classLevel,
              language: language || undefined,
              preferredLanguage: language || undefined,
              lang: language || undefined,
            },
            language || undefined
          );

      const answerText =
        res?.data?.answer ??
        res?.answer ??
        res?.data?.message ??
        "AI assistant is temporarily unavailable. Please try again.";

      const aiMsg = {
        role: "ai",
        text: String(answerText),
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const next = [...prev, aiMsg];
        saveConversation(next);
        return next;
      });

      return aiMsg.text; // IMPORTANT: for voice mode
    } catch (error) {
      const isUnauthorized = error?.response?.status === 401;
      const fallbackText =
        isUnauthorized
          ? "Session required for AI. Please login again and retry."
          : selectedImage
          ? "Unable to read the uploaded image right now. Please try again."
          : "AI assistant is temporarily unavailable. Please try again.";

      const aiMsg = {
        role: "ai",
        text: fallbackText,
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const next = [...prev, aiMsg];
        saveConversation(next);
        return next;
      });
      return aiMsg.text;
    } finally {
      setLoading(false);
    }
  }

  return {
    messages,
    conversations,
    activeConversationId,
    loading,
    sendMessage,
    startNewChat: () => {
      setMessages([]);
      setActiveConversationId(null);
    },
    loadConversation: (conversationId) => {
      const found = conversations.find((c) => c.id === conversationId);
      if (!found) return;
      setMessages(Array.isArray(found.messages) ? found.messages : []);
      setActiveConversationId(found.id);
    },
  };
}
