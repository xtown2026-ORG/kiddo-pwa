import { Paper, Typography, Stack } from "@mui/material";

export default function DiaryItem({ item }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={0.5}>
        <Typography fontWeight={600}>
          {item.title}
        </Typography>

        <Typography variant="body2">
          {item.description}
        </Typography>

        <Typography variant="caption">
          Due: {item.due_date}
        </Typography>
      </Stack>
    </Paper>
  );
}
