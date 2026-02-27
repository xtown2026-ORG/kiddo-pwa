import api from "../../api/axios";

export const startClassSession = (data) =>
    api.post("/teacher-class-sessions/start", data);

export const endClassSession = (sessionId) =>
    api.post(`/teacher-class-sessions/${sessionId}/end`);

export const listClassSessions = (date) =>
    api.get("/teacher-class-sessions", { params: date ? { date } : {} });

export const markSessionAttendance = async (sessionId, records) => {
    const normalizedSessionId = Number(sessionId);
    const normalizedRecords = (records || [])
        .map((r) => ({
            student_id: Number(r.student_id),
            status: String(r.status || "").trim().toLowerCase().replace(/\s+/g, "_"),
        }))
        .filter(
            (r) =>
                Number.isInteger(r.student_id) &&
                r.student_id > 0 &&
                ["present", "absent", "leave", "on_duty"].includes(r.status)
        );

    const payload = {
        teacher_class_session_id: normalizedSessionId,
        records: normalizedRecords,
    };

    return api.post("/teachers/attendance", payload);
};

export const listStudentsBySection = (classId, sectionId) =>
    api.get("/students", {
        params: {
            class_id: classId,
            section_id: sectionId,
            limit: 500,
        },
    });
