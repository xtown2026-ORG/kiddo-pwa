import { Stack } from "@mui/material";
import DiaryItem from "./DiaryItem";

export default function DiaryList({ items }) {
  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <DiaryItem key={item.id} item={item} />
      ))}
    </Stack>
  );
}
