import { useState, useRef } from "react";
import { Send } from "@mui/icons-material";
import { Paper, InputBase, IconButton, useTheme, Fade } from "@mui/material";

export default function ChatInput({
  onSend,
  disabled,
  placeholder = "Type a message...",
  onInputFocus,
  startAdornment,
}) {
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const theme = useTheme();

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      // Focus back on input after sending
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: "4px 10px",
        display: 'flex',
        alignItems: 'center',
        width: "100%",
        minHeight: 46,
        borderRadius: "999px",
        overflow: "hidden",
        boxSizing: "border-box",
        bgcolor: "#ffffff",
        border: "1px solid #e5e9f1",
        boxShadow: "0 3px 10px rgba(15, 23, 42, 0.12)",
        transition: 'box-shadow 0.2s ease',
        '&:focus-within': {
          boxShadow: `0 4px 14px ${theme.palette.primary.main}33`,
        }
      }}
    >
      {startAdornment || null}

      <InputBase
        inputRef={inputRef}
        sx={{
          ml: startAdornment ? 1 : 2,
          flex: 1,
          color: theme.palette.text.primary,
          fontSize: { xs: 15, sm: 15 },
          lineHeight: 1.4,
          "& .MuiInputBase-input": {
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }}
        placeholder={placeholder}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        onFocus={onInputFocus}
        disabled={disabled}
      />

      <Fade in={!!message.trim()}>
        <IconButton
          color="primary"
          size="small"
          sx={{ p: "6px", touchAction: "manipulation" }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleSend();
          }}
          onTouchStart={(event) => {
            event.stopPropagation();
          }}
          disabled={disabled || !message.trim()}
          aria-label="Send message"
        >
          <Send />
        </IconButton>
      </Fade>
    </Paper>
  );
}
