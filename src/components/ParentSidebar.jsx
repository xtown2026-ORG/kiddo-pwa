import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, Divider, IconButton } from "@mui/material";
import {
  Book,
  ReceiptLong,
  CalendarMonth,
  Person,
  Close,
  Palette,
  Logout,
  AccountBalanceWallet,
  AutoAwesome,
  Insights,
  Science,
  Terminal,
  TravelExplore,
  SportsEsports,
} from "@mui/icons-material";
import { useAuth } from "../auth/AuthProvider";
import { Link, useNavigate } from "react-router-dom";

export default function ParentSidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { label: "Diary", icon: <Book />, path: "/parent/diary" },
    { label: "Report Cards", icon: <ReceiptLong />, path: "/parent/report-cards" },
    { label: "Timetable", icon: <CalendarMonth />, path: "/parent/timetable" },
    { label: "Payments", icon: <AccountBalanceWallet />, path: "/parent/payments" },
    { label: "Foundation Hub (6-7)", icon: <AutoAwesome />, path: "/parent/foundation-stage" },
    { label: "Logical Thinking & Aptitude", icon: <Insights />, path: "/parent/foundation-stage/logical-thinking-aptitude" },
    { label: "Basic Science Exploration", icon: <Science />, path: "/parent/foundation-stage/basic-science-exploration" },
    { label: "Intro to Coding", icon: <Terminal />, path: "/parent/foundation-stage/intro-to-coding" },
    { label: "General Knowledge Builder", icon: <TravelExplore />, path: "/parent/foundation-stage/general-knowledge-builder" },
    { label: "Gamified Learning System", icon: <SportsEsports />, path: "/parent/foundation-stage/gamified-learning-system" },
    { label: "Themes", icon: <Palette />, path: "/parent/themes" },
    { label: "Profile", icon: <Person />, path: "/parent/profile" },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 280,
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
          display: "flex",
          flexDirection: "column",
        }
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight="bold">Menu</Typography>
        <IconButton onClick={onClose}><Close /></IconButton>
      </Box>

      <Link to="/parent/profile" onClick={onClose} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        <Box sx={{ px: 2, mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar src={user?.avatar_url || ""} sx={{ width: 48, height: 48, bgcolor: "primary.main" }}>
            {user?.name?.[0]}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">Parent</Typography>
          </Box>
        </Box>
      </Link>

      <Divider />

      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton onClick={() => handleNavigate(item.path)}>
              <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mt: 1 }} />

      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>

      <Box sx={{ px: 2, pb: 2, pt: 1, display: "flex", justifyContent: "center" }}>
        <Box
          component="img"
          src="/xtown%20logo.jpg"
          alt="xtown logo"
          sx={{ width: 120, maxWidth: "100%", height: "auto", objectFit: "contain" }}
        />
      </Box>
    </Drawer>
  );
}
