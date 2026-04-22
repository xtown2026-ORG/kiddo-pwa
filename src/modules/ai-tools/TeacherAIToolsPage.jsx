import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, FormControlLabel, Grid, InputLabel, List, ListItem,
  ListItemText, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import {
  AutoAwesome, AssignmentTurnedIn, CameraAlt, Collections, ContentPaste, DeleteOutline, Description, PictureAsPdf, RemoveCircle, School,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { MobileDatePicker } from "@mui/x-date-pickers/MobileDatePicker";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import api from "../../api/axios";
import { generateLessonSummary, generateQuestionPaper } from "./teacherAi.api";
import { useTeacherAssignments } from "../teacher-timetable/useTeacherAssignments";
import { createTeacherAssignedTest } from "../ai-tests/aiTests.api";
import { createImagePreview, processImageForUpload, revokeImagePreview } from "../../utils/imageUtils";

function countQuestions(text = "") {
  const [questionBlock] = String(text || "").split(/\*\*Teacher Reference Points\*\*/i);
  return questionBlock.split(/\r?\n/).filter((line) => /^\d+\.\s+/.test(line.trim())).length;
}
function toPickerValue(value) {
  if (!value) return null;
  const next = dayjs(value);
  return next.isValid() ? next : null;
}
function toFixedScheduleIso(value, baseDate = dayjs()) {
  if (!value) return null;
  const next = dayjs(value);
  if (!next.isValid()) return null;
  const fixedDate = dayjs(baseDate).startOf("day");
  return fixedDate.hour(next.hour()).minute(next.minute()).second(0).millisecond(0).toISOString();
}
function formatScheduleSummary(startTime, endTime) {
  if (!startTime && !endTime) return "";
  const options = { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };
  const startLabel = startTime ? new Date(startTime).toLocaleString([], options) : "";
  const endLabel = endTime ? new Date(endTime).toLocaleString([], options) : "";
  if (startLabel && endLabel) return `${startLabel} to ${endLabel}`;
  return startLabel || endLabel;
}
function toWholeNumber(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}
const ONE_MARK_TYPE_LABELS = {
  choose: "Choose",
  fill: "Fill up",
  match: "Match",
  true_false: "True or False",
};

function createQuestionPattern(oneMarkCounts, twoMarkCount, threeMarkCount, fiveMarkCount) {
  const oneChoose = toWholeNumber(oneMarkCounts?.choose, 0);
  const oneFill = toWholeNumber(oneMarkCounts?.fill, 0);
  const oneMatch = toWholeNumber(oneMarkCounts?.match, 0);
  const oneTrueFalse = toWholeNumber(oneMarkCounts?.true_false, 0);
  const one = oneChoose + oneFill + oneMatch + oneTrueFalse;
  const two = toWholeNumber(twoMarkCount, 4);
  const three = toWholeNumber(threeMarkCount, 2);
  const five = toWholeNumber(fiveMarkCount, 1);
  const totalMarks = one + two * 2 + three * 3 + five * 5;
  const totalQuestions = one + two + three + five;
  return {
    oneMarkCounts: {
      choose: oneChoose,
      fill: oneFill,
      match: oneMatch,
      true_false: oneTrueFalse,
    },
    oneMarkCount: one,
    twoMarkCount: two,
    threeMarkCount: three,
    fiveMarkCount: five,
    totalMarks,
    totalQuestions,
    isValid: totalQuestions > 0 && totalMarks > 0,
    summary: [
      one ? `${one} x 1 mark (${[
        oneChoose ? `${oneChoose} choose` : "",
        oneFill ? `${oneFill} fill up` : "",
        oneMatch ? `${oneMatch} match` : "",
        oneTrueFalse ? `${oneTrueFalse} true/false` : "",
      ].filter(Boolean).join(" + ")})` : "",
      `${two} x 2 marks`,
      `${three} x 3 marks`,
      `${five} x 5 marks`,
    ].filter(Boolean).join(", "),
  };
}

export default function TeacherAIToolsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ question_paper: "", lesson_summary: "" });
  const [metas, setMetas] = useState({ question_paper: null, lesson_summary: null });
  const [errorByType, setErrorByType] = useState({ question_paper: "", lesson_summary: "" });
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [qpTopic, setQpTopic] = useState("");
  const [lsTopic, setLsTopic] = useState("");
  const [oneMarkType, setOneMarkType] = useState("choose");
  const [oneMarkCounts, setOneMarkCounts] = useState({ choose: "5", fill: "0", match: "0", true_false: "0" });
  const [twoMarkCount, setTwoMarkCount] = useState("4");
  const [threeMarkCount, setThreeMarkCount] = useState("2");
  const [fiveMarkCount, setFiveMarkCount] = useState("1");
  const [questionImages, setQuestionImages] = useState([]);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [assignForm, setAssignForm] = useState({
    title: "", subject: "", chapter: "", total_questions: 0, max_score: 0, duration_minutes: 10,
    schedule_date: "", start_time: "", end_time: "", assign_full_class: false, has_time_limit: true,
    lock_mode: true, allow_retry: false, result_visibility: "immediate", student_ids: [],
  });
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState("");
  const [assignRefreshKey, setAssignRefreshKey] = useState(0);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const { assignments, loading: assignmentsLoading } = useTeacherAssignments();
  const classOptions = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => {
      const cls = a.Class || a.class;
      if (cls && !map.has(String(cls.id))) map.set(String(cls.id), { id: String(cls.id), name: cls.class_name });
    });
    return Array.from(map.values());
  }, [assignments]);
  const sectionOptions = useMemo(() => {
    const map = new Map();
    assignments.filter((a) => String((a.Class || a.class)?.id) === String(selectedClass)).forEach((a) => {
      const section = a.Section || a.section;
      if (section && !map.has(String(section.id))) map.set(String(section.id), { id: String(section.id), name: section.name });
    });
    return Array.from(map.values());
  }, [assignments, selectedClass]);
  const questionPattern = useMemo(
    () => createQuestionPattern(oneMarkCounts, twoMarkCount, threeMarkCount, fiveMarkCount),
    [oneMarkCounts, twoMarkCount, threeMarkCount, fiveMarkCount]
  );
  useEffect(() => {
    if (selectedClass || !classOptions.length) return;
    setSelectedClass(classOptions[0].id);
  }, [classOptions, selectedClass]);
  useEffect(() => {
    if (!selectedClass) return;
    if (!selectedSection || !sectionOptions.find((item) => item.id === String(selectedSection))) {
      setSelectedSection(sectionOptions[0]?.id || "");
    }
  }, [selectedClass, selectedSection, sectionOptions]);
  useEffect(() => () => {
    questionImages.forEach((image) => {
      if (image.previewUrl) revokeImagePreview(image.previewUrl);
    });
  }, [questionImages]);

  const currentType = tab === 0 ? "question_paper" : "lesson_summary";
  const currentResult = results[currentType];
  const currentMeta = metas[currentType];
  const currentError = errorByType[currentType];
  const activeAssignment = useMemo(
    () =>
      assignments.find((a) => {
        const cls = a.Class || a.class;
        const section = a.Section || a.section;
        return String(cls?.id) === String(selectedClass) && String(section?.id) === String(selectedSection);
      }) ||
      assignments.find((a) => String((a.Class || a.class)?.id) === String(selectedClass)) ||
      null,
    [assignments, selectedClass, selectedSection]
  );
  const resolvedClassLevel = useMemo(() => {
    const selected = classOptions.find((c) => String(c.id) === String(selectedClass));
    const assignmentClass = activeAssignment?.Class || activeAssignment?.class;
    return selected?.name || assignmentClass?.class_name || assignmentClass?.name || selectedClass || "";
  }, [activeAssignment, classOptions, selectedClass]);
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((student) => {
      const text = [
        student?.User?.name, student?.User?.username, student?.admission_no, student?.roll_no,
        student?.Class?.class_name, student?.Section?.name,
      ].filter(Boolean).join(" ").toLowerCase();
      return !q || text.includes(q);
    });
  }, [studentSearch, students]);

  async function handleQuestionImageChange(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    try {
      setImageProcessing(true);
      setErrorByType((prev) => ({ ...prev, question_paper: "" }));
      const processedImages = [];
      for (const file of files) {
        const processed = await processImageForUpload(file, {
          validation: { maxSizeInMB: 8, allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"] },
          compression: { maxWidth: 1600, maxHeight: 1600, quality: 0.82, outputFormat: "image/jpeg" },
        });
        processedImages.push({
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          data: processed.data,
          type: "image/jpeg",
          name: file.name,
          size: processed.size,
          previewUrl: createImagePreview(file),
        });
      }
      setQuestionImages((prev) => [...prev, ...processedImages]);
    } catch (err) {
      setErrorByType((prev) => ({ ...prev, question_paper: err?.message || "Could not process the captured image." }));
    } finally {
      setImageProcessing(false);
    }
  }
  function handleWholeNumberChange(setter) {
    return (event) => {
      const nextValue = String(event.target.value || "").replace(/[^\d]/g, "");
      setter(nextValue);
    };
  }
  function updateOneMarkSelectedCount(event) {
    const nextValue = String(event.target.value || "").replace(/[^\d]/g, "");
    setOneMarkCounts((prev) => ({
      ...prev,
      [oneMarkType]: nextValue,
    }));
  }
  function removeQuestionImage(imageId) {
    setQuestionImages((prev) => {
      const image = prev.find((item) => item.id === imageId);
      if (image?.previewUrl) revokeImagePreview(image.previewUrl);
      return prev.filter((item) => item.id !== imageId);
    });
  }
  function clearQuestionImages() {
    setQuestionImages((prev) => {
      prev.forEach((image) => {
        if (image.previewUrl) revokeImagePreview(image.previewUrl);
      });
      return [];
    });
  }
  async function handleGenerate(type) {
    setLoading(true);
    setResults((prev) => ({ ...prev, [type]: "" }));
    setMetas((prev) => ({ ...prev, [type]: null }));
    setErrorByType((prev) => ({ ...prev, [type]: "" }));
    try {
      if (!assignments.length) {
        setErrorByType((prev) => ({
          ...prev,
          [type]: "No assigned class or subject found for this teacher. Please contact admin and assign class/section/subject access.",
        }));
        return;
      }
      if (!selectedClass) {
        setErrorByType((prev) => ({ ...prev, [type]: "Please select a class." }));
        return;
      }
      if (!selectedSection) {
        setErrorByType((prev) => ({ ...prev, [type]: "Please select a section." }));
        return;
      }
      if (type === "question_paper" && !questionPattern.isValid) {
        setErrorByType((prev) => ({
          ...prev,
          question_paper: "Add at least one question so the paper has a valid total mark value.",
        }));
        return;
      }
      const classLevel = resolvedClassLevel;
      const selectedSubject = activeAssignment?.Subject?.name || activeAssignment?.subject?.name || "General";
      if (!activeAssignment) {
        setErrorByType((prev) => ({
          ...prev,
          [type]: "This class/section is not mapped to your teacher account yet. Please choose an assigned section.",
        }));
        return;
      }
      const payload = type === "question_paper"
        ? {
            classLevel,
            subject: selectedSubject,
            topic: qpTopic,
            chapter: qpTopic,
            marks: questionPattern.totalMarks,
            totalMarks: questionPattern.totalMarks,
            question_pattern: {
              one_mark_count: questionPattern.oneMarkCount,
              one_mark_choose_count: questionPattern.oneMarkCounts.choose,
              one_mark_fill_count: questionPattern.oneMarkCounts.fill,
              one_mark_match_count: questionPattern.oneMarkCounts.match,
              one_mark_true_false_count: questionPattern.oneMarkCounts.true_false,
              two_mark_count: questionPattern.twoMarkCount,
              three_mark_count: questionPattern.threeMarkCount,
              five_mark_count: questionPattern.fiveMarkCount,
            },
            image_pages: questionImages.map((image) => ({ data: image.data, type: image.type, name: image.name })),
          }
        : { classLevel, subject: selectedSubject, topic: lsTopic };
      const res = type === "question_paper" ? await generateQuestionPaper(payload) : await generateLessonSummary(payload);
      const output = typeof res?.data?.result === "string" ? res.data.result : res?.data?.result?.text || "";
      setResults((prev) => ({ ...prev, [type]: output }));
      setMetas((prev) => ({ ...prev, [type]: res?.data?.result || null }));
      if (type === "question_paper") {
        setGeneratedDraft({
          title: `${selectedSubject} Test - ${qpTopic || classLevel}`,
          subject: selectedSubject,
          chapter: qpTopic || questionImages[0]?.name || "Captured worksheet",
          total_questions: countQuestions(output),
          max_score: questionPattern.totalMarks,
          classLevel,
          generated_content: output,
          generated_meta: res?.data?.result || null,
        });
      }
    } catch (err) {
      setErrorByType((prev) => ({
        ...prev,
        [type]: err?.response?.data?.message || "Could not generate content. Please try again in a moment.",
      }));
    } finally {
      setLoading(false);
    }
  }
  function downloadPdf() {
    if (!currentResult) return;
    const blob = new Blob([currentResult], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = tab === 0 ? "question-paper.pdf" : "lesson-summary.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  async function loadStudentsForAssignment() {
    if (!selectedSection) return;
    try {
      setStudentsLoading(true);
      const res = await api.get("/students/teacher/section", { params: { class_id: selectedClass, section_id: selectedSection } });
      setStudents(res?.data?.items || []);
    } catch (err) {
      setErrorByType((prev) => ({
        ...prev,
        question_paper: err?.response?.data?.message || "Could not load students for assignment.",
      }));
    } finally {
      setStudentsLoading(false);
    }
  }
  function openAssignDialog() {
    if (!generatedDraft) return;
    setAssignSuccess("");
    setStudentSearch("");
    setAssignForm((prev) => ({
      ...prev,
      title: generatedDraft.title,
      subject: generatedDraft.subject,
      chapter: generatedDraft.chapter,
      total_questions: generatedDraft.total_questions,
      max_score: generatedDraft.max_score,
      schedule_date: dayjs().startOf("day").toISOString(),
      start_time: "",
      end_time: "",
      has_time_limit: true,
      duration_minutes: 10,
      lock_mode: true,
      allow_retry: false,
      result_visibility: "immediate",
      student_ids: [],
    }));
    setAssignOpen(true);
    loadStudentsForAssignment();
  }
  function refreshAiToolsWorkspace() {
    setAssignRefreshKey((prev) => prev + 1);
    setAssignOpen(false);
    setStudentSearch("");
    setStudents([]);
    setGeneratedDraft(null);
    setResults({ question_paper: "", lesson_summary: "" });
    setMetas({ question_paper: null, lesson_summary: null });
    setErrorByType({ question_paper: "", lesson_summary: "" });
    setQpTopic("");
    setLsTopic("");
    setOneMarkType("choose");
    setOneMarkCounts({ choose: "5", fill: "0", match: "0", true_false: "0" });
    setTwoMarkCount("4");
    setThreeMarkCount("2");
    setFiveMarkCount("1");
    clearQuestionImages();
  }
  async function handleAssignTest() {
    try {
      setAssignSaving(true);
      setErrorByType((prev) => ({ ...prev, question_paper: "" }));
      if (!assignForm.assign_full_class && !assignForm.student_ids.length) {
        throw new Error("Please select at least one student or choose full class assignment.");
      }
      if (assignForm.start_time && assignForm.end_time) {
        const scheduleDate = assignForm.schedule_date || dayjs().startOf("day").toISOString();
        const startTime = new Date(toFixedScheduleIso(assignForm.start_time, scheduleDate));
        const endTime = new Date(toFixedScheduleIso(assignForm.end_time, scheduleDate));
        if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
          throw new Error("End time must be later than the start time.");
        }
      }
      const selectedStudents = students.filter((student) => assignForm.student_ids.includes(student.id));
      const payload = {
        class_id: Number(selectedClass),
        section_id: Number(selectedSection),
        classLevel: resolvedClassLevel,
        subject_id: activeAssignment?.subject_id || activeAssignment?.Subject?.id || undefined,
        title: assignForm.title,
        subject: assignForm.subject,
        chapter: assignForm.chapter,
        total_questions: Number(assignForm.total_questions || 0),
        total_marks: Number(assignForm.max_score || 0),
        max_score: Number(assignForm.max_score || 0),
        duration_minutes: Number(assignForm.duration_minutes || 0),
        start_time: toFixedScheduleIso(assignForm.start_time, assignForm.schedule_date || dayjs().startOf("day")),
        end_time: toFixedScheduleIso(assignForm.end_time, assignForm.schedule_date || dayjs().startOf("day")),
        assign_full_class: assignForm.assign_full_class,
        has_time_limit: assignForm.has_time_limit,
        lock_mode: true,
        allow_retry: false,
        result_visibility: assignForm.result_visibility,
        student_ids: assignForm.assign_full_class ? [] : assignForm.student_ids,
        generated_content: generatedDraft.generated_content,
        generated_meta: generatedDraft.generated_meta,
        topic: generatedDraft.chapter,
      };
      await createTeacherAssignedTest(payload);
      const targetLabel = assignForm.assign_full_class
        ? `Full class ${activeAssignment?.Class?.class_name || activeAssignment?.class?.class_name || ""}-${activeAssignment?.Section?.name || activeAssignment?.section?.name || ""}`.trim()
        : selectedStudents.map((student) => `${student?.admission_no || student?.User?.username || `ID ${student.id}`} (${student?.User?.name || "Student"})`).join(", ");
      const scheduleLabel = formatScheduleSummary(payload.start_time, payload.end_time);
      setAssignSuccess(`Test assigned successfully${targetLabel ? ` to ${targetLabel}` : ""}${scheduleLabel ? ` for ${scheduleLabel}` : ""}. The AI tools page has been refreshed.`);
      refreshAiToolsWorkspace();
    } catch (err) {
      setErrorByType((prev) => ({
        ...prev,
        question_paper: err?.response?.data?.message || err?.message || "Could not assign the test.",
      }));
    } finally {
      setAssignSaving(false);
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="lg" sx={{ py: 4 }} key={assignRefreshKey}>
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography variant="h3" fontWeight="bold" sx={{ background: "linear-gradient(45deg, #4f46e5, #ec4899)", backgroundClip: "text", color: "transparent", mb: 2 }}>
            Teacher&apos;s AI Assistant
          </Typography>
          <Typography variant="h6" color="text.secondary">Automate your academic preparation with generative AI</Typography>
        </Box>
        <Paper sx={{ mb: 4 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} centered variant="fullWidth">
            <Tab icon={<Description />} label="Question Paper Generator" />
            <Tab icon={<School />} label="Lesson Plan Summary" />
          </Tabs>
        </Paper>
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 3, p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><AutoAwesome color="primary" /><Typography variant="h6" fontWeight="bold">Configuration</Typography></Box>
                {assignmentsLoading && <Alert severity="info">Loading your assigned classes and subjects...</Alert>}
                {!assignmentsLoading && !assignments.length && (
                  <Alert severity="warning">
                    No class or subject access found for this teacher account. Please assign at least one class, section, and subject.
                  </Alert>
                )}
                {assignSuccess && <Alert severity="success" onClose={() => setAssignSuccess("")}>{assignSuccess}</Alert>}
                {currentError && <Alert severity="error" onClose={() => setErrorByType((prev) => ({ ...prev, [currentType]: "" }))}>{currentError}</Alert>}
                <FormControl fullWidth>
                  <InputLabel>Class</InputLabel>
                  <Select label="Class" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                    {classOptions.map((cls) => <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth disabled={!sectionOptions.length}>
                  <InputLabel>Section</InputLabel>
                  <Select label="Section" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                    {sectionOptions.map((section) => <MenuItem key={section.id} value={section.id}>{section.name}</MenuItem>)}
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
                      autoComplete="off"
                      helperText={questionImages.length ? "Optional if you are uploading textbook or handwritten pages." : "Add the chapter/topic name, or upload source photos below."}
                    />
                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Question Categories</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                              1 Mark Questions
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>1 Mark Type</InputLabel>
                              <Select label="1 Mark Type" value={oneMarkType} onChange={(e) => setOneMarkType(e.target.value)}>
                                {Object.entries(ONE_MARK_TYPE_LABELS).map(([value, label]) => (
                                  <MenuItem key={value} value={value}>{label}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="1 Mark Count"
                              fullWidth
                              value={oneMarkCounts[oneMarkType] || ""}
                              onChange={updateOneMarkSelectedCount}
                              inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 0 }}
                              helperText={`${ONE_MARK_TYPE_LABELS[oneMarkType]} count`}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {Object.entries(ONE_MARK_TYPE_LABELS).map(([value, label]) => (
                                <Chip
                                  key={value}
                                  label={`${label}: ${toWholeNumber(oneMarkCounts[value], 0)}`}
                                  color={oneMarkType === value ? "primary" : "default"}
                                  variant={toWholeNumber(oneMarkCounts[value], 0) ? "filled" : "outlined"}
                                  onClick={() => setOneMarkType(value)}
                                />
                              ))}
                            </Stack>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="2 Marks"
                              fullWidth
                              value={twoMarkCount}
                              onChange={handleWholeNumberChange(setTwoMarkCount)}
                              inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 0 }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="3 Marks"
                              fullWidth
                              value={threeMarkCount}
                              onChange={handleWholeNumberChange(setThreeMarkCount)}
                              inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 0 }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="5 Marks"
                              fullWidth
                              value={fiveMarkCount}
                              onChange={handleWholeNumberChange(setFiveMarkCount)}
                              inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 0 }}
                            />
                          </Grid>
                        </Grid>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip color={questionPattern.isValid ? "success" : "warning"} label={`Total Marks: ${questionPattern.totalMarks}`} />
                          <Chip label={`Questions: ${questionPattern.totalQuestions}`} />
                          <Chip variant="outlined" label={questionPattern.summary} />
                        </Stack>
                        {!questionPattern.isValid && <Alert severity="warning">Add at least one question before generating the paper.</Alert>}
                      </CardContent>
                    </Card>
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={handleQuestionImageChange} />
                    <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={handleQuestionImageChange} />
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                      <Button variant="outlined" startIcon={<CameraAlt />} onClick={() => cameraInputRef.current?.click()}>Add Camera Photo</Button>
                      <Button variant="outlined" startIcon={<Collections />} onClick={() => galleryInputRef.current?.click()}>Add From Gallery</Button>
                      {questionImages.length > 0 && <Button color="error" startIcon={<DeleteOutline />} onClick={clearQuestionImages}>Remove All Photos</Button>}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">Use the camera for live capture or gallery to choose existing textbook and handwritten pages. You can add multiple photos for multi-page question generation.</Typography>
                    {imageProcessing && <Alert severity="info">Processing captured images...</Alert>}
                    {questionImages.length > 0 && (
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle2" fontWeight={700}>Captured Pages ({questionImages.length})</Typography>
                        {questionImages.map((image, index) => (
                          <Box key={image.id} sx={{ position: "relative", border: "1px solid", borderColor: "divider", borderRadius: 3, overflow: "hidden", bgcolor: "grey.50" }}>
                            <Button
                              color="error"
                              size="small"
                              onClick={() => removeQuestionImage(image.id)}
                              sx={{
                                position: "absolute",
                                top: 10,
                                right: 10,
                                minWidth: 0,
                                width: 38,
                                height: 38,
                                borderRadius: "50%",
                                p: 0,
                                bgcolor: "rgba(255,255,255,0.92)",
                                boxShadow: 2,
                                zIndex: 1,
                              }}
                              aria-label={`Remove page ${index + 1}`}
                            >
                              <RemoveCircle />
                            </Button>
                            <Box component="img" src={image.previewUrl} alt={`Captured source page ${index + 1}`} sx={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ p: 1.5 }}>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Page {index + 1}: {image.name || "Captured image"}</Typography>
                                <Typography variant="caption" color="text.secondary">{(image.size || 0) > 0 ? `${(image.size / 1024).toFixed(0)} KB` : ""}</Typography>
                              </Box>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    )}
                    <Button variant="contained" size="large" onClick={() => handleGenerate("question_paper")} disabled={loading || imageProcessing || !selectedClass || !questionPattern.isValid || (!qpTopic && !questionImages.length)} sx={{ mt: 2, background: "linear-gradient(45deg, #4f46e5, #818cf8)" }}>
                      {loading ? "Generating..." : "Generate Question Paper"}
                    </Button>
                  </>
                ) : (
                  <>
                    <TextField label="Lesson Topic" fullWidth multiline rows={3} value={lsTopic} onChange={(e) => setLsTopic(e.target.value)} placeholder="What are you teaching next session?" />
                    <Button variant="contained" size="large" onClick={() => handleGenerate("lesson_summary")} disabled={loading || !lsTopic || !selectedClass || !selectedSection} sx={{ mt: 2, background: "linear-gradient(45deg, #ec4899, #f472b6)" }}>
                      {loading ? "Summarizing..." : "Generate Summary"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card sx={{ height: "100%", bgcolor: "grey.50" }}>
              <CardContent sx={{ height: "100%", minHeight: 400 }}>
                {currentResult ? (
                  <Box>
                    <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", fontFamily: "sans-serif" }}>{currentResult}</Typography>
                    {currentMeta && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Source: {currentMeta?.source_type === "rag" ? "Textbook (RAG)" : currentMeta?.source_type === "rag_vision" ? "Textbook + Captured Images" : currentMeta?.source_type === "vision" ? "Captured Images" : "Textbook Fallback"}
                        </Typography>
                        {currentMeta?.image_count ? <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Captured pages used: {currentMeta.image_count}</Typography> : null}
                      </Box>
                    )}
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                      <Button startIcon={<ContentPaste />} onClick={() => navigator.clipboard.writeText(currentResult || "")}>Copy to Clipboard</Button>
                      <Button startIcon={<PictureAsPdf />} variant="outlined" onClick={downloadPdf}>Download PDF</Button>
                      {tab === 0 && <Button startIcon={<AssignmentTurnedIn />} variant="contained" onClick={openAssignDialog}>Assign Test</Button>}
                    </Stack>
                  </Box>
                ) : (
                  <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                    <Typography variant="h6">{currentError ? "We couldn't generate content. Please adjust inputs or retry." : "AI output will appear here..."}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="lg" fullWidth fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, maxHeight: isMobile ? "100dvh" : "92vh" } }}>
          <DialogTitle sx={{ position: "sticky", top: 0, zIndex: 1, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>Assign Test</DialogTitle>
          <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5, overflowY: "auto" }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={700}>Select Students</Typography>
                  <TextField label="Search students" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} fullWidth />
                  <FormControlLabel control={<Checkbox checked={assignForm.assign_full_class} onChange={(e) => setAssignForm((prev) => ({ ...prev, assign_full_class: e.target.checked, student_ids: e.target.checked ? [] : prev.student_ids }))} />} label="Assign to full class" />
                  {!assignForm.assign_full_class && <Button onClick={() => setAssignForm((prev) => ({ ...prev, student_ids: prev.student_ids.length === filteredStudents.length ? [] : filteredStudents.map((student) => student.id) }))}>{assignForm.student_ids.length === filteredStudents.length ? "Clear Selection" : "Select All"}</Button>}
                  {studentsLoading && <Typography>Loading students...</Typography>}
                  <List dense sx={{ maxHeight: { xs: 240, sm: 360 }, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    {filteredStudents.map((student) => {
                      const checked = assignForm.student_ids.includes(student.id);
                      return (
                        <ListItem
                          key={student.id}
                          secondaryAction={!assignForm.assign_full_class ? <Checkbox edge="end" checked={checked} onChange={(e) => setAssignForm((prev) => ({ ...prev, student_ids: e.target.checked ? [...prev.student_ids, student.id] : prev.student_ids.filter((id) => id !== student.id) }))} /> : null}
                        >
                          <ListItemText primary={student?.User?.name || student?.User?.username || "Student"} secondary={`${student?.admission_no || "--"} · Roll ${student?.roll_no || "--"} · ${student?.Class?.class_name || ""}-${student?.Section?.name || ""}`} />
                        </ListItem>
                      );
                    })}
                  </List>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={700}>Assignment Settings</Typography>
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ pb: "16px !important" }}>
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle1" fontWeight={700}>{assignForm.title || "Generated Test"}</Typography>
                        <Typography variant="body2" color="text.secondary">{assignForm.subject || "General"} · {assignForm.chapter || "Assessment"}</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip size="small" label={`${assignForm.total_questions || 0} Questions`} />
                          <Chip size="small" label={`${assignForm.max_score || 0} Marks`} />
                          <Chip size="small" label={`${assignForm.duration_minutes || 0} Min`} />
                          <Chip size="small" color="warning" label="Locked Until Completed" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">Students must complete this AI test before they can access the rest of the student app.</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                  <FormControlLabel control={<Checkbox checked={assignForm.has_time_limit} onChange={(e) => setAssignForm((prev) => ({ ...prev, has_time_limit: e.target.checked }))} />} label="Enable time limit" />
                  {assignForm.has_time_limit && <TextField label="Duration (minutes)" type="number" value={assignForm.duration_minutes} onChange={(e) => setAssignForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} />}
                  <MobileDatePicker label="Schedule Date" value={toPickerValue(assignForm.schedule_date)} onChange={(value) => setAssignForm((prev) => ({ ...prev, schedule_date: value && dayjs(value).isValid() ? dayjs(value).startOf("day").toISOString() : "" }))} slotProps={{ textField: { fullWidth: true, placeholder: "Schedule date", helperText: "Set the test date." } }} />
                  <MobileTimePicker label="Start Time" value={toPickerValue(assignForm.start_time)} onChange={(value) => setAssignForm((prev) => ({ ...prev, start_time: value && dayjs(value).isValid() ? dayjs(value).toISOString() : "" }))} ampm slotProps={{ textField: { fullWidth: true, placeholder: "Start time", helperText: "Set the test start time." } }} />
                  <MobileTimePicker label="End Time" value={toPickerValue(assignForm.end_time)} onChange={(value) => setAssignForm((prev) => ({ ...prev, end_time: value && dayjs(value).isValid() ? dayjs(value).toISOString() : "" }))} ampm slotProps={{ textField: { fullWidth: true, placeholder: "End time", helperText: "Set the test end time." } }} />
                  <FormControl fullWidth>
                    <InputLabel>Result Visibility</InputLabel>
                    <Select label="Result Visibility" value={assignForm.result_visibility} onChange={(e) => setAssignForm((prev) => ({ ...prev, result_visibility: e.target.value }))}>
                      <MenuItem value="immediate">Immediate</MenuItem>
                      <MenuItem value="after_review">After Teacher Review</MenuItem>
                      <MenuItem value="hidden">Hidden</MenuItem>
                    </Select>
                  </FormControl>
                  <Alert severity="info">App lock is enabled automatically for AI tests. Students must finish the assigned test before opening other features.</Alert>
                </Stack>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ position: "sticky", bottom: 0, px: { xs: 2, sm: 3 }, py: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider", justifyContent: "space-between" }}>
            <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAssignTest} disabled={assignSaving || (!assignForm.assign_full_class && !assignForm.student_ids.length)}>{assignSaving ? "Assigning..." : "Assign Test"}</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
}
