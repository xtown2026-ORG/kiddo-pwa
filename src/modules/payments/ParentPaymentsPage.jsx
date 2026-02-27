import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { getMyPaymentLogs } from "./payments.api";
import { useNotifications } from "../notifications/useNotifications";

const isPaymentNotification = (item) => {
  const haystack = `${item?.title || ""} ${item?.message || ""}`.toLowerCase();
  return haystack.includes("payment") || haystack.includes("fee");
};

export default function ParentPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [rows, setRows] = useState([]);
  const { items: notifications, loading: notificationsLoading } = useNotifications();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await getMyPaymentLogs();
        const data = res?.data?.data || {};
        setSummary(data?.totals || null);
        setSchoolInfo(data?.school || null);
        setRows(Array.isArray(data?.items) ? data.items : []);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load payment details");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const paymentNotifications = useMemo(
    () => (notifications || []).filter(isPaymentNotification).slice(0, 5),
    [notifications]
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={600}>School Payment Mode</Typography>
                <Chip
                  color="primary"
                  size="small"
                  label={(schoolInfo?.payment_mode || "Not Set").replace(/_/g, " ")}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Due</Typography>
              <Typography variant="h6">{summary?.totalDue ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Paid</Typography>
              <Typography variant="h6">{summary?.totalPaid ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Balance</Typography>
              <Typography variant="h6">{summary?.totalBalance ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Student Payment Status</Typography>
          <Stack spacing={1}>
            {rows.length === 0 && (
              <Typography color="text.secondary">No payment records available.</Typography>
            )}
            {rows.map((row) => (
              <Box key={row.studentId}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={600}>{row.studentName || "Student"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.class} - {row.section}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    color={row.paymentStatus === "Paid" ? "success" : "warning"}
                    label={`${row.paymentStatus} | Balance: ${row.balance ?? 0}`}
                  />
                </Stack>
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Payment Notifications</Typography>
          {notificationsLoading ? (
            <Typography color="text.secondary">Loading notifications...</Typography>
          ) : paymentNotifications.length ? (
            <Stack spacing={1}>
              {paymentNotifications.map((n) => (
                <Box key={n.id}>
                  <Typography fontWeight={600}>{n.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{n.message}</Typography>
                  <Divider sx={{ mt: 1 }} />
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary">No payment notifications found.</Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
