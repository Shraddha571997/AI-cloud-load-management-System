import axios from "axios"

// In production, VITE_API_URL points to the deployed Flask backend.
// In development, leave it empty so Vite's proxy forwards /api → localhost:5000
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api"

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem("refresh_token")
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${refreshToken}` } }
          )

          const { access_token } = response.data
          localStorage.setItem("access_token", access_token)

          return api(originalRequest)
        }
      } catch (refreshError) {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("user")
        window.location.href = "/login"
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  refresh: () => api.post("/auth/refresh"),
  sendOtp: (data) => api.post("/auth/send-otp", data),
  verifyOtp: (data) => api.post("/auth/verify-otp", data),
}

// Prediction API
export const predictionAPI = {
  predict: (timeSlot) => api.get(`/predict/${timeSlot}`),
  batchPredict: (timeSlots) => api.post("/predict/batch", { time_slots: timeSlots }),
}

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get("/analytics/dashboard"),
  getHistory: (params = {}) => api.get("/history", { params }),
  getStats: (params = {}) => api.get("/stats", { params }),
  getInsights: () => api.get("/insights"),
  getLatest: () => api.get("/analytics/latest"),
  getLiveLoad: () => api.get("/simulate-load"),
  addInstance: () => api.post("/instances/add"),
  removeInstance: () => api.post("/instances/remove"),
  exportCSV: (params = {}) => api.get("/export/csv", { params, responseType: 'blob' }),
  exportPDF: (params = {}) => api.get("/export/pdf", { params, responseType: 'blob' }),
}

// User API
export const userAPI = {
  updateProfile: (data) => api.put("/user/profile", data),
}

// System API
export const systemAPI = {
  getRealtimeStats: () => api.get("/system/realtime"),
}

// Admin API
export const adminAPI = {
  getUsers: () => api.get("/admin/users"),
  getStats: () => api.get("/admin/system-stats"),
  getAuditLogs: (params) => api.get("/admin/audit-logs", { params }),
  retrainModel: () => api.post("/admin/retrain-model"),
  getSystemStats: () => api.get("/admin/system-stats"),
  deleteUser: (id) => api.delete(`/admin/user/${id}`),
}

// Health API
export const healthAPI = {
  check: () => api.get("/health"),
}

// Auto-Pilot API
export const autopilotAPI = {
  getStatus: () => api.get("/scheduler/config"),
  start: (data) => api.post("/start-autopilot", data),
  stop: () => api.post("/stop-autopilot"),
}

export default api
