import {
  Container,
  CircularProgress,
  Alert,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useAttendance } from "./useAttendance";
import AttendanceSummary from "./AttendanceSummary";
import AttendanceCalendar from "./AttendanceCalendar";

export default function AttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().startOf("month"));

  const filters = useMemo(() => {
    const from_date = selectedMonth.startOf("month").format("YYYY-MM-DD");
    const to_date = selectedMonth.endOf("month").format("YYYY-MM-DD");
    return { from_date, to_date };
  }, [selectedMonth]);

  const { summary, details, loading, error } = useAttendance(filters);

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
    <Container maxWidth="sm" sx={{ mt: 4, pb: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h6">Attendance</Typography>

        {summary && <AttendanceSummary summary={summary} />}

        <AttendanceCalendar
          details={details}
          month={selectedMonth}
          onMonthChange={setSelectedMonth}
          monthsBack={6}
        />
      </Stack>
    </Container>
  );
}
