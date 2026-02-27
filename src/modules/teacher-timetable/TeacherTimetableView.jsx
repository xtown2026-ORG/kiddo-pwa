import { Box, Typography, Paper, Stack } from "@mui/material";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export default function TeacherTimetableView({ timetable }) {
  return DAYS.map((day) => {
    const periods = timetable?.[day] || [];

    if (!periods.length) return null;

    return (
      <Box key={day} sx={{ mb: 3 }}>
        <Typography variant="h6">{day.toUpperCase()}</Typography>

        <Stack spacing={1} sx={{ mt: 1 }}>
          {periods.map((p) => (
            <Paper key={p.id} sx={{ p: 2 }}>
              <Typography fontWeight={600}>
                {p.subject?.name || p.title || "Period"}
              </Typography>

              <Typography variant="caption">
                {p.class?.class_name || p.Class?.class_name || `Class ${p.class_id}`} -{" "}
                {p.section?.name || p.Section?.name || `Section ${p.section_id}`}
              </Typography>

              <Typography variant="caption" display="block">
                {p.start_time} - {p.end_time}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  });
}
