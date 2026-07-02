import api from "../../../api/axios";

export function askAiQuestion(payload, language) {
  return api.post(
    "/rag/ask",
    {
      question: payload?.question,
      subject: payload?.subject ?? null,
      classLevel: payload?.classLevel,
      language: language || payload?.language,
      preferredLanguage: payload?.preferredLanguage,
      lang: payload?.lang,
    },
    {
      headers: language
        ? {
            "X-Chat-Language": String(language),
          }
        : undefined,
    }
  );
}

export function askAiImageQuestion({ image, question }) {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("question", question);

  return api.post("/rag/image-question", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

export function askAiFollowup(payload) {
  return api.post("/ai-chat/followup", {
    originalQuestion: payload?.originalQuestion,
    previousAnswer: payload?.previousAnswer,
    followupType: payload?.followupType,
  });
}

export function listAiChatConversations(params = {}) {
  return api.get("/ai-chat/conversations", { params });
}

export function getAiChatConversation(conversationId) {
  return api.get(`/ai-chat/conversations/${conversationId}`);
}

export function getAiChatMessages(conversationId, params = {}) {
  return api.get(`/ai-chat/conversations/${conversationId}/messages`, { params });
}

export function syncAiChatConversations(conversations = []) {
  return api.post("/ai-chat/conversations/sync", { conversations });
}

export function upsertAiChatConversation(conversation) {
  return api.post("/ai-chat/conversations", conversation);
}

export function deleteAiChatConversation(conversationId) {
  return api.delete(`/ai-chat/conversations/${conversationId}`);
}

export function restoreAiChatConversation(conversationId) {
  return api.post(`/ai-chat/conversations/${conversationId}/restore`);
}
