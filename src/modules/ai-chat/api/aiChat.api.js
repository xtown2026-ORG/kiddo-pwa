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

export function askAiImageQuestion({ image, question, subject }) {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("question", question);
  if (subject) formData.append("subject", subject);

  return api.post("/rag/image-question", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}
