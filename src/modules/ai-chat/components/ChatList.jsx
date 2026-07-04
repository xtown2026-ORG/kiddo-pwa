import { Box } from "@mui/material";
import MessageBubble from "./MessageBubble";
import { useEffect, useRef } from "react";

export default function ChatList({ messages, userAvatar }) {
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
        </Box>
      ))}
      <div ref={bottomRef} />
    </Box>
  );
}
