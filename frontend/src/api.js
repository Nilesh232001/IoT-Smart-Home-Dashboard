import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default {
  login: (username, password) => axios.post(`${API_BASE}/auth/login`, { username, password }),
  publish: (topic, message, token) => axios.post(`${API_BASE}/api/publish`, { topic, message }, { headers: { Authorization: `Bearer ${token}` }}),
};
