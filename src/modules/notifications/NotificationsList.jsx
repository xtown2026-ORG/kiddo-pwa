import { Stack } from "@mui/material";
import NotificationItem from "./NotificationItem";

export default function NotificationsList({
  items,
  onAcknowledge,
}) {
  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <NotificationItem
          key={item.id}
          item={item}
          onAcknowledge={onAcknowledge}
        />
      ))}
    </Stack>
  );
}
