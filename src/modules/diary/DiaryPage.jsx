import { useMemo, useState } from "react";
import {
  Container,
  CircularProgress,
  Alert,
  Typography,
  Card,
  CardContent,
  Box,
  Stack,
  Button,
  Fab,
  Grid
} from "@mui/material";
import { Assignment, Add } from "@mui/icons-material";
import { useDiary } from "./useDiary";
import { useAuth } from "../../auth/AuthProvider";
import CreateHomeworkDialog from "./CreateHomeworkDialog";
import DatePickerField from "../../components/DatePickerField";
import { useParentChild } from "../parents/ParentChildContext";

export default function DiaryPage() {
  const { user } = useAuth();
  const { selectedChild } = useParentChild();
  const today = new Date().toISOString().split("T")[0];
  const [filterDate, setFilterDate] = useState(today);
  const filters = useMemo(() => {
    const next = filterDate ? { date: filterDate } : {};
    if (user?.role === "parent" && selectedChild?.id) {
      next.student_id = selectedChild.id;
      next.class_id = selectedChild.classId;
      next.section_id = selectedChild.sectionId;
    }
    return next;
  }, [filterDate, selectedChild?.id, selectedChild?.classId, selectedChild?.sectionId, user?.role]);

  const { items, loading, error, refresh } = useDiary(filters);
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = user?.role === "teacher" || user?.role === "school_admin";

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
    <Container maxWidth="sm" sx={{ mt: 3, pb: 10 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        My Diary
      </Typography>
      {user?.role === "parent" && selectedChild?.name ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Viewing diary for {selectedChild.name}
        </Typography>
      ) : null}

      <Stack spacing={2} sx={{ mb: 2 }}>
        <DatePickerField
          label="Given date"
          value={filterDate}
          onChange={setFilterDate}
        />
        {filterDate && (
          <Button variant="outlined" onClick={() => setFilterDate("")}>
            Clear date filter
          </Button>
        )}
      </Stack>

      {!Array.isArray(items) || items.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 5, color: 'text.secondary' }}>
          <Assignment sx={{ fontSize: 60, opacity: 0.5, mb: 2 }} />
          <Typography>No homework assigned yet!</Typography>
        </Box>
      ) : (
        Object.entries(
          items.reduce((acc, item) => {
            const raw =
              item.homework_date ||
              item.due_date ||
              item.created_at ||
              item.createdAt ||
              "unknown";
            const dateKey =
              raw === "unknown"
                ? "unknown"
                : new Date(raw).toISOString().split("T")[0];
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(item);
            return acc;
          }, {})
        ).map(([dateKey, dayItems]) => (
          <Box key={dateKey} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              {dateKey === "unknown"
                ? "No date"
                : new Date(dateKey).toLocaleDateString()}
            </Typography>
            <Grid container spacing={2}>
              {dayItems.map((item) => {
                const subjectName =
                  item.Subject?.name ||
                  item.subject?.name ||
                  item.subject ||
                  "Subject";
                const dueDate = item.homework_date || item.due_date || "";
                const className =
                  item.Class?.class_name ||
                  item.class?.class_name ||
                  item.class?.name ||
                  "";
                const sectionName =
                  item.Section?.name ||
                  item.section?.name ||
                  "";

                return (
                  <Grid item xs={12} key={item.id}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                          <Box>
                            <Typography variant="subtitle2" color="primary" fontWeight="bold">
                              {subjectName}
                            </Typography>
                            {(className || sectionName) && (
                              <Typography variant="body2" color="text.secondary">
                                {[className, sectionName].filter(Boolean).join(" ")}
                              </Typography>
                            )}
                          </Box>
                          {dueDate && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                            >
                              Due {new Date(dueDate).toLocaleDateString()}
                            </Typography>
                          )}
                        </Stack>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {item.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))
      )}

      {canCreate && (
        <>
          <Box sx={{ position: 'fixed', bottom: 80, right: 16, zIndex: 1000 }}>
            <Fab color="primary" onClick={() => setShowCreate(true)}>
              <Add />
            </Fab>
          </Box>

          <CreateHomeworkDialog
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
