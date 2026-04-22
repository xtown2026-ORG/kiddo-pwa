import { Box, Typography, Button, Paper, Container, Grid, Card, CardContent, Chip, CircularProgress, Stack, ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from "@mui/material";
import { PlayArrow, Stop, Timer, Class, AccessTime, History } from "@mui/icons-material";
import { useState, useEffect, useMemo } from "react";
import { startClassSession, endClassSession, listClassSessions, markSessionAttendance, listStudentsBySection } from "../teacherSession.api";
import { useAuth } from "../../../auth/AuthProvider";
import { useTeacherTimetable } from "../../teacher-timetable/useTeacherTimetable";
import DatePickerField from "../../../components/DatePickerField";
import CreateHomeworkDialog from "../../diary/CreateHomeworkDialog";

export default function ClassSessionPage() {
    const { user } = useAuth();
    const { timetable, loading: timetableLoading } = useTeacherTimetable();

    const [activeSession, setActiveSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [sessions, setSessions] = useState([]);
    const [sessionLoading, setSessionLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState("today"); // today | yesterday | custom | all
    const [customDate, setCustomDate] = useState("");
    const [attendanceOpen, setAttendanceOpen] = useState(false);
    const [attendanceStudents, setAttendanceStudents] = useState([]);
    const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
    const [attendanceSessionId, setAttendanceSessionId] = useState(null);
    const [attendanceError, setAttendanceError] = useState("");
    const [attendanceMessage, setAttendanceMessage] = useState("");
    const [autoEndTriggered, setAutoEndTriggered] = useState(false);
    const [homeworkPrompt, setHomeworkPrompt] = useState(null);
    const [homeworkPromptOpen, setHomeworkPromptOpen] = useState(false);
    const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
    const [lastHomeworkSessionId, setLastHomeworkSessionId] = useState(null);
    const promptHomeworkForSession = createHomeworkPrompter(
        setHomeworkPrompt,
        setHomeworkPromptOpen,
        lastHomeworkSessionId,
        setLastHomeworkSessionId
    );

    // Timer effect
    useEffect(() => {
        let interval;
        if (activeSession) {
            interval = setInterval(() => {
                const sessionStart =
                    activeSession?.startTime ||
                    (activeSession?.started_at ? new Date(activeSession.started_at) : null);
                const scheduledEnd = resolveScheduledEnd(activeSession);
                if (sessionStart && scheduledEnd) {
                    const nowMs = Date.now();
                    const endMs = scheduledEnd.getTime();
                    if (nowMs >= endMs) {
                        const maxElapsed = Math.max(0, Math.floor((endMs - sessionStart.getTime()) / 1000));
                        setElapsedTime(maxElapsed);
                        if (!autoEndTriggered && !loading) {
                            setAutoEndTriggered(true);
                            handleEndById(activeSession.id);
                        }
                        return;
                    }
                    const nextElapsed = Math.max(0, Math.floor((nowMs - sessionStart.getTime()) / 1000));
                    setElapsedTime(nextElapsed);
                    return;
                }
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeSession, autoEndTriggered, loading]);

    useEffect(() => {
        if (!activeSession) setAutoEndTriggered(false);
    }, [activeSession]);

    useEffect(() => {
        if (user?.role !== "teacher") return;
        fetchSessions();
    }, [dateFilter, customDate, user?.role]);

    const filterDateValue = useMemo(() => {
        if (dateFilter === "today") return new Date();
        if (dateFilter === "yesterday") {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return d;
        }
        if (dateFilter === "custom" && customDate) return new Date(customDate);
        return null;
    }, [dateFilter, customDate]);

    const fetchSessions = async () => {
        if (user?.role !== "teacher") {
            setSessions([]);
            return;
        }
        try {
            setSessionLoading(true);
            const iso = filterDateValue
                ? filterDateValue.toISOString().slice(0, 10)
                : undefined;
            const res = await listClassSessions(iso);
            const items = res.data?.items || res.data || [];
            setSessions(items);

            if (!activeSession) {
                const ongoing = items.find((s) => !s.ended_at);
                if (ongoing) {
                    const startedAt = new Date(ongoing.started_at);
                    setActiveSession({
                        ...ongoing,
                        startTime: startedAt,
                    });
                    const scheduledEnd = resolveScheduledEnd(ongoing);
                    const endMs = scheduledEnd?.getTime?.();
                    const nowMs = Date.now();
                    const baseElapsed = Math.max(0, Math.floor((nowMs - startedAt.getTime()) / 1000));
                    const maxElapsed = endMs ? Math.max(0, Math.floor((endMs - startedAt.getTime()) / 1000)) : null;
                    setElapsedTime(maxElapsed !== null ? Math.min(baseElapsed, maxElapsed) : baseElapsed);
                }
            }
        } catch (err) {
            console.error("Failed to load sessions", err);
            setSessions([]);
        } finally {
            setSessionLoading(false);
        }
    };

    const handleStartClass = async (timetableEntry) => {
        try {
            setLoading(true);
            const classId = resolveClassId(timetableEntry);
            const sectionId = resolveSectionId(timetableEntry);
            const subjectId = resolveSubjectId(timetableEntry);
            const teacherAssignmentId = resolveTeacherAssignmentId(timetableEntry);
            const res = await startClassSession({
                timetable_id: timetableEntry.id,
                teacher_assignment_id: teacherAssignmentId,
                assignment_id: teacherAssignmentId,
                class_id: classId,
                section_id: sectionId,
                subject_id: subjectId
            });
            const started = res.data?.data || res.data;
            const startedSessionId = resolveSessionId(started) || resolveSessionId(res.data);
            setActiveSession({
                ...timetableEntry,
                ...started,
                id: startedSessionId || started?.id || timetableEntry?.id,
                startTime: new Date(started?.started_at || Date.now()),
            });
            setElapsedTime(0);
            setAutoEndTriggered(false);
            fetchSessions();
            openAttendance(started, timetableEntry);
        } catch (err) {
            console.error("Failed to start class", err);
            // In a real app, show toast error
        } finally {
            setLoading(false);
        }
    };

    const handleEndClass = async () => {
        if (!activeSession) return;
        try {
            setLoading(true);
            await endClassSession(activeSession.id);
            promptHomeworkForSession(activeSession);
            setActiveSession(null);
            setElapsedTime(0);
            fetchSessions();
        } catch (err) {
            console.error("Failed to end class", err);
        } finally {
            setLoading(false);
        }
    };

    const handleEndById = async (sessionId) => {
        if (!sessionId) return;
        try {
            setLoading(true);
            await endClassSession(sessionId);
            const endedSession =
                sessions.find((s) => resolveSessionId(s) === Number(sessionId)) ||
                (activeSession?.id === sessionId ? activeSession : null);
            if (endedSession) promptHomeworkForSession(endedSession);
            if (activeSession?.id === sessionId) {
                setActiveSession(null);
                setElapsedTime(0);
            }
            fetchSessions();
        } catch (err) {
            console.error("Failed to end class", err);
        } finally {
            setLoading(false);
        }
    };

    const openAttendance = async (sessionOrId, timetableEntry) => {
        const normalizedSessionId = resolveSessionId(sessionOrId);
        if (!normalizedSessionId || !timetableEntry) return;
        const sessionObj =
            typeof sessionOrId === "object"
                ? sessionOrId
                : sessions.find((s) => resolveSessionId(s) === normalizedSessionId) ||
                  (activeSession?.id === normalizedSessionId ? activeSession : null);
        const sessionExpired = isSessionExpiredByTime(sessionObj, timetableEntry);
        if (sessionExpired) {
            setAttendanceError("Attendance window closed (45 minutes passed).");
            setAttendanceStudents([]);
            setAttendanceOpen(true);
            return;
        }
        const classId = resolveClassId(timetableEntry);
        const sectionId = resolveSectionId(timetableEntry);
        if (!classId || !sectionId) {
            setAttendanceError("Class or section is missing for this timetable entry.");
            setAttendanceStudents([]);
            setAttendanceOpen(true);
            return;
        }
        try {
            setAttendanceError("");
            setAttendanceMessage("");
            setAttendanceOpen(true);
            setAttendanceSessionId(normalizedSessionId);
            const res = await listStudentsBySection(classId, sectionId);
            const students = res.data?.items || res.data || [];
            const unique = new Map();
            for (const s of students) {
                const isActive = s?.is_active !== false && s?.user?.is_active !== false;
                if (!isActive) continue;
                const id = resolveStudentId(s);
                if (!Number.isInteger(id) || id <= 0 || unique.has(id)) continue;
                unique.set(id, {
                    id,
                    name: (s.user?.name || s.name || s.user?.username || "").trim(),
                    username: s?.user?.username || "",
                    rollNo: s?.roll_no || "",
                    status: "present",
                });
            }
            setAttendanceStudents(
                [...unique.values()].sort((a, b) => {
                    const ra = Number(a.rollNo);
                    const rb = Number(b.rollNo);
                    if (Number.isFinite(ra) && Number.isFinite(rb)) return ra - rb;
                    return String(a.name).localeCompare(String(b.name));
                })
            );
        } catch (err) {
            console.error("Failed to load students", err);
            setAttendanceStudents([]);
            setAttendanceError(
                err?.response?.data?.message || err?.message || "Failed to load students"
            );
        }
    };

    const submitAttendance = async () => {
        try {
            setAttendanceError("");
            setAttendanceMessage("");
            setAttendanceSubmitting(true);
            const uniqueRecords = new Map();
            for (const s of attendanceStudents) {
                const studentId = resolveStudentId(s);
                if (!Number.isInteger(studentId) || studentId <= 0) continue;
                uniqueRecords.set(studentId, {
                    student_id: studentId,
                    status: String(s.status || "present").trim().toLowerCase().replace(/\s+/g, "_"),
                });
            }
            const records = [...uniqueRecords.values()];

            if (!attendanceSessionId || records.length === 0) {
                setAttendanceError("No valid students found to save attendance.");
                return;
            }
            const res = await markSessionAttendance(attendanceSessionId, records);
            setAttendanceMessage(res?.data?.message || "Attendance saved successfully.");
            setAttendanceOpen(false);
            setAttendanceSessionId(null);
            fetchSessions();
        } catch (err) {
            console.error("Failed to submit attendance", err);
            setAttendanceError(
                err?.response?.data?.message || err?.message || "Failed to save attendance"
            );
        } finally {
            setAttendanceSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatClock = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

    if (timetableLoading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
        
            {/* Active Session Card */}
            {activeSession ? (
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        bgcolor: 'primary.main',
                        color: 'white',
                        borderRadius: 4,
                        mb: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                        <Timer sx={{ fontSize: 200 }} />
                    </Box>

                    <Typography variant="overline" sx={{ letterSpacing: 2, opacity: 0.8 }}>
                        LIVE CLASS IN PROGRESS
                    </Typography>

                    <Typography variant="h2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatTime(elapsedTime)}
                    </Typography>

                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {activeSession.subject?.name || "Subject"}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                            Class {activeSession.class?.class_name || activeSession.class?.name} - {activeSession.section?.name}
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        color="error"
                        size="large"
                        startIcon={<Stop />}
                        onClick={handleEndClass}
                        disabled={loading}
                        sx={{ mt: 2, px: 4, py: 1.5, borderRadius: 2, bgcolor: 'error.main' }}
                    >
                        End Session
                    </Button>
                </Paper>
            ) : (
                <Box sx={{ mb: 4, p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                    <Typography variant="h6" color="text.secondary">
                      Select a scheduled class.
                    </Typography>
                </Box>
            )}

            {/* Timetable / Upcoming Classes */}
            <Typography variant="h6" sx={{ mb: 2 }}>
                Today's Schedule
            </Typography>

            {(() => {
                const todayKey = new Date().toLocaleString("en-US", { weekday: "long" }).toLowerCase();
                const todaySlots = Array.isArray(timetable)
                    ? timetable
                    : (timetable?.[todayKey] || []);

                const todaySessions = sessions.filter((s) => {
                    const d = new Date(s.started_at);
                    return d.toDateString() === new Date().toDateString();
                });

                return (
            <Grid container spacing={2}>
                {todaySlots?.map((entry) => {
                    const matchingSession = todaySessions.find(
                        (s) => s.timetable_id == entry.id && !s.ended_at
                    );
                    const activeSessionForEntry =
                        activeSession && activeSession.timetable_id == entry.id && !activeSession.ended_at
                            ? activeSession
                            : null;
                    const currentSession = matchingSession || activeSessionForEntry;
                    const isFinished = todaySessions.some(
                        (s) =>
                            s.timetable_id == entry.id ||
                            (s.class_id == entry.class_id &&
                                s.section_id == entry.section_id &&
                                s.subject_id == entry.subject_id &&
                                s.ended_at)
                    );

                    return (
                        <Grid item xs={12} sm={6} md={4} key={entry.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '4px solid #4f46e5' }}>
                                <CardContent sx={{ flex: 1 }}>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Chip
                                            icon={<AccessTime sx={{ fontSize: 16 }} />}
                                            label={`${entry.start_time} - ${formatTimeLabel(resolveEntryEndTime(entry) || entry.end_time)}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                        {entry.status === 'completed' && <Chip label="Done" color="success" size="small" />}
                                    </Box>

                                    <Typography variant="h6" gutterBottom>
                                        {entry.subject?.name}
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', mb: 2 }}>
                                        <Class fontSize="small" />
                                        <Typography variant="body2">
                                            Class {entry.class?.class_name || entry.class?.name} ({entry.section?.name})
                                        </Typography>
                                    </Box>

                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<PlayArrow />}
                                        onClick={() => handleStartClass(entry)}
                                        disabled={
                                            activeSession ||
                                            entry.status === 'completed' ||
                                            loading ||
                                            isFinished ||
                                            !canStartNow(entry)
                                        }
                                    >
                                        {isFinished ? "Finished" : "Start"}
                                    </Button>
                                    {matchingSession && !matchingSession.ended_at && (
                                        <Button
                                            variant="contained"
                                            color="error"
                                            fullWidth
                                            startIcon={<Stop />}
                                            sx={{ mt: 1 }}
                                            onClick={() => handleEndById(resolveSessionId(matchingSession))}
                                            disabled={loading}
                                        >
                                            End
                                        </Button>
                                    )}
                                    <Button
                                        variant="text"
                                        fullWidth
                                        sx={{ mt: 1 }}
                                        onClick={() =>
                                            currentSession &&
                                            openAttendance(currentSession, entry)
                                        }
                                        disabled={!currentSession}
                                    >
                                        {currentSession ? "Mark Attendance" : "Attendance (start first)"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
                );
            })()}

            {/* Past Sessions */}
            <Box sx={{ mt: 5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <History fontSize="small" /> Session History
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <ToggleButtonGroup
                            value={dateFilter}
                            exclusive
                            size="small"
                            onChange={(_, val) => val && setDateFilter(val)}
                        >
                            <ToggleButton value="today">Today</ToggleButton>
                            <ToggleButton value="yesterday">Yesterday</ToggleButton>
                            <ToggleButton value="all">All</ToggleButton>
                            <ToggleButton value="custom">Pick date</ToggleButton>
                        </ToggleButtonGroup>
                        {dateFilter === "custom" && (
                            <Box sx={{ minWidth: 200 }}>
                                <DatePickerField
                                    label="Pick date"
                                    value={customDate}
                                    onChange={setCustomDate}
                                    size="small"
                                />
                            </Box>
                        )}
                    </Stack>
                </Stack>

            {sessionLoading ? (
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : sessions.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
                        <Typography color="text.secondary">No sessions found.</Typography>
                    </Paper>
                ) : (
                    <Grid container spacing={2}>
                        {sessions.map((s) => (
                            <Grid item xs={12} sm={6} md={4} key={s.id}>
                                <Card sx={{ borderLeft: '4px solid #0ea5e9' }}>
                                    <CardContent>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            {new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </Typography>
                                        <Typography variant="h6" sx={{ mb: 1 }}>
                                            {s.subject?.name || "Subject"}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Class {s.class?.name || s.class?.class_name || "-"} ({s.section?.name || "-"})
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Chip size="small" icon={<AccessTime sx={{ fontSize: 16 }} />} label={`${formatClock(s.started_at)} - ${formatClock(s.ended_at) || "ongoing"}`} />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            <Dialog open={attendanceOpen} onClose={() => setAttendanceOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ pb: 1 }}>Mark Attendance</DialogTitle>
                <DialogContent>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap" }}>
                        <Chip size="small" color="success" variant="outlined" label="P: Present" />
                        <Chip size="small" color="error" variant="outlined" label="A: Absent" />
                        <Chip size="small" color="warning" variant="outlined" label="L: Leave" />
                        <Chip size="small" color="info" variant="outlined" label="OD: On Duty" />
                    </Stack>
                    {attendanceError ? (
                        <Alert severity="error" sx={{ mb: 1.5 }}>
                            {attendanceError}
                        </Alert>
                    ) : null}
                    {attendanceMessage ? (
                        <Alert severity="success" sx={{ mb: 1.5 }}>
                            {attendanceMessage}
                        </Alert>
                    ) : null}
                    <Stack spacing={1.5} sx={{ maxHeight: "58vh", overflowY: "auto", pr: 0.5 }}>
                        {attendanceStudents.map((s, idx) => (
                            <Paper
                                key={s.id}
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    display: "flex",
                                    alignItems: { xs: "flex-start", sm: "center" },
                                    justifyContent: "space-between",
                                    flexDirection: { xs: "column", sm: "row" },
                                    gap: 1.25,
                                }}
                            >
                                <Box>
                                    <Typography sx={{ fontWeight: 600 }}>
                                        {s.name || `Student ${s.id}`}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {s.rollNo ? `Roll ${s.rollNo}` : s.username || `ID ${s.id}`}
                                    </Typography>
                                </Box>
                                <ToggleButtonGroup
                                    exclusive
                                    value={s.status}
                                    size="small"
                                    onChange={(_, value) => {
                                        if (!value) return;
                                        const next = [...attendanceStudents];
                                        next[idx] = { ...s, status: value };
                                        setAttendanceStudents(next);
                                    }}
                                >
                                    {statusOptions.map((opt) => (
                                        <ToggleButton
                                            key={opt.value}
                                            value={opt.value}
                                            sx={getAttendanceStatusButtonSx(opt.value)}
                                        >
                                            {opt.label}
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            </Paper>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAttendanceOpen(false)} disabled={attendanceSubmitting}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={submitAttendance}
                        disabled={attendanceSubmitting || attendanceStudents.length === 0}
                    >
                        {attendanceSubmitting ? "Saving..." : "Save Attendance"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={homeworkPromptOpen}
                onClose={() => setHomeworkPromptOpen(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{ pb: 1 }}>Assign Homework?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {homeworkPrompt?.label || "Would you like to assign homework for this class?"}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHomeworkPromptOpen(false)}>Skip</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setHomeworkPromptOpen(false);
                            setHomeworkDialogOpen(true);
                        }}
                    >
                        Assign
                    </Button>
                </DialogActions>
            </Dialog>

            <CreateHomeworkDialog
                open={homeworkDialogOpen}
                onClose={() => setHomeworkDialogOpen(false)}
                onSuccess={() => setHomeworkDialogOpen(false)}
                prefill={homeworkPrompt?.prefill}
                lockClassSection
            />
        </Container>
    );
}

const statusOptions = [
    { value: "present", label: "P" },
    { value: "absent", label: "A" },
    { value: "leave", label: "L" },
    { value: "on_duty", label: "OD" },
];

function getAttendanceStatusButtonSx(status) {
    return (theme) => {
        const paletteMap = {
            present: theme.palette.success,
            absent: theme.palette.error,
            leave: theme.palette.warning,
            on_duty: theme.palette.info,
        };

        const palette = paletteMap[status] || theme.palette.primary;

        return {
            minWidth: status === "on_duty" ? 52 : 44,
            color: palette.main,
            borderColor: palette.main,
            fontWeight: 700,
            "&.Mui-selected": {
                color: theme.palette.common.white,
                backgroundColor: palette.main,
                borderColor: palette.main,
            },
            "&.Mui-selected:hover": {
                backgroundColor: palette.dark,
                borderColor: palette.dark,
            },
        };
    };
}

function resolveStudentId(student) {
    const rawId =
        student?.student_id ??
        student?.student?.student_id ??
        student?.Student?.student_id ??
        student?.id ??
        student?.student?.id ??
        student?.Student?.id ??
        student?.user_id;

    const normalized = Number.parseInt(rawId, 10);
    return Number.isFinite(normalized) ? normalized : null;
}

function resolveSessionId(session) {
    const rawSessionId =
        (typeof session === "object" ? session?.id : session) ??
        session?.session_id ??
        session?.teacher_class_session_id ??
        session?.class_session_id;
    const normalized = Number.parseInt(rawSessionId, 10);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function resolveClassId(entry) {
    const raw = entry?.class_id ?? entry?.class?.id ?? entry?.Class?.id;
    const normalized = Number.parseInt(raw, 10);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function resolveSectionId(entry) {
    const raw = entry?.section_id ?? entry?.section?.id ?? entry?.Section?.id;
    const normalized = Number.parseInt(raw, 10);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function resolveSubjectId(entry) {
    const raw = entry?.subject_id ?? entry?.subject?.id ?? entry?.Subject?.id;
    const normalized = Number.parseInt(raw, 10);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function resolveTeacherAssignmentId(entry) {
    const raw =
        entry?.teacher_assignment_id ??
        entry?.assignment_id ??
        entry?.teacherAssignmentId;
    const normalized = Number.parseInt(raw, 10);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function resolveScheduledEnd(session) {
    const base =
        session?.startTime ||
        (session?.started_at ? new Date(session.started_at) : new Date());
    const startTime =
        session?.start_time ??
        session?.startTime ??
        session?.timetable_start_time ??
        session?.timetable?.start_time;
    const start = startTime ? parseTimeOnDate(base, startTime) : base;
    return start ? new Date(start.getTime() + SESSION_DURATION_MS) : null;
}

function parseTimeOnDate(baseDate, timeStr) {
    if (!timeStr) return null;
    const parts = String(timeStr).split(":").map((v) => Number.parseInt(v, 10));
    if (!Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
    const d = new Date(baseDate);
    d.setHours(parts[0], parts[1], Number.isFinite(parts[2]) ? parts[2] : 0, 0);
    return d;
}

const SESSION_DURATION_MS = 45 * 60 * 1000;

function resolveEntryEndTime(entry) {
    const startTime = entry?.start_time ?? entry?.startTime ?? entry?.timetable?.start_time;
    if (!startTime) return null;
    const base = new Date();
    const start = parseTimeOnDate(base, startTime);
    if (!start) return null;
    return new Date(start.getTime() + SESSION_DURATION_MS);
}

function formatTimeLabel(dateOrTime) {
    if (!dateOrTime) return "";
    if (dateOrTime instanceof Date) {
        return dateOrTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return String(dateOrTime);
}

function canStartNow(entry) {
    const now = new Date();
    const startTime = entry?.start_time ?? entry?.startTime ?? entry?.timetable?.start_time;
    const start = startTime ? parseTimeOnDate(now, startTime) : null;
    if (!start) return false;
    const end = new Date(start.getTime() + SESSION_DURATION_MS);
    return now >= start && now <= end;
}

function isSessionExpiredByTime(sessionObj, timetableEntry) {
    const sessionStart = sessionObj?.started_at ? new Date(sessionObj.started_at) : null;
    if (sessionStart) {
        return Date.now() > sessionStart.getTime() + SESSION_DURATION_MS;
    }
    const startTime = timetableEntry?.start_time ?? timetableEntry?.timetable?.start_time;
    if (!startTime) return false;
    const start = parseTimeOnDate(new Date(), startTime);
    if (!start) return false;
    return Date.now() > start.getTime() + SESSION_DURATION_MS;
}

function promptHomeworkPayload(session) {
    const classId = session?.class_id ?? session?.class?.id;
    const sectionId = session?.section_id ?? session?.section?.id;
    const subjectId = session?.subject_id ?? session?.subject?.id;
    const assignmentId = session?.teacher_assignment_id ?? session?.teacherAssignmentId;
    const className = session?.class?.class_name || session?.class?.name || session?.class_name;
    const sectionName = session?.section?.name || session?.section_name;
    const subjectName = session?.subject?.name || session?.subject_name;
    const label = className || sectionName || subjectName
        ? `Class ${className || ""} ${sectionName ? `- ${sectionName}` : ""}${subjectName ? ` • ${subjectName}` : ""}`
        : "Would you like to assign homework for this class?";
    return {
        label,
        prefill: {
            class_id: classId,
            section_id: sectionId,
            subject_id: subjectId,
            teacher_assignment_id: assignmentId,
        },
    };
}

function isSameSessionId(a, b) {
    const na = Number.parseInt(a, 10);
    const nb = Number.parseInt(b, 10);
    return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
}

function createHomeworkPrompter(setHomeworkPrompt, setHomeworkPromptOpen, lastHomeworkSessionId, setLastHomeworkSessionId) {
    return (session) => {
        const sessionId = resolveSessionId(session);
        if (!sessionId) return;
        if (isSameSessionId(sessionId, lastHomeworkSessionId)) return;
        setLastHomeworkSessionId(sessionId);
        setHomeworkPrompt(promptHomeworkPayload(session));
        setHomeworkPromptOpen(true);
    };
}
