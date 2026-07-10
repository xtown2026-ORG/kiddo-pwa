import {
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Avatar,
  Box,
} from "@mui/material";
import { Circle } from "@mui/icons-material";
import { useAuth } from "../../auth/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";

export default function NotificationItem({
  item,
  onAcknowledge,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMine = user && String(item.sender_user_id) === String(user.id);
  
  // Format the date nicely (e.g., "Jul 15, 2026, 10:30 AM")
  const dateVal = item.createdAt || item.created_at;
  const createdAt = dateVal
    ? new Date(dateVal).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
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

  const isProfileRequest = item.title === "Profile Update Request";

  const isUnread = !item.is_acknowledged;

  const handleNotificationClick = () => {
    // Acknowledge if unread
    if (isUnread && onAcknowledge) {
      onAcknowledge(item.id);
    }

    const title = (item.title || "").toLowerCase();
    
    const basePath =
      user.role === "student"
        ? location.pathname.startsWith("/students")
          ? "/students"
          : "/student"
        : user.role === "teacher"
          ? "/teacher"
          : "/parent";

    // Redirect based on title
    if (title.includes("profile update") || title.includes("request")) {
      navigate(`${basePath}/approvals`);
    } else if (title.includes("exam")) {
      navigate(`${basePath}/timetable`);
    } else if (title.includes("homework")) {
      navigate(`${basePath}/diary`);
    } else if (title.includes("report")) {
      navigate(`${basePath}/report-cards`);
    } else if (title.includes("quiz")) {
      navigate(`${basePath}/quiz`);
    } else {
      navigate(`${basePath}/dashboard`);
    }
  };

  return (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 3,
        border: '1px solid',
        borderColor: isUnread ? 'primary.light' : '#e2e8f0',
        bgcolor: isUnread ? '#f8faff' : '#ffffff',
        cursor: "pointer",
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
            borderColor: 'primary.main',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            transform: 'translateY(-2px)'
        }
      }}
      onClick={handleNotificationClick}
    >
      <CardContent sx={{ p: '20px !important', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2} sx={{ flexGrow: 1 }}>
          
          {/* Header Row: Avatar, Name, Date, Unread Dot */}
          <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={senderAvatar}
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: isUnread ? "primary.main" : "grey.400",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {senderInitial}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} color="#1e293b" lineHeight={1.2}>
                  {senderName}
                </Typography>
                {createdAt && (
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {createdAt}
                  </Typography>
                )}
              </Box>
            </Stack>

            {/* Unread Indicator Dot */}
            {isUnread && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Circle sx={{ fontSize: 12, color: 'primary.main' }} />
              </Box>
            )}
          </Stack>

          {/* Content Row: Title and Message */}
          <Box sx={{ pl: 0 }}>
            <Typography variant="h6" fontWeight={700} color="#0f172a" fontSize="1.05rem" gutterBottom>
              {item.title}
            </Typography>
            <Typography variant="body2" color="#475569" sx={{ lineHeight: 1.6 }}>
              {item.message}
            </Typography>
          </Box>

          {/* Footer Row: Actions */}
          {isMine && (
            <Stack
              direction="row"
              justifyContent="flex-start"
              alignItems="center"
              sx={{ pl: 0, pt: 1, mt: 'auto !important' }}
            >
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, bgcolor: 'primary.50', px: 1.5, py: 0.5, borderRadius: 1 }}>
                Sent by you
              </Typography>
            </Stack>
          )}

        </Stack>
      </CardContent>
    </Card>
  );
}
