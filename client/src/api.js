import axios from 'axios';
const apiHost=typeof window!=='undefined'&&window.location.hostname?window.location.hostname:'localhost';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||`http://${apiHost}:5000/api/v1`,withCredentials:true});
api.interceptors.response.use(r=>r.data,e=>Promise.reject(e.response?.data||{message:'Unable to reach Eventify. Check that the API is running.'}));
export default api;
