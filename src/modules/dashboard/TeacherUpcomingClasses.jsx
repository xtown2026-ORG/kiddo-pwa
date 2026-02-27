import { Card, CardContent, Typography, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { getMyTeacherTimetable } from "../teacher-timetable/teacherTimetable.api";
import { useAuth } from "../../auth/AuthProvider";

export default function TeacherUpcomingClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (user?.role !== "teacher") return;
    load();
  }, [user?.role]);

  async function load() {
    try {
      const today = new Date().toLocaleString("en-US", { weekday: "long" }).toLowerCase();
      const res = await getMyTeacherTimetable();
      const grouped = res.data?.data || res.data || {};
      setClasses(grouped[today] || []);
    } catch (error) {
      console.error("Failed to load teacher upcoming classes", error);
      setClasses([]);
    }
  }

  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600}>
          Todays Classes
        </Typography>

        <Stack spacing={1} sx={{ mt: 2 }}>
          {classes.length === 0 && (
            <Typography color="text.secondary">
              No classes today
            </Typography>
          )}

          {classes.map((c) => (
            <Typography key={c.id}>
              {c.start_time} - {c.end_time} | Section {c.section?.name ?? c.section_id}
            </Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
