import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Badge,
} from "@mui/material";
import { Notifications } from "@mui/icons-material";
import { useAuth } from "../auth/AuthProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "../modules/notifications/useNotifications";

export default function AppHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useNotifications();
  const unreadCount = items?.filter?.((n) => !n.is_acknowledged)?.length || 0;
  const demoStudentRoute = location.pathname.startsWith("/students");

  const basePath =
    user?.role === "student"
      ? demoStudentRoute
        ? "/students"
        : "/student"
      : user?.role === "teacher"
        ? "/teacher"
        : "/parent";

  function handleProfileClick() {
    if (!user) return;
    if (user.role === "teacher") {
      window.dispatchEvent(new Event("toggle-teacher-sidebar"));
      return;
    }
    if (user.role === "student") {
      window.dispatchEvent(new Event("toggle-student-sidebar"));
      return;
    }
    if (user.role === "parent") {
      window.dispatchEvent(new Event("toggle-parent-sidebar"));
      return;
    }
    navigate(`${basePath}/profile`);
  }

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar sx={{ display: "flex", gap: 2 }}>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
          kiddoshadow
        </Typography>
        {user && (
          <>
            <IconButton
              size="small"
              onClick={() => navigate(`${basePath}/notifications`)}
              sx={{ mr: 1, color: "text.primary" }}
              aria-label="Notifications"
            >
              <Badge color="error" badgeContent={unreadCount || 0} overlap="circular">
                <Notifications />
              </Badge>
            </IconButton>

            <IconButton
              size="small"
              onClick={handleProfileClick}
              sx={{
                p: 0,
                mr: 1,
              }}
              aria-label="Open profile"
            >
              <Avatar
                src={user?.avatar_url || ""}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  fontSize: 14,
                }}
              >
                {user.name?.[0]?.toUpperCase() ||
                  user.role?.[0]?.toUpperCase() ||
                  "U"}
              </Avatar>
            </IconButton>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
