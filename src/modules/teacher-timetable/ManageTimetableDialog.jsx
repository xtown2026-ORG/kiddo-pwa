import { useState, useMemo, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Alert,
    IconButton,
    Typography,
    Box,
    Divider,
    FormControlLabel,
    Checkbox
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { getSectionAssignments, saveTimetable } from "./teacherTimetable.api";

export default function ManageTimetableDialog({ open, onClose, onSuccess, classTeacherSections = [] }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [classSection, setClassSection] = useState("");
    const [dayOfWeek, setDayOfWeek] = useState("monday");
    const [sectionAssignments, setSectionAssignments] = useState([]);

    // Entries state
    const [entries, setEntries] = useState([
        { start_time: "09:00", end_time: "10:00", teacher_assignment_id: "", title: "", is_break: false }
    ]);

    const classOptions = useMemo(() => {
        return classTeacherSections.map((a) => ({
            class_id: a.class_id,
            section_id: a.section_id,
            label: `${a.Class?.class_name || a.class?.class_name || a.class_id} - ${a.Section?.name || a.section?.name || a.section_id}`,
        }));
    }, [classTeacherSections]);

    useEffect(() => {
        if (!open) return;
        if (!classSection && classOptions.length === 1) {
            const only = classOptions[0];
            setClassSection(`${only.class_id},${only.section_id}`);
        }
    }, [open, classOptions, classSection]);

    useEffect(() => {
        async function loadAssignments() {
            if (!classSection) {
                setSectionAssignments([]);
                return;
            }

            const [, sectionId] = classSection.split(",");
            try {
                const res = await getSectionAssignments(sectionId);
                const data = res?.data?.data ?? res?.data ?? [];
                setSectionAssignments(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
                setSectionAssignments([]);
            }
        }
        loadAssignments();
    }, [classSection, open]);


    const handleEntryChange = (index, field, value) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
    };

    const addEntry = () => {
        setEntries([...entries, { start_time: "", end_time: "", teacher_assignment_id: "", title: "", is_break: false }]);
    };

    const removeEntry = (index) => {
        setEntries(entries.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!classSection) {
            setError("Please select a class");
            return;
        }

        const invalid = entries.find((e) => !e.is_break && !e.teacher_assignment_id);
        if (invalid) {
            setError("Please select a teacher assignment for all non-break periods");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const [classId, sectionId] = classSection.split(",");

            // Clean up entries
            const validEntries = entries.map(e => ({
                start_time: e.start_time,
                end_time: e.end_time,
                teacher_assignment_id: e.is_break ? undefined : parseInt(e.teacher_assignment_id),
                title: e.title,
                is_break: e.is_break
            }));

            await saveTimetable({
                class_id: parseInt(classId),
                section_id: parseInt(sectionId),
                day_of_week: dayOfWeek,
                entries: validEntries
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to save timetable");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Manage Class Timetable</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    {!classOptions.length && (
                        <Alert severity="info">
                            You are not assigned as a class teacher for any section.
                        </Alert>
                    )}

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <FormControl fullWidth disabled={!classOptions.length}>
                            <InputLabel>Class & Section</InputLabel>
                            <Select
                                value={classSection}
                                label="Class & Section"
                                onChange={(e) => setClassSection(e.target.value)}
                            >
                                {classOptions.map((opt) => (
                                    <MenuItem
                                        key={`${opt.class_id},${opt.section_id}`}
                                        value={`${opt.class_id},${opt.section_id}`}
                                    >
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Day</InputLabel>
                            <Select
                                value={dayOfWeek}
                                label="Day"
                                onChange={(e) => setDayOfWeek(e.target.value)}
                            >
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                                    <MenuItem key={day} value={day}>
                                        {day.charAt(0).toUpperCase() + day.slice(1)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    <Divider>Periods</Divider>

    {entries.map((entry, index) => (
        <Stack key={index} spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <TextField
                        type="time"
                        label="Start"
                        value={entry.start_time}
                        onChange={(e) => handleEntryChange(index, "start_time", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 110 }}
                    />
                    <TextField
                        type="time"
                        label="End"
                        value={entry.end_time}
                        onChange={(e) => handleEntryChange(index, "end_time", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 110 }}
                    />
                </Box>

                <FormControl fullWidth size="small" disabled={entry.is_break} sx={{ minWidth: 220 }}>
                    <InputLabel>Teacher Assignment</InputLabel>
                    <Select
                        value={entry.teacher_assignment_id}
                        label="Teacher Assignment"
                        onChange={(e) => handleEntryChange(index, "teacher_assignment_id", e.target.value)}
                    >
                        <MenuItem value=""><em>Select assignment</em></MenuItem>
                        {sectionAssignments.map((a) => {
                            const subjectName = a.Subject?.name || a.subject?.name || "Subject";
                            const teacherName =
                                a.Teacher?.User?.name ||
                                a.teacher?.user?.name ||
                                a.teacher?.User?.name ||
                                "Teacher";
                            return (
                                <MenuItem key={a.id} value={a.id}>
                                    {subjectName} - {teacherName}
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={entry.is_break}
                            onChange={(e) => handleEntryChange(index, "is_break", e.target.checked)}
                        />
                    }
                    label="Break"
                />

                {entry.is_break && (
                    <TextField
                        label="Break label (optional)"
                        value={entry.title}
                        onChange={(e) => handleEntryChange(index, "title", e.target.value)}
                        size="small"
                        sx={{ minWidth: 220, flex: 1 }}
                    />
                )}

                <IconButton onClick={() => removeEntry(index)} color="error">
                    <Delete />
                </IconButton>
            </Stack>
        </Stack>
    ))}

                    <Button startIcon={<Add />} onClick={addEntry}>
                        Add Period
                    </Button>

                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    Save Day
                </Button>
            </DialogActions>
        </Dialog>
    );
}
