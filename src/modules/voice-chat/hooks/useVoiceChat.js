import { useState } from "react";
import { askAi, askAiVoice } from "../api/voiceChat.api";
import { useAudioPlayback } from "./useAudioPlayback";

export function useVoiceChat({ classLevel }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { play, playing } = useAudioPlayback();

  async function send(text) {
    setMessages((p) => [...p, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await askAi(text, classLevel);
      const aiText = res.data?.answer;

      if (aiText) {
        setMessages((p) => [...p, { role: "ai", text: aiText }]);
      }

      // Optional voice response: backend streams audio for the same prompt
      try {
        const audioRes = await askAiVoice(text, classLevel);
        play(audioRes.data);
      } catch {
        // Ignore TTS failures to keep chat responsive
      }
    } finally {
      setLoading(false);
    }
  }

  return {
    messages,
    send,
    loading,
    speaking: playing,
  };
}
