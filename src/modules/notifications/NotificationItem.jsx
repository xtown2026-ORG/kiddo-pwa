import {
  Paper,
  Typography,
  Stack,
  Button,
  Avatar,
  Box,
} from "@mui/material";
import { useAuth } from "../../auth/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function NotificationItem({
  item,
  onAcknowledge,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMine = user && String(item.sender_user_id) === String(user.id);
  const createdAt = item.created_at
    ? new Date(item.created_at).toLocaleString()
    : null;

  const senderName =
    item?.sender?.name ||
    (item?.sender_role === "school_admin" ? "School Admin" : "Teacher");

  const senderAvatar =
    item?.sender_role === "school_admin"
      ? item?.school?.logo_url || ""
      : item?.sender?.avatar_url || "";

  const senderInitial =
    item?.sender_role === "school_admin"
      ? "S"
      : senderName?.[0]?.toUpperCase() || "U";

  const handleNotificationClick = () => {
    if (item.title === "Profile Update Request") {
      navigate(`/teacher/approvals?user_id=${item.sender_user_id}`);
    }
  };

  return (
    <Paper 
      sx={{ 
        p: 2, 
        cursor: item.title === "Profile Update Request" ? "pointer" : "default",
        '&:hover': item.title === "Profile Update Request" ? { bgcolor: 'action.hover' } : {}
      }}
      onClick={handleNotificationClick}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Avatar
            src={senderAvatar}
            sx={{
              width: 34,
              height: 34,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontSize: 14,
            }}
          >
            {senderInitial}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={600} noWrap>
              {senderName}
            </Typography>
            {createdAt && (
              <Typography variant="caption" color="text.secondary">
                {createdAt}
              </Typography>
            )}
          </Box>
        </Stack>

        <Typography fontWeight={600}>
          {item.title}
        </Typography>

        <Typography variant="body2">
          {item.message}
        </Typography>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          {isMine && (
            <Typography variant="caption" color="text.secondary">
              Sent by you
            </Typography>
          )}
          {!item.is_acknowledged && (
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(item.id);
              }}
            >
              Mark as Read
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
