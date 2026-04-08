import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API = axios.create({
    // REPLACE THIS with your computer's IP address to work on a real phone!
    baseURL: 'http://10.191.217.191:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the JWT token automatically
API.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default API;