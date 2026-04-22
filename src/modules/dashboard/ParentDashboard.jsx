import { Container, Grid } from "@mui/material";
import DashboardCard from "./DashboardCard";

export default function ParentDashboard({ data }) {
  const dashboardItems = Array.isArray(data?.data) ? data.data : [];
  const firstChild = dashboardItems[0];
  const notifications = Array.isArray(data?.notifications?.items) ? data.notifications.items : [];
  const unreadNotifications = notifications.filter((n) => !n.is_acknowledged).length;
  const paymentSummary = data?.paymentSummary?.totals || {};

  const metrics = data?.metrics || firstChild?.metrics || {
    homework_pending: 0,
    exams_upcoming: 0,
    notifications_unread: unreadNotifications,
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 2 }}>
      {/* 
         If multi-child support is fully backend ready, we would toggle children here.
         For now assume aggregated or single primary child metrics.
      */}

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <DashboardCard
            title="Payments Bill"
            value={paymentSummary.totalDue ?? 0}
            subtitle="Total Due"
          />
        </Grid>

        <Grid item xs={6}>
          <DashboardCard
            title="Homework"
            value={metrics.homework_pending}
            subtitle="Pending"
          />
        </Grid>

        <Grid item xs={6}>
          <DashboardCard
            title="Balance"
            value={paymentSummary.totalBalance ?? 0}
            subtitle="Payment Due"
          />
        </Grid>

        <Grid item xs={6}>
          <DashboardCard
            title="Notifications"
            value={unreadNotifications || metrics.notifications_unread}
            subtitle="Unread"
          />
        </Grid>
      </Grid>
    </Container>
  );
}
