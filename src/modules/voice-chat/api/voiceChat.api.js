import api from "../../../api/axios";
import { VOICE_SERVICE_URL } from "../../../api/config";

export function askAi(question, classLevel) {
  return api.post("/rag/ask", {
    question,
    classLevel,
  });
}

export function askAiVoice(question, classLevel) {
  return api.post(
    "/voice/chat",
    { question, classLevel },
    { responseType: "arraybuffer" }
  );
}

export function speakText(text) {
  return api.post(
    "/rag/speak",
    { text },
    { responseType: "arraybuffer" }
  );
}

export async function speakTextDirect(text) {
  if (!VOICE_SERVICE_URL) {
    throw new Error("VOICE_SERVICE_URL is not configured");
  }

  const res = await fetch(`${VOICE_SERVICE_URL}/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Voice service request failed (${res.status})`);
  }

  return res.arrayBuffer();
}
