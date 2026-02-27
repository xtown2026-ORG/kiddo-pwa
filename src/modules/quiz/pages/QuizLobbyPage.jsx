import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, Button, Paper, Avatar, Stack, CircularProgress } from "@mui/material";
import { useQuizSession } from "../hooks/useQuizSession";

export default function QuizLobbyPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { status, player, isHost, startQuiz } = useQuizSession(id);

    useEffect(() => {
        if (status === "IN_PROGRESS") {
            const isTeacher = location.pathname.startsWith("/teacher");
            const isStudentDemo = location.pathname.startsWith("/students");
            const base = isTeacher ? "/teacher" : isStudentDemo ? "/students" : "/student";
            navigate(`${base}/quiz/${id}/play`, { replace: true });
        }
    }, [status, id, navigate, location.pathname]);

    return (
        <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
            <Paper sx={{ p: 4, borderRadius: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Lobby
                </Typography>
                <Typography variant="h2" color="primary" sx={{ my: 3, letterSpacing: 4, fontWeight: 'bold' }}>
                    {id}
                </Typography>
                <Typography color="text.secondary">
                    Share this code with your friends!
                </Typography>

                <Box sx={{ my: 4 }}>
                    <Typography variant="h6" gutterBottom>Players Joined</Typography>
                    {/* In a real app, we'd list all players from socket */}
                    <Stack direction="row" justifyContent="center" spacing={2}>
                        {player && player.playerId ? (
                            <Avatar>{player?.name?.[0] || "?"}</Avatar>
                        ) : isHost ? (
                            <Typography variant="body2" color="primary">You are hosting this quiz.</Typography>
                        ) : null}
                    </Stack>
                </Box>

                {isHost ? (
                    <Button variant="contained" size="large" fullWidth onClick={startQuiz}>
                        Start Game
                    </Button>
                ) : (
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                        <CircularProgress size={20} />
                        <Typography>Waiting for host to start...</Typography>
                    </Stack>
                )}
            </Paper>
        </Box>
    );
}
