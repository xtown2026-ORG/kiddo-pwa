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
    <Box sx={{ display: "flex", flexDirection: "column", p: 2 }}>
      {messages.map((msg, index) => (
        <MessageBubble key={index} message={msg} userAvatar={userAvatar} />
      ))}
      <div ref={bottomRef} />
    </Box>
  );
}
