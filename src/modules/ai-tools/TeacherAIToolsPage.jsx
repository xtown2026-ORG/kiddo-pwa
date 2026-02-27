import { Box, Typography, Container, Grid, Card, CardContent, Button, TextField, Tab, Tabs, Paper, FormControl, InputLabel, Select, MenuItem, Alert, Stack } from "@mui/material";
import { AutoAwesome, Description, School, ContentPaste, PictureAsPdf } from "@mui/icons-material";
import { useMemo, useState } from "react";
import { generateLessonSummary, generateQuestionPaper } from "./teacherAi.api";
import { useTeacherAssignments } from "../teacher-timetable/useTeacherAssignments";

export default function TeacherAIToolsPage() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState("");
    const [meta, setMeta] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");

    const { assignments, loading: assignmentsLoading } = useTeacherAssignments();
    const [selectedClass, setSelectedClass] = useState("");

    // Question Paper State
    const [qpTopic, setQpTopic] = useState("");
    const [qpMarks, setQpMarks] = useState("50");

    // Lesson Summary State
    const [lsTopic, setLsTopic] = useState("");

    const classOptions = useMemo(() => {
        const map = new Map();
        assignments.forEach((a) => {
            const cls = a.Class || a.class;
            if (!cls) return;
            if (!map.has(cls.id)) {
                map.set(cls.id, { id: cls.id, name: cls.class_name });
            }
        });
        return Array.from(map.values());
    }, [assignments]);

    const handleGenerate = async (type) => {
        setLoading(true);
        setResult("");
        setMeta(null);
        setErrorMsg("");
        try {
            if (!selectedClass) {
                setErrorMsg("Please select a class.");
                return;
            }

            const cls = classOptions.find((c) => String(c.id) === String(selectedClass));
            const classLevel = cls?.name || selectedClass;
            const selectedAssignment = assignments.find((a) => {
                const assignmentClass = a.Class || a.class;
                return String(assignmentClass?.id) === String(selectedClass);
            });
            const selectedSubject = selectedAssignment?.Subject?.name || selectedAssignment?.subject?.name || "General";

            const payload =
                type === "question_paper"
                    ? {
                        classLevel,
                        subject: selectedSubject,
                        topic: qpTopic,
                        chapter: qpTopic,
                        marks: Number(qpMarks || 50),
                    }
                    : {
                        classLevel,
                        subject: selectedSubject,
                        topic: lsTopic,
                    };

            const res =
                type === "question_paper"
                    ? await generateQuestionPaper(payload)
                    : await generateLessonSummary(payload);
            const output = res?.data?.result?.text || "";
            setResult(output);
            setMeta(res?.data?.result || null);
        } catch (err) {
            console.error(err);
            setErrorMsg(err?.response?.data?.message || "Could not generate content. Please try again in a moment.");
        } finally {
            setLoading(false);
        }
    };

    const downloadPdf = () => {
        if (!result) return;
        // Simple client-side PDF using a hidden iframe with plain text; keeps deps small.
        const blob = new Blob([result], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = tab === 0 ? "question-paper.pdf" : "lesson-summary.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography variant="h3" fontWeight="bold" sx={{ background: 'linear-gradient(45deg, #4f46e5, #ec4899)', backgroundClip: 'text', color: 'transparent', mb: 2 }}>
                    Teacher's AI Assistant
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    Automate your academic preparation with generative AI
                </Typography>
            </Box>

            <Paper sx={{ mb: 4 }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)} centered variant="fullWidth">
                    <Tab icon={<Description />} label="Question Paper Generator" />
                    <Tab icon={<School />} label="Lesson Plan Summary" />
                </Tabs>
            </Paper>

            <Grid container spacing={4}>
                {/* Input Section */}
                <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AutoAwesome color="primary" />
                                <Typography variant="h6" fontWeight="bold">Configuration</Typography>
                            </Box>

                            {assignmentsLoading && (
                                <Alert severity="info">
                                    Loading your assigned classes and subjects...
                                </Alert>
                            )}
                            {errorMsg && (
                                <Alert severity="error" onClose={() => setErrorMsg("")}>
                                    {errorMsg}
                                </Alert>
                            )}

                            {!assignmentsLoading && !classOptions.length && (
                                <Alert severity="warning">
                                    No class assignments found for your account.
                                </Alert>
                            )}

                            <FormControl fullWidth>
                                <InputLabel>Class</InputLabel>
                                <Select
                                    label="Class"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    {classOptions.map((cls) => (
                                        <MenuItem key={cls.id} value={cls.id}>
                                            {cls.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {tab === 0 ? (
                                <>
                                    <TextField
                                        label="Topic / Chapter"
                                        fullWidth
                                        value={qpTopic}
                                        onChange={(e) => setQpTopic(e.target.value)}
                                        placeholder="e.g. Photosynthesis"
                                    />
                                    <TextField
                                        label="Total Marks"
                                        fullWidth
                                        type="number"
                                        value={qpMarks}
                                        onChange={(e) => setQpMarks(e.target.value)}
                                        placeholder="e.g. 50"
                                    />
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={() => handleGenerate('question_paper')}
                                        disabled={loading || !qpTopic || !selectedClass}
                                        sx={{ mt: 2, background: 'linear-gradient(45deg, #4f46e5, #818cf8)' }}
                                    >
                                        {loading ? "Generating..." : "Generate Question Paper"}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <TextField
                                        label="Lesson Topic"
                                        fullWidth
                                        multiline
                                        rows={3}
                                        value={lsTopic}
                                        onChange={(e) => setLsTopic(e.target.value)}
                                        placeholder="What are you teaching next session?"
                                    />
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={() => handleGenerate('lesson_summary')}
                                        disabled={loading || !lsTopic || !selectedClass}
                                        sx={{ mt: 2, background: 'linear-gradient(45deg, #ec4899, #f472b6)' }}
                                    >
                                        {loading ? "Summarizing..." : "Generate Summary"}
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Output Section */}
                <Grid item xs={12} md={7}>
                    <Card sx={{ height: '100%', bgcolor: 'grey.50' }}>
                        <CardContent sx={{ height: '100%', minHeight: 400 }}>
                            {result ? (
                                <Box>
                                    <Typography
                                        variant="body1"
                                        sx={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}
                                    >
                                        {result}
                                    </Typography>
                                    {meta && (
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Source: {meta.source_type === "rag" ? "Textbook (RAG)" : "Gemini"}
                                            </Typography>
                                            {Array.isArray(meta.sources) && meta.sources.length > 0 && (
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {meta.sources.join(" | ")}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                        <Button startIcon={<ContentPaste />} onClick={() => navigator.clipboard.writeText(result)}>
                                            Copy to Clipboard
                                        </Button>
                                        <Button startIcon={<PictureAsPdf />} variant="outlined" onClick={downloadPdf}>
                                            Download PDF
                                        </Button>
                                    </Stack>
                                </Box>
                            ) : (
                                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                    <Typography variant="h6">
                                        {errorMsg ? "We couldn't generate content. Please adjust inputs or retry." : "AI output will appear here..."}
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}
