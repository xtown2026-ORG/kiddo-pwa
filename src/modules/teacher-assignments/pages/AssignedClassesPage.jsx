import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Box,
  Divider,
} from "@mui/material";
import { School, Book, Star } from "@mui/icons-material";
import { getMyTeacherAssignments } from "../../teacher-timetable/teacherTimetable.api";

export default function AssignedClassesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await getMyTeacherAssignments();
        const data = res?.data?.data ?? res?.data?.items ?? [];
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError("Failed to load assignments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    items.forEach((a) => {
      const className = a.Class?.class_name || a.class?.class_name || a.class_id;
      const sectionName = a.Section?.name || a.section?.name || a.section_id;
      const key = `${className}-${sectionName}`;
      if (!map.has(key)) {
        map.set(key, {
          className,
          sectionName,
          isClassTeacher: false,
          subjects: new Map(),
        });
      }
      const entry = map.get(key);
      if (a.is_class_teacher) entry.isClassTeacher = true;
      const subjectName = a.Subject?.name || a.subject?.name || "Subject";
      entry.subjects.set(a.subject_id || subjectName, subjectName);
    });
    return Array.from(map.values());
  }, [items]);

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
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Assigned Classes
      </Typography>

      {grouped.length === 0 ? (
        <Alert severity="info">
          No assignments found. Ask the school admin to assign your classes and
          subjects.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {grouped.map((g) => (
            <Card key={`${g.className}-${g.sectionName}`} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <School color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Class {g.className} - {g.sectionName}
                  </Typography>
                </Stack>

                {g.isClassTeacher && (
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      icon={<Star />}
                      label="Class Teacher"
                      color="success"
                      size="small"
                    />
                  </Box>
                )}

                <Divider sx={{ my: 1.5 }} />

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Array.from(g.subjects.values()).map((subject) => (
                    <Chip
                      key={subject}
                      icon={<Book />}
                      label={subject}
                      variant="outlined"
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
