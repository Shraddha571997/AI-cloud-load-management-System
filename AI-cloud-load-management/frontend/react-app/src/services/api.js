import axios from "axios"

const API_BASE_URL = "/api"

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
  retrainModel: () => api.post("/admin/retrain-model"),
  getSystemStats: () => api.get("/admin/system-stats"),
}

// Health API
export const healthAPI = {
  check: () => api.get("/health"),
}

export default api
