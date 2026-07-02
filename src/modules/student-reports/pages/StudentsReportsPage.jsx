import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  Assessment,
  MenuBook,
  People,
  Person,
  TrendingDown,
  TrendingUp,
} from "@mui/icons-material";
import {
  getTeacherAssignments,
  getTeacherAttendanceSummary,
  getTeacherSectionStudents,
  getTeacherStudentReports,
} from "../studentReports.api";
import {
  buildAttendanceMap,
  buildClassTeacherScopes,
  buildStudentAnalytics,
  buildSubjectTeacherScopes,
  filterStudentsByTeacher,
  getFallbackHint,
  getInitialRoleMode,
  getInitialScopeKey,
  getScopeByKey,
  getStudentDetailSections,
  sortStudentsForRole,
} from "../studentReports.logic";

const badgeColorMap = {
  "Top Performer": "success",
  "Needs Improvement": "error",
};

export default function StudentsReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceItems, setAttendanceItems] = useState([]);
  const [serverAnalytics, setServerAnalytics] = useState(null);
  const [roleMode, setRoleMode] = useState("class_teacher");
  const [scopeKey, setScopeKey] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const reportPayload = await getTeacherStudentReports().catch(() => null);
        if (
          reportPayload
          && Array.isArray(reportPayload.assignments)
          && Array.isArray(reportPayload.students)
          && Array.isArray(reportPayload.analytics)
        ) {
          if (!active) return;
          setAssignments(reportPayload.assignments);
          setStudents(reportPayload.students);
          setAttendanceItems([]);
          setServerAnalytics(reportPayload.analytics);
          return;
        }

        const assignmentRows = await getTeacherAssignments();
        if (!active) return;
        setAssignments(Array.isArray(assignmentRows) ? assignmentRows : []);
        setServerAnalytics(null);

        const uniqueScopes = Array.from(
          new Map(
            (Array.isArray(assignmentRows) ? assignmentRows : []).map((assignment) => {
              const classId = Number(assignment?.class_id || assignment?.Class?.id || assignment?.class?.id || 0);
              const sectionId = Number(assignment?.section_id || assignment?.Section?.id || assignment?.section?.id || 0);
              return [`${classId}-${sectionId}`, { class_id: classId, section_id: sectionId }];
            })
          ).values()
        ).filter((scope) => scope.class_id && scope.section_id);

        const [studentGroups, attendanceRows] = await Promise.all([
          Promise.all(uniqueScopes.map((scope) => getTeacherSectionStudents(scope).catch(() => []))),
          getTeacherAttendanceSummary({ limit: 2000 }).catch(() => []),
        ]);

        if (!active) return;

        const studentMap = new Map();
        studentGroups.flat().forEach((student) => {
          const studentId = Number(student?.id || 0);
          if (studentId) studentMap.set(studentId, student);
        });

        setStudents(Array.from(studentMap.values()));
        setAttendanceItems(Array.isArray(attendanceRows) ? attendanceRows : []);
      } catch (loadError) {
        console.error("Failed to load student reports", loadError);
        if (active) setError("Failed to load students reports.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const classTeacherScopes = useMemo(() => buildClassTeacherScopes(assignments), [assignments]);
  const subjectTeacherScopes = useMemo(() => buildSubjectTeacherScopes(assignments), [assignments]);

  useEffect(() => {
    const initialRole = getInitialRoleMode(classTeacherScopes, subjectTeacherScopes);
    setRoleMode((current) => current || initialRole);
  }, [classTeacherScopes, subjectTeacherScopes]);

  useEffect(() => {
    const nextScopeKey = getInitialScopeKey({
      roleMode,
      classTeacherScopes,
      subjectTeacherScopes,
    });

    setScopeKey((current) => {
      if (current) {
        const exists = getScopeByKey({ roleMode, scopeKey: current, classTeacherScopes, subjectTeacherScopes });
        if (exists) return current;
      }
      return nextScopeKey;
    });
  }, [roleMode, classTeacherScopes, subjectTeacherScopes]);

  const selectedScope = useMemo(
    () => getScopeByKey({ roleMode, scopeKey, classTeacherScopes, subjectTeacherScopes }),
    [roleMode, scopeKey, classTeacherScopes, subjectTeacherScopes]
  );

  const attendanceMap = useMemo(() => buildAttendanceMap(attendanceItems), [attendanceItems]);
  const analytics = useMemo(() => {
    if (Array.isArray(serverAnalytics)) return serverAnalytics;
    return buildStudentAnalytics({ students, assignments, attendanceMap });
  }, [serverAnalytics, students, assignments, attendanceMap]);

  const visibleStudents = useMemo(() => {
    const filtered = filterStudentsByTeacher({
      roleMode,
      selectedScope,
      students,
      analytics,
    });
    return sortStudentsForRole(filtered, roleMode);
  }, [roleMode, selectedScope, students, analytics]);

  useEffect(() => {
    if (!visibleStudents.length) {
      setSelectedStudentId(null);
      return;
    }

    setSelectedStudentId((current) =>
      visibleStudents.some((item) => item.studentId === current)
        ? current
        : visibleStudents[0].studentId
    );
  }, [visibleStudents]);

  const selectedStudent = useMemo(
    () => visibleStudents.find((item) => item.studentId === selectedStudentId) || null,
    [visibleStudents, selectedStudentId]
  );

  const detailSections = useMemo(
    () => getStudentDetailSections({ roleMode, studentReport: selectedStudent }),
    [roleMode, selectedStudent]
  );

  const fallbackHint = useMemo(() => getFallbackHint(visibleStudents), [visibleStudents]);

  const handleRoleChange = (_, value) => {
    setRoleMode(value);
    setScopeKey("");
    setSelectedStudentId(null);
  };

  if (loading) {
    return (
      <Container sx={{ mt: 6, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3, pb: 10 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Students Reports
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Review student academic and attendance performance by teacher role.
          </Typography>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {!classTeacherScopes.length && !subjectTeacherScopes.length ? (
          <Alert severity="info">No teacher assignments found for reports access.</Alert>
        ) : null}

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Tabs value={roleMode} onChange={handleRoleChange} variant="fullWidth">
              <Tab
                value="class_teacher"
                label="Class Teacher"
                icon={<People fontSize="small" />}
                iconPosition="start"
                disabled={!classTeacherScopes.length}
              />
              <Tab
                value="subject_teacher"
                label="Subject Teacher"
                icon={<MenuBook fontSize="small" />}
                iconPosition="start"
                disabled={!subjectTeacherScopes.length}
              />
            </Tabs>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>{roleMode === "class_teacher" ? "Class Scope" : "Subject Scope"}</InputLabel>
                  <Select
                    value={scopeKey}
                    label={roleMode === "class_teacher" ? "Class Scope" : "Subject Scope"}
                    onChange={(event) => setScopeKey(event.target.value)}
                  >
                    {(roleMode === "class_teacher" ? classTeacherScopes : subjectTeacherScopes).map((scope) => (
                      <MenuItem key={scope.key} value={scope.key}>
                        {scope.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

            </Grid>

            {fallbackHint ? <Alert severity="info">{fallbackHint}</Alert> : null}
          </Stack>
        </Paper>

        <Grid container spacing={2.5} alignItems="stretch">
          <Grid item xs={12} md={4} lg={3.8}>
            <Paper sx={{ borderRadius: 3, overflow: "hidden", height: { xs: "auto", md: "76vh" }, display: "flex", flexDirection: "column" }}>
              <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Student List
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {visibleStudents.length} student{visibleStudents.length !== 1 ? "s" : ""} in this view
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflowY: "auto" }}>
                {visibleStudents.length === 0 ? (
                  <Box sx={{ p: 3 }}>
                    <Alert severity="info">No students available for the selected teacher scope.</Alert>
                  </Box>
                ) : (
                  <List disablePadding>
                    {visibleStudents.map((student) => {
                      const active = student.studentId === selectedStudentId;
                      const scoreLabel = roleMode === "subject_teacher"
                        ? `${student.subjectSummary?.marks ?? 0}% ${selectedScope?.subjectName || "Subject"}`
                        : `${student.overallAverage}% overall`;

                      return (
                        <ListItemButton
                          key={student.studentId}
                          selected={active}
                          onClick={() => setSelectedStudentId(student.studentId)}
                          sx={{
                            alignItems: "flex-start",
                            px: 2,
                            py: 1.75,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <ListItemText
                            primary={
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography fontWeight={700} noWrap>
                                      {student.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                      {student.username}
                                    </Typography>
                                  </Box>
                                  {student.badge ? (
                                    <Chip
                                      size="small"
                                      label={student.badge}
                                      color={badgeColorMap[student.badge] || "default"}
                                      sx={{ fontWeight: 700 }}
                                    />
                                  ) : null}
                                </Stack>

                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  <Chip size="small" label={scoreLabel} color={roleMode === "subject_teacher" && student.belowThreshold ? "error" : "primary"} />
                                  <Chip size="small" label={`Attendance ${student.attendancePct}%`} color={student.attendancePct < 75 ? "warning" : "success"} variant="outlined" />
                                </Stack>

                                {roleMode === "class_teacher" && student.classWeakSubjects.length ? (
                                  <Typography variant="caption" color="error.main">
                                    Weak: {student.classWeakSubjects.map((item) => item.subject).join(", ")}
                                  </Typography>
                                ) : null}

                                {roleMode === "subject_teacher" && student.weakTopics.length ? (
                                  <Typography variant="caption" color="error.main">
                                    Weak topics: {student.weakTopics.map((item) => item.topic).join(", ")}
                                  </Typography>
                                ) : null}
                              </Stack>
                            }
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8} lg={8.2}>
            <Paper sx={{ borderRadius: 3, p: 3, minHeight: { xs: 420, md: "76vh" }, display: "flex", flexDirection: "column" }}>
              {!selectedStudent ? (
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Alert severity="info">Select a student to view detailed academic analysis.</Alert>
                </Box>
              ) : (
                <Stack spacing={2.5} sx={{ height: "100%" }}>
                  <Box>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {selectedStudent.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedStudent.username} • Class {selectedStudent.className} • Section {selectedStudent.sectionName}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          icon={<Assessment fontSize="small" />}
                          label={roleMode === "subject_teacher" ? `${detailSections?.headlineScore ?? 0}% in ${selectedScope?.subjectName}` : `${detailSections?.headlineScore ?? 0}% overall`}
                          color={detailSections?.headlineScore >= 75 ? "success" : detailSections?.headlineScore < 40 ? "error" : "primary"}
                        />
                        <Chip
                          label={`Attendance ${selectedStudent.attendancePct}%`}
                          color={selectedStudent.attendancePct < 75 ? "warning" : "success"}
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Academic Analysis
                          </Typography>
                          <Stack spacing={1.5}>
                            <Chip label={selectedStudent.badge || "Steady Progress"} color={badgeColorMap[selectedStudent.badge] || "default"} sx={{ fontWeight: 700, width: "fit-content" }} />
                            {roleMode === "class_teacher" ? (
                              <>
                                <Typography variant="body2">
                                  Strong subjects: {selectedStudent.strongSubjects.length ? selectedStudent.strongSubjects.map((item) => item.subject).join(", ") : "None"}
                                </Typography>
                                <Typography variant="body2" color={selectedStudent.weakSubjects.length ? "error.main" : "text.secondary"}>
                                  Weak subjects: {selectedStudent.weakSubjects.length ? selectedStudent.weakSubjects.map((item) => item.subject).join(", ") : "None"}
                                </Typography>
                                <Typography variant="body2" color={selectedStudent.attendancePct < 75 ? "warning.main" : "text.secondary"}>
                                  {selectedStudent.attendancePct < 75 ? "Low attendance flagged" : "Attendance is within healthy range"}
                                </Typography>
                              </>
                            ) : (
                              <>
                                <Typography variant="body2">
                                  Subject score: {selectedStudent.subjectSummary?.marks ?? 0}%
                                </Typography>
                                <Typography variant="body2" color={selectedStudent.belowThreshold ? "error.main" : "text.secondary"}>
                                  {selectedStudent.belowThreshold ? "Below 40% threshold" : "Above minimum subject threshold"}
                                </Typography>
                                <Typography variant="body2" color={selectedStudent.weakTopics.length ? "error.main" : "text.secondary"}>
                                  Weak topics: {selectedStudent.weakTopics.length ? selectedStudent.weakTopics.map((item) => item.topic).join(", ") : "None"}
                                </Typography>
                              </>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={8}>
                      <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Subject Breakdown
                          </Typography>
                          <Stack spacing={1.5}>
                            {detailSections?.subjectSummary?.map((subject) => (
                              <Box key={subject.subject} sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.default" }}>
                                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                                  <Typography fontWeight={700}>{subject.subject}</Typography>
                                  <Chip
                                    size="small"
                                    label={`${subject.marks}%`}
                                    color={subject.marks > 75 ? "success" : subject.marks < 40 ? "error" : "primary"}
                                  />
                                </Stack>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                  {subject.strongTopics?.slice(0, 2).map((topic) => (
                                    <Chip key={`${subject.subject}-${topic.topic}`} size="small" variant="outlined" color="success" label={`${topic.topic} strong`} />
                                  ))}
                                  {subject.weakTopics?.slice(0, 2).map((topic) => (
                                    <Chip key={`${subject.subject}-${topic.topic}`} size="small" variant="outlined" color="error" label={`${topic.topic} weak`} />
                                  ))}
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Divider />

                  <Grid container spacing={2} sx={{ flex: 1 }}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Weak Topics
                          </Typography>
                          {detailSections?.weakTopics?.length ? (
                            <Stack spacing={1}>
                              {detailSections.weakTopics.map((topic) => (
                                <Box key={`${topic.subject || selectedScope?.subjectName}-${topic.topic}`} sx={{ p: 1.25, borderRadius: 2, bgcolor: "error.lighter", border: "1px solid", borderColor: "error.light" }}>
                                  <Typography fontWeight={700} color="error.main">
                                    {topic.subject ? `${topic.subject} • ` : ""}{topic.topic}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Score {topic.score}%
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          ) : (
                            <Alert severity="success">No weak topics flagged in this view.</Alert>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Strong Areas
                          </Typography>
                          {detailSections?.strongTopics?.length ? (
                            <Stack spacing={1}>
                              {detailSections.strongTopics.map((topic) => (
                                <Box key={`${topic.subject || selectedScope?.subjectName}-${topic.topic}`} sx={{ p: 1.25, borderRadius: 2, bgcolor: "success.lighter", border: "1px solid", borderColor: "success.light" }}>
                                  <Typography fontWeight={700} color="success.main">
                                    {topic.subject ? `${topic.subject} • ` : ""}{topic.topic}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Score {topic.score}%
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          ) : (
                            <Alert severity="info">Strong topic data will appear here when available.</Alert>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
