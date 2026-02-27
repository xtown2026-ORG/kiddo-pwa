import api from "../../api/axios";

// Rename to clarify it fetches homework list, or keep for backward compat
export const getDiary = (params = {}) =>
  api.get("/homework", { params });

export const createHomework = (data) =>
  api.post("/homework", data);

export const listHomework = (params = {}) =>
  api.get("/homework", { params });

export const submitHomework = (id, data) =>
  api.post(`/homework/${id}/submit`, data);

export const getHomeworkSummary = () =>
  api.get("/homework/analytics/summary");

export const getHomeworkStudentStatus = (id) =>
  api.get(`/homework/analytics/${id}/students`);
