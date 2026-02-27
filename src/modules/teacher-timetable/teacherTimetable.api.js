import api from "../../api/axios";

export const getMyTeacherTimetable = () =>
  api.get("/timetables/teacher/me");

export const saveTimetable = (data) =>
  api.post("/timetables", data);

export const getMyTeacherAssignments = () =>
  api.get("/teacher-assignments/teacher/me");

export const getSectionAssignments = (sectionId) =>
  api.get(`/teacher-assignments/section/${sectionId}`);
