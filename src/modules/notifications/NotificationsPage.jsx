import { useState } from "react";
import {
  Container,
  CircularProgress,
  Alert,
  Typography,
  Fab,
  Box
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useNotifications } from "./useNotifications";
import NotificationsList from "./NotificationsList";
import CreateNotificationDialog from "./CreateNotificationDialog";
import { useAuth } from "../../auth/AuthProvider";
import ParentChildSwitcher from "../parents/ParentChildSwitcher";
import { useParentChild } from "../parents/ParentChildContext";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { selectedChild } = useParentChild();
  const {
    items,
    loading,
    error,
    acknowledge,
    refresh // Now available
  } = useNotifications(
    user?.role === "parent" && selectedChild?.id
      ? { student_id: selectedChild.id }
      : {}
  );

  const [showCreate, setShowCreate] = useState(false);

  const canCreate = user?.role === "teacher" || user?.role === "admin";

  if (loading) {
    return (
      <Container sx={{ mt: 6, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 6 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, pb: 10 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#1e293b' }}>
        Notifications
      </Typography>
      {user?.role === "parent" ? <ParentChildSwitcher label="Student" /> : null}

      {items && items.filter(item => !item.is_acknowledged).length > 0 ? (
        <NotificationsList
          items={items.filter(item => !item.is_acknowledged)}
          onAcknowledge={acknowledge}
        />
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          No new notifications.
        </Typography>
      )}

      {canCreate && (
        <>
          <Box sx={{ position: 'fixed', bottom: 80, right: 16, zIndex: 1000 }}>
            <Fab color="primary" onClick={() => setShowCreate(true)}>
              <Add />
            </Fab>
          </Box>

          <CreateNotificationDialog
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onSuccess={() => {
              if (refresh) refresh();
            }}
          />
        </>
      )}
    </Container>
  );
}
