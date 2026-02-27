import api from "../../api/axios";

export const getMyPaymentLogs = () => api.get("/payment-logs/me");
