import { useEffect, useState } from "react";
import { Container, Paper, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, CircularProgress, Alert, Stack, Chip } from "@mui/material";
import { Visibility } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { listMyReportCards } from "./reportCard.api";
import api from "../../api/axios";

export default function ReportCardsList() {
    const [reportCards, setReportCards] = useState([]);
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const studentBasePath = location.pathname.startsWith("/students")
        ? "/students"
        : "/student";

    useEffect(() => {
        fetchReportCards();
    }, []);

    async function fetchReportCards() {
        try {
            setLoading(true);
            const [reportRes, examRes] = await Promise.all([
                listMyReportCards(),
                api.get("/exams"),
            ]);
            setReportCards(reportRes.data.data || []);
            setExams(examRes.data.items || []);
        } catch (err) {
            setError("Failed to load report cards.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Container sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
                My Exams & Report Cards
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}

            <Stack spacing={2}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                        Exams Schedule
                    </Typography>
                    {exams.length === 0 ? (
                        <Typography color="text.secondary">No exams scheduled yet.</Typography>
                    ) : (
                        <List>
                            {exams.map((exam, index) => (
                                <ListItem key={exam.id} divider={index < exams.length - 1}>
                                    <ListItemText
                                        primary={exam.name}
                                        secondary={`From ${new Date(exam.start_date).toLocaleDateString()} to ${new Date(exam.end_date).toLocaleDateString()}`}
                                    />
                                    {exam.is_locked && (
                                        <Chip size="small" label="Locked" color="warning" />
                                    )}
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>

                {reportCards.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">No report cards found.</Typography>
                    </Paper>
                ) : (
                    <Paper>
                        <List>
                            {reportCards.map((rc, index) => (
                                <ListItem
                                    key={rc.id}
                                    divider={index < reportCards.length - 1}
                                    button
                                    onClick={() => navigate(`${studentBasePath}/report-cards/${rc.id}`)}
                                >
                                    <ListItemText
                                        primary={rc.Exam?.name || "Exam Report"}
                                        secondary={`Date: ${new Date(rc.Exam?.date || rc.createdAt).toLocaleDateString()}`}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" onClick={() => navigate(`${studentBasePath}/report-cards/${rc.id}`)}>
                                            <Visibility />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </Stack>
        </Container>
    );
}
