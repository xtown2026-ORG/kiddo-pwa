import { useState } from "react";
import {
  Container,
  CircularProgress,
  Alert,
  Typography,
  Box,
  Button,
  Stack,
  Card,
  CardContent
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { useTeacherTimetable } from "./useTeacherTimetable";
import TeacherTimetableView from "./TeacherTimetableView";
import ManageTimetableDialog from "./ManageTimetableDialog";
import { useTeacherAssignments } from "./useTeacherAssignments";

export default function TeacherTimetablePage() {
  const { timetable, loading, error, refresh } = useTeacherTimetable();
  const { classTeacherSections, loading: assignmentsLoading } = useTeacherAssignments();
  const [showManage, setShowManage] = useState(false);

  const canManage = (classTeacherSections?.length || 0) > 0;

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

  const hasPeriods = timetable && !Array.isArray(timetable)
    ? Object.values(timetable).some((day) => Array.isArray(day) && day.length > 0)
    : Array.isArray(timetable) && timetable.length > 0;

  return (
    <Container maxWidth="sm" sx={{ mt: 4, pb: 10 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        My Timetable
      </Typography>

      {hasPeriods ? (
        <TeacherTimetableView timetable={timetable} />
      ) : (
        <Typography color="text.secondary">
          No timetable available yet.
        </Typography>
      )}

      {canManage && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography fontWeight={600}>Manage Section Timetable</Typography>
                <Typography variant="body2" color="text.secondary">
                  You are a class teacher and can update your section timetable.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => setShowManage(true)}
                disabled={assignmentsLoading}
              >
                Manage
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <ManageTimetableDialog
        open={showManage}
        onClose={() => setShowManage(false)}
        onSuccess={() => {
          refresh?.();
        }}
        classTeacherSections={classTeacherSections}
      />
    </Container>
  );
}
