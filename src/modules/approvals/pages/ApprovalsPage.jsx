import { Box, Typography, Card, CardContent, Button, Avatar, Chip, Container, Stack, Divider, CircularProgress, Alert, Tabs, Tab } from "@mui/material";
import { Check, Close } from "@mui/icons-material";
import { useState, useEffect, useMemo } from "react";
import { getTeacherPendingApprovals, approveRequest, approveParentRequest } from "../approvals.api";

const detailFields = [
    "username",
    "name",
    "email",
    "phone",
    "gender",
    "dob",
    "blood_group",
    "address",
    "class",
    "section",
    "father_name",
    "mother_name",
    "guardian_name",
    "admission_no",
    "roll_no",
];

function isInvalidName(value) {
    const v = String(value || "").trim();
    if (!v) return true;
    if (/^student$/i.test(v)) return true;
    if (/^user\s*#?/i.test(v)) return true;
    return false;
}

function getDisplayName(req, tab) {
    const parentName =
        req?.user?.name ||
        req?.name ||
        req?.parent?.user?.name ||
        req?.parent?.name ||
        "";
    const studentName =
        req?.student?.user?.name ||
        req?.student?.name ||
        "";
    const username =
        req?.user?.username ||
        req?.parent?.user?.username ||
        req?.student?.user?.username ||
        req?.username ||
        "";

    const preferred = tab === "parents" ? parentName : studentName || parentName;
    if (!isInvalidName(preferred)) return preferred;
    if (!isInvalidName(parentName)) return parentName;
    if (!isInvalidName(studentName)) return studentName;
    return username;
}

export default function ApprovalsPage() {
    const [studentRequests, setStudentRequests] = useState([]);
    const [parentRequests, setParentRequests] = useState([]);
    const [activeTab, setActiveTab] = useState("students");
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [actionError, setActionError] = useState("");

    const fetchApprovals = async () => {
        try {
            setLoading(true);
            const res = await getTeacherPendingApprovals();
            const payload = res?.data ?? res ?? {};
            const data = payload?.data ?? payload;

            const items = data?.items ?? [];
            const students =
                data?.students?.items ??
                data?.students?.rows ??
                data?.students ??
                data?.pending_students?.items ??
                data?.pending_students ??
                data?.student_requests ??
                data?.student_approvals ??
                data?.studentApprovals ??
                (Array.isArray(items) ? items : []);

            const parents =
                data?.parents?.items ??
                data?.parents?.rows ??
                data?.parents ??
                data?.pending_parents?.items ??
                data?.pending_parents ??
                data?.parent_requests ??
                data?.parent_approvals ??
                data?.parentApprovals ??
                [];

            const normalizedStudents = Array.isArray(students) ? students : [];
            const normalizedParents = Array.isArray(parents) ? parents : [];

            if (normalizedParents.length === 0 && Array.isArray(items)) {
                const split = items.reduce(
                    (acc, item) => {
                        const typeHint = String(item?.type || item?.profile_type || item?.request_type || "").toLowerCase();
                        const isParent =
                            typeHint.includes("parent") ||
                            Boolean(item?.parent_id || item?.parent || item?.relation_type);
                        if (isParent) acc.parents.push(item);
                        else acc.students.push(item);
                        return acc;
                    },
                    { students: [], parents: [] }
                );
                setStudentRequests(normalizedStudents.length ? normalizedStudents : split.students);
                setParentRequests(normalizedParents.length ? normalizedParents : split.parents);
            } else {
                setStudentRequests(normalizedStudents);
                setParentRequests(normalizedParents);
            }
        } catch (err) {
            console.error("Failed to load approvals", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovals();
    }, []);

    const handleAction = async (type, id, action) => {
        try {
            setActionError("");
            if (type === "parent_profile") {
                await approveParentRequest(id, action);
                setParentRequests(prev => prev.filter(r => resolveParentId(r) !== Number(id)));
            } else {
                await approveRequest(type, id, action);
                setStudentRequests(prev => prev.filter(r => resolveApprovalId(r) !== Number(id)));
            }
            if (expandedId === Number(id)) setExpandedId(null);
        } catch (err) {
            console.error(`Failed to ${action} request`, err);
            setActionError(err?.response?.data?.message || err?.message || `Failed to ${action} request`);
        }
    };

    const sortApprovalsDescending = useMemo(
        () => (items) =>
            [...items].sort((left, right) => {
                const leftDate = new Date(left.updated_at || left.created_at || left.updatedAt || left.createdAt || 0);
                const rightDate = new Date(right.updated_at || right.created_at || right.updatedAt || right.createdAt || 0);

                const timeDiff = rightDate.getTime() - leftDate.getTime();
                if (timeDiff !== 0) return timeDiff;

                const leftName = getDisplayName(left, activeTab);
                const rightName = getDisplayName(right, activeTab);

                return String(leftName).localeCompare(String(rightName), undefined, {
                    numeric: true,
                    sensitivity: "base",
                });
            }),
        [activeTab]
    );

    const requests = activeTab === "students"
        ? sortApprovalsDescending(studentRequests)
        : sortApprovalsDescending(parentRequests);

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ mb: 4, borderBottom: 1, borderColor: 'divider', pb: 2 }}>
                <Typography variant="h4" fontWeight="bold">
                    Pending Approvals
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Review student and parent requests (class teacher scope)
                </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, value) => {
                        setActiveTab(value);
                        setExpandedId(null);
                    }}
                    variant="fullWidth"
                >
                    <Tab
                        value="students"
                        label={`Students (${studentRequests.length})`}
                    />
                    <Tab
                        value="parents"
                        label={`Parents (${parentRequests.length})`}
                    />
                </Tabs>
            </Box>
            {actionError ? (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError("")}>
                    {actionError}
                </Alert>
            ) : null}

            {requests.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'background.paper', borderRadius: 2 }}>
                    <Check sx={{ fontSize: 60, color: 'success.light', mb: 2 }} />
                    <Typography variant="h6">All caught up!</Typography>
                    <Typography color="text.secondary">
                        No pending {activeTab} requests to review.
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={2}>
                    {requests.map((req) => {
                        const approvalId = resolveApprovalId(req);
                        const parentId = resolveParentId(req);
                        const isExpanded = expandedId === approvalId;
                        const isParentTab = activeTab === "parents";
                        const name = getDisplayName(req, activeTab) || (isParentTab ? "Parent" : "Student");
                        const initial = name?.[0] || "U";
                        const className =
                            req.class?.class_name ||
                            req.student?.class?.class_name ||
                            req.class_id ||
                            "-";
                        const sectionName =
                            req.section?.name ||
                            req.student?.section?.name ||
                            req.section_id ||
                            "-";
                        const requestedText = formatRequestedAt(req.updated_at || req.created_at || req.updatedAt || req.createdAt);
                        return (
                        <Card
                            key={approvalId || `${req.student_id}-${req.section_id}`}
                            sx={{ overflow: 'visible', cursor: 'pointer' }}
                            onClick={() => setExpandedId(isExpanded ? null : approvalId)}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Avatar
                                        src={req.user?.avatar_url || req.student?.user?.avatar_url || req.student?.avatar}
                                        sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}
                                    >
                                        {initial}
                                    </Avatar>

                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                            <Typography variant="h6">
                                                {name}
                                            </Typography>
                                            <Chip label={isParentTab ? "Parent Profile" : (req.type || "Profile Update")} size="small" color="info" variant="outlined" />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {isParentTab
                                              ? `${req.relation_type || "Parent"} • Class ${className} - ${sectionName}`
                                              : `Class ${className} - ${sectionName}`}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                            {requestedText}
                                        </Typography>

                                        {isExpanded && req.changes && (
                                            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                                <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                                                    REQUESTED CHANGES
                                                </Typography>
                                                {Object.entries(req.changes).map(([key, value]) => (
                                                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                                            {key.replace('_', ' ')}:
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {String(value)}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                </Box>

                                {isExpanded && (
                                  <>
                                    <Divider sx={{ my: 2 }} />
                                    <Stack spacing={0.75} sx={{ mb: 2 }}>
                                      {detailFields.map((field) => {
                                        let value =
                                          req?.student?.user?.[field] ??
                                          req?.student?.[field] ??
                                          req?.user?.[field] ??
                                          req?.[field];

                                        if (field === "username") {
                                          value = req?.student?.user?.username || req?.user?.username || req?.username;
                                        }
                                        if (field === "class") value = className;
                                        if (field === "section") value = sectionName;

                                        if (value === undefined || value === null || value === "") return null;

                                        return (
                                          <Box key={field} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                              {field.replace("_", " ")}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                              {String(value)}
                                            </Typography>
                                          </Box>
                                        );
                                      })}
                                    </Stack>

                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                      <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<Close />}
                                        onClick={(e) => { e.stopPropagation(); handleAction(isParentTab ? 'parent_profile' : 'student_profile', isParentTab ? parentId : approvalId, 'reject'); }}
                                      >
                                        Reject
                                      </Button>
                                      <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<Check />}
                                        onClick={(e) => { e.stopPropagation(); handleAction(isParentTab ? 'parent_profile' : 'student_profile', isParentTab ? parentId : approvalId, 'approve'); }}
                                      >
                                        Approve
                                      </Button>
                                    </Box>
                                  </>
                                )}

                            </CardContent>
                        </Card>
                        );
                    })}
                </Stack>
            )}
        </Container>
    );
}

function resolveApprovalId(req) {
    const raw =
        req?.approval_id ??
        req?.request_id ??
        req?.id ??
        req?.student_id ??
        req?.student?.id ??
        req?.user_id ??
        req?.user?.id ??
        req?.parent_id ??
        req?.parent?.id;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function resolveParentId(req) {
    const raw =
        req?.parent_id ??
        req?.parent?.id ??
        req?.id ??
        req?.user_id ??
        req?.user?.id;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatRequestedAt(ts) {
    if (!ts) return "Date: N/A\nTime: N/A";

    const date = new Date(ts);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Date: ${dateStr}\nTime: ${timeStr}`;
}
