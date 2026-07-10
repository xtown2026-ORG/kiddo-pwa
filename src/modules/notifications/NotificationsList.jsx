import { Grid, Box } from "@mui/material";
import NotificationItem from "./NotificationItem";

export default function NotificationsList({
  items,
  onAcknowledge,
}) {
  return (
    <Grid container spacing={3} alignItems="stretch">
      {items.map((item) => (
        <Grid item xs={12} key={item.id} sx={{ display: 'flex' }}>
          <Box sx={{ width: '100%' }}>
            <NotificationItem
              item={item}
              onAcknowledge={onAcknowledge}
            />
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
