import { Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { ProtectedAppWrapper } from "./ProtectedAppWrapper";
import ParentSidebar from "../components/ParentSidebar";

/* pages */
import DashboardPage from "../modules/dashboard/DashboardPage";
import ProfilePage from "../modules/profile/ProfilePage";
import TimetablePage from "../modules/timetable/TimetablePage";
import DiaryPage from "../modules/diary/DiaryPage";
import NotificationsPage from "../modules/notifications/NotificationsPage";
import ReportCardPage from "../modules/report-card/ReportCardPage";
import GroupChatPage from "../modules/group-chat/GroupChatPage";
import GroupChatRoomPage from "../modules/group-chat/GroupChatRoomPage";
import ThemePage from "../modules/theme/ThemePage";
import ParentPaymentsPage from "../modules/payments/ParentPaymentsPage";
import FoundationStagePage from "../modules/foundation-stage/FoundationStagePage";
import FoundationModulePage from "../modules/foundation-stage/FoundationModulePage";
import ParentAssignedTestsPage from "../modules/ai-tests/ParentAssignedTestsPage";

export default function ParentApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setSidebarOpen(true);
    window.addEventListener("toggle-parent-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-parent-sidebar", handleToggle);
  }, []);

  return (
    <ProtectedAppWrapper>
      <Box
        sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <AppHeader />

        <ParentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <Box sx={{ flex: 1, pb: 7, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="diary" element={<DiaryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="payments" element={<ParentPaymentsPage />} />
            <Route path="ai-tests" element={<ParentAssignedTestsPage />} />
            <Route path="report-cards/:id" element={<ReportCardPage />} />
            <Route path="group-chat" element={<GroupChatPage />} />
            <Route path="group-chat/:id" element={<GroupChatRoomPage />} />
            <Route path="foundation-stage" element={<FoundationStagePage />} />
            <Route path="foundation-stage/:moduleId" element={<FoundationModulePage />} />
            <Route path="themes" element={<ThemePage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </Box>

        <BottomNav />
      </Box>
    </ProtectedAppWrapper>
  );
}
