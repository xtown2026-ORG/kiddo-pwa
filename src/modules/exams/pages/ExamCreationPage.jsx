import { Typography, Paper, TextField, Button, Box, Grid, MenuItem, Alert, CircularProgress, Snackbar, Container } from "@mui/material";
import { Add } from "@mui/icons-material";
import { useState, useEffect, useMemo } from "react";
import api from "../../../api/axios";
import DatePickerField from "../../../components/DatePickerField";
import { createNotification } from "../../notifications/notifications.api";

const createExam = (data) => api.post("/exams", data);
const fetchAssignments = () => api.get("/teacher-assignments/teacher/me");

export default function ExamCreationPage() {
    const [loading, setLoading] = useState(false);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);
    const [assignments, setAssignments] = useState([]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        start_date: "",
        end_date: "",
        class_id: "",
    });

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                setAssignmentsLoading(true);
                const res = await fetchAssignments();
                const data = res?.data?.data ?? res?.data ?? [];
                if (!active) return;
                setAssignments(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load assignments", err);
                if (!active) return;
                setAssignments([]);
            } finally {
                if (active) setAssignmentsLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const classOptions = useMemo(() => {
        const map = new Map();
        assignments.forEach((a) => {
            const classId = a.class_id;
            const className = a.Class?.class_name || a.class?.class_name || a.class_id;
            if (!map.has(classId)) {
                map.set(classId, { class_id: classId, class_name: className });
            }
        });
        return Array.from(map.values());
    }, [assignments]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError("");
            await createExam({
                name: formData.name,
                class_id: Number(formData.class_id),
                start_date: formData.start_date,
                end_date: formData.end_date,
            });

            // Send notification to students
            try {
                await createNotification({
                    title: `New Exam: ${formData.name}`,
                    message: `An exam has been scheduled from ${new Date(formData.start_date).toLocaleDateString()} to ${new Date(formData.end_date).toLocaleDateString()}.`,
                    target_role: "student",
                    class_id: Number(formData.class_id),
                });
            } catch (notifErr) {
                console.warn("Failed to send notification, but exam was created", notifErr);
            }
            setSuccess(true);
            setFormData({
                name: "",
                start_date: "",
                end_date: "",
                class_id: "",
            });
        } catch (err) {
            console.error("Failed to create exam", err);
            setError("Failed to create exam");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
            <Box sx={{ width: "100%" }}>
                <Typography variant="h5" sx={{ mb: { xs: 2, md: 4 }, fontWeight: 'bold', fontSize: { xs: '1.5rem', md: '2rem' } }}>
                    Create New Exam
                </Typography>

                <Paper
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, width: "100%", boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                >
                    <Grid container spacing={2}>
                        {error && (
                            <Grid item xs={12}>
                                <Alert severity="error" variant="outlined">{error}</Alert>
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Exam Name"
                                name="name"
                                placeholder="e.g., Mid-Term Mathematics"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <DatePickerField
                                label="Start Date"
                                value={formData.start_date}
                                onChange={(val) =>
                                    setFormData((prev) => ({ ...prev, start_date: val }))
                                }
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <DatePickerField
                                label="End Date"
                                value={formData.end_date}
                                onChange={(val) =>
                                    setFormData((prev) => ({ ...prev, end_date: val }))
                                }
                                minDate={formData.start_date || undefined}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                select
                                required
                                label="Class"
                                name="class_id"
                                value={formData.class_id}
                                onChange={handleChange}
                                disabled={assignmentsLoading}
                                fullWidth
                                slotProps={{
                                    select: {
                                        displayEmpty: true,
                                        renderValue: (selected) => {
                                            if (!selected) return "Select your class";
                                            const match = classOptions.find(
                                                (c) => String(c.class_id) === String(selected)
                                            );
                                            return match ? `Class ${match.class_name}` : `Class ${selected}`;
                                        },
                                    },
                                }}
                                InputLabelProps={{ shrink: true }}
                                sx={{ width: "100%", "& .MuiInputBase-root": { width: "100%" } }}
                            >
                                {assignmentsLoading && (
                                    <MenuItem value="">
                                        <CircularProgress size={18} sx={{ mr: 1 }} />
                                        Loading classes...
                                    </MenuItem>
                                )}
                                {!assignmentsLoading && classOptions.length === 0 && (
                                    <MenuItem value="">
                                        No assigned classes
                                    </MenuItem>
                                )}
                                {classOptions.map((c) => (
                                    <MenuItem key={c.class_id} value={c.class_id}>
                                        Class {c.class_name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12}>
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                size="large"
                                disabled={loading || !formData.class_id}
                                startIcon={<Add />}
                                sx={{ mt: 2 }}
                            >
                                {loading ? "Creating..." : "Schedule Exam"}
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
                <Snackbar
                    open={success}
                    autoHideDuration={2500}
                    onClose={() => setSuccess(false)}
                    anchorOrigin={{ vertical: "top", horizontal: "center" }}
                >
                    <Alert severity="success" onClose={() => setSuccess(false)} variant="filled" sx={{ width: '100%', boxShadow: 3 }}>
                        Exam created!
                    </Alert>
                </Snackbar>
            </Box>
        </Container>
    );
}
