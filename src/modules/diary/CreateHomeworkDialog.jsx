import { useEffect, useMemo, useState } from "react";
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
    Alert
} from "@mui/material";
import { useTeacherTimetable } from "../teacher-timetable/useTeacherTimetable";
import { getMyTeacherAssignments } from "../teacher-timetable/teacherTimetable.api";
import { createHomework } from "./diary.api";
import DatePickerField from "../../components/DatePickerField";

export default function CreateHomeworkDialog({ open, onClose, onSuccess }) {
    const { timetable } = useTeacherTimetable();
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getTomorrowDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
    };

    const [formData, setFormData] = useState({
        class_section: "", // "classId,sectionId"
        subject_id: "",
        teacher_assignment_id: "",
        homework_date: getTomorrowDate(),
        description: "",
    });

    useEffect(() => {
        if (!open) return;
        setFormData((prev) => ({
            ...prev,
            homework_date: getTomorrowDate(),
        }));
    }, [open]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        async function loadAssignments() {
            try {
                setAssignmentsLoading(true);
                const res = await getMyTeacherAssignments();
                const items = res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
                if (!cancelled) setAssignments(Array.isArray(items) ? items : []);
            } catch (err) {
                console.warn("Failed to load teacher assignments", err);
                if (!cancelled) setAssignments([]);
            } finally {
                if (!cancelled) setAssignmentsLoading(false);
            }
        }

        loadAssignments();
        return () => {
            cancelled = true;
        };
    }, [open]);

    const slots = useMemo(() => {
        const timetableSlots = Array.isArray(timetable)
            ? timetable
            : Object.values(timetable || {}).flat();
        const assignmentSlots = (assignments || []).map((a) => ({
            class_id: a.class_id,
            section_id: a.section_id,
            subject_id: a.subject_id,
            teacher_assignment_id: a.id,
            class: a.Class || a.class,
            section: a.Section || a.section,
            subject: a.Subject || a.subject,
        }));
        return [...timetableSlots, ...assignmentSlots];
    }, [timetable, assignments]);

    // Extract unique (class, section) pairs
    const classOptions = useMemo(() => {
        if (!slots.length) return [];
        const unique = new Map();
        slots.forEach((t) => {
            const classId = t.class_id || t.class?.id || t.Class?.id;
            const sectionId = t.section_id || t.section?.id || t.Section?.id;
            if (classId && sectionId) {
                const key = `${classId},${sectionId}`;
                if (!unique.has(key)) {
                    unique.set(key, {
                        class_id: classId,
                        section_id: sectionId,
                        label: `${t.class?.class_name || t.class?.name || t.Class?.class_name || t.class_id} - ${t.section?.name || t.Section?.name || t.section_id}`,
                    });
                }
            }
        });
        return Array.from(unique.values());
    }, [slots]);

    // Extract subjects for the selected class/section
    const subjectOptions = useMemo(() => {
        if (!formData.class_section || !slots.length) return [];
        const [classId, sectionId] = formData.class_section.split(",").map(Number);

        const relevantEntries = slots.filter((t) => {
            const entryClassId = t.class_id || t.class?.id || t.Class?.id;
            const entrySectionId = t.section_id || t.section?.id || t.Section?.id;
            return (
                String(entryClassId) === String(classId) &&
                String(entrySectionId) === String(sectionId) &&
                (t.Subject || t.subject)
            );
        });

        const unique = new Map();
        relevantEntries.forEach((t) => {
            const assignmentId = t.teacher_assignment_id || t.id;
            const subjectId = t.subject_id || t.Subject?.id || t.subject?.id;
            const name = t.Subject?.name || t.subject?.name;
            if (assignmentId && subjectId && name && !unique.has(assignmentId)) {
                unique.set(assignmentId, { assignmentId, subjectId, name });
            }
        });

        return Array.from(unique.values());
    }, [formData.class_section, slots]);

    useEffect(() => {
        if (!formData.class_section) return;
        if (subjectOptions.length === 1) {
            const only = subjectOptions[0];
            setFormData((prev) => ({
                ...prev,
                subject_id: only.subjectId,
                teacher_assignment_id: only.assignmentId,
            }));
        }
    }, [formData.class_section, subjectOptions]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "subject_id") {
            const selected = subjectOptions.find(
                (opt) => String(opt.assignmentId) === String(value)
            );
            setFormData({
                ...formData,
                subject_id: selected ? selected.subjectId : "",
                teacher_assignment_id: selected ? selected.assignmentId : "",
            });
            return;
        }
        setFormData({ ...formData, [name]: value });
    };

    const minDueDate = getTomorrowDate();

    const handleSubmit = async () => {
        if (
            !formData.class_section ||
            !formData.subject_id ||
            !formData.teacher_assignment_id ||
            !formData.description ||
            !formData.homework_date
        ) {
            setError("Please fill all fields");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const [classId, sectionId] = formData.class_section.split(",");

            await createHomework({
                class_id: parseInt(classId),
                section_id: parseInt(sectionId),
                subject_id: formData.subject_id ? Number(formData.subject_id) : undefined,
                teacher_assignment_id: Number(formData.teacher_assignment_id),
                homework_date: formData.homework_date,
                description: formData.description,
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to create homework");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Assign Homework</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    {!classOptions.length && !assignmentsLoading && (
                        <Alert severity="info">
                            No assigned classes found. Ask the school admin to assign your
                            classes/subjects or create your timetable first.
                        </Alert>
                    )}

                    <FormControl fullWidth>
                        <InputLabel>Class & Section</InputLabel>
                        <Select
                            name="class_section"
                            label="Class & Section"
                            value={formData.class_section}
                            onChange={handleChange}
                            disabled={!classOptions.length}
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

                    <FormControl fullWidth disabled={!formData.class_section}>
                        <InputLabel>Subject</InputLabel>
                        <Select
                            name="subject_id"
                            label="Subject"
                            value={formData.teacher_assignment_id}
                            onChange={handleChange}
                        >
                            {subjectOptions.map((opt) => (
                                <MenuItem key={opt.assignmentId} value={opt.assignmentId}>
                                    {opt.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <DatePickerField
                        label="Due Date"
                        value={formData.homework_date}
                        onChange={(val) =>
                            setFormData((prev) => ({ ...prev, homework_date: val }))
                        }
                        minDate={minDueDate}
                        disablePast
                    />

                    <TextField
                        name="description"
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={handleChange}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? "Assign" : "Assign"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
