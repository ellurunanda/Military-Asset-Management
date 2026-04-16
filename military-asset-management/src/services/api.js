import axios from "axios";

const BASE_URL =
  process.env.REACT_APP_API_URL ||
  "https://military-asset-management-hmk4.onrender.com/api";

// create axios instance with base url
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// if token expired, kick user back to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// auth endpoints
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  getUsers: () => api.get("/auth/users"),
  register: (data) => api.post("/auth/register", data),
};

// dashboard endpoints
export const dashboardAPI = {
  getSummary: (params) => api.get("/dashboard/summary", { params }),
  getBases: () => api.get("/dashboard/bases"),
  getAssetTypes: () => api.get("/dashboard/asset-types"),
  getNetMovements: (params) => api.get("/dashboard/net-movements", { params }),
};

// purchases
export const purchasesAPI = {
  getAll: (params) => api.get("/purchases", { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post("/purchases", data),
  delete: (id) => api.delete(`/purchases/${id}`),
};

// transfers
export const transfersAPI = {
  getAll: (params) => api.get("/transfers", { params }),
  getById: (id) => api.get(`/transfers/${id}`),
  create: (data) => api.post("/transfers", data),
  delete: (id) => api.delete(`/transfers/${id}`),
};

// assignments and expenditures
export const assignmentsAPI = {
  getAll: (params) => api.get("/assignments", { params }),
  create: (data) => api.post("/assignments", data),
  markReturned: (id, data) => api.patch(`/assignments/${id}/return`, data),
  getExpenditures: (params) => api.get("/assignments/expenditures", { params }),
  createExpenditure: (data) => api.post("/assignments/expenditures", data),
};

export default api;
