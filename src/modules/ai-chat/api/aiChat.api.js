import api from "../../../api/axios";

export function askAiQuestion(payload, language) {
  return api.post(
    "/rag/ask",
    {
      question: payload?.question,
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
