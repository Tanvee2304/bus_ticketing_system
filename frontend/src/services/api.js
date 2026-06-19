import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE });

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Buses
export const getBuses = (params = {}) => api.get('/buses', { params });
export const getAllBuses = () => api.get('/buses/all');
export const getBus = (id) => api.get(`/buses/${id}`);
export const createBus = (data) => api.post('/buses', data);
export const updateBus = (id, data) => api.put(`/buses/${id}`, data);
export const deleteBus = (id) => api.delete(`/buses/${id}`);

// Bookings
export const createBooking = (data) => api.post('/bookings', data);
export const getMyBookings = () => api.get('/bookings/my');
export const getAllBookings = () => api.get('/bookings/all');
export const cancelBooking = (id) => api.patch(`/bookings/${id}/cancel`);

// AI Search
export const aiSearch = (query) => api.post('/ai/search', { query });

// Smart Seat Optimizer
export const previewSeats = (bus_id, seat_count) => api.post('/bookings/preview-seats', { bus_id, seat_count });
export const getSeatMap = (busId) => api.get(`/buses/${busId}/seat-map`);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getOccupancy = () => api.get('/dashboard/occupancy');
export const getRouteStats = () => api.get('/dashboard/routes');

export default api;
