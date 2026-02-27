import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, Button, Paper, Avatar, List, ListItem, ListItemAvatar, ListItemText, Stack } from "@mui/material";
import { EmojiEvents } from "@mui/icons-material";
import { getQuizLeaderboard } from "../api/quiz.api";
import { useAuth } from "../../../auth/AuthProvider";

export default function QuizResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await getQuizLeaderboard(id);
        setLeaderboard(res.data || []);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [id]);

  const myEntry =
    leaderboard.find((p) => p.User?.id === user?.id) || null;
  const myScore = myEntry?.score ?? 0;

  const isTeacher = location.pathname.startsWith("/teacher");
  const isStudentDemo = location.pathname.startsWith("/students");
  const backPath = isTeacher ? "/teacher/quiz" : isStudentDemo ? "/students/quiz" : "/student/quiz";

  return (
    <Box sx={{ p: 3, mt: 4, textAlign: 'center' }}>
      <Paper sx={{ p: 4, borderRadius: 4 }}>
        <EmojiEvents sx={{ fontSize: 60, color: '#FFD700', mb: 2 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Game Over!
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mt: 2, mb: 3 }}>
          <Avatar src={user?.avatar_url}>
            {user?.name?.[0] || "U"}
          </Avatar>
          <Box sx={{ textAlign: "left" }}>
            <Typography fontWeight="bold">{user?.name || "You"}</Typography>
            <Typography variant="body2" color="text.secondary">
              Your score: {myScore}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 4, mb: 4, textAlign: 'left' }}>
          <Typography variant="h6" gutterBottom>Leaderboard</Typography>
          <List>
            {leaderboard.map((player, idx) => (
              <ListItem key={player.User?.id || idx} secondaryAction={
                <Typography variant="h6" fontWeight="bold">{player.score}</Typography>
              }>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'grey.300' }}>
                    {idx + 1}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={player.User?.name || "Player"} />
              </ListItem>
            ))}
          </List>
        </Box>

        <Button variant="contained" fullWidth onClick={() => navigate(backPath)}>
          Back to Quiz Menu
        </Button>
      </Paper>
    </Box>
  );
}
