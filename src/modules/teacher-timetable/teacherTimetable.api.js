import api from "../../api/axios";

export const getMyTeacherTimetable = () =>
  api.get("/timetables/teacher/me");

export const saveTimetable = (data) =>
  api.post("/timetables", data);

export const getMyTeacherAssignments = () =>
  api.get("/teacher-assignments/teacher/me");

export const getSectionAssignments = (sectionId) =>
  api.get(`/teacher-assignments/section/${sectionId}`);

export const getSectionTimetable = (classId, sectionId) =>
  api.get(`/timetables/section`, { params: { class_id: classId, section_id: sectionId } });
