import axios from "axios";

// If we are in production (like on Vercel), the API is served at the same domain.
// In development, it defaults to localhost:5000.
const baseURL = import.meta.env.VITE_API_URL || 
                (import.meta.env.PROD ? "/" : "http://localhost:5000");

const instance = axios.create({
  baseURL,
});

instance.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem("userInfo");
  if (userInfo) {
    try {
      const { token } = JSON.parse(userInfo);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Failed to parse userInfo from localStorage", e);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default instance;

