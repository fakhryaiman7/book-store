import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const instance = axios.create({
  baseURL,
});

instance.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem("userInfo");
  if (userInfo) {
    const { token } = JSON.parse(userInfo);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default instance;
