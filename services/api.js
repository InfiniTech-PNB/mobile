import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API = axios.create({
    // 1. Ensure this IP is correct and the PORT matches your backend!
    baseURL: 'http://10.191.217.191:3000/api', 
    headers: {
        'Content-Type': 'application/json',
    },
});

API.interceptors.request.use(async (config) => {
    try {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            // This log helps us see if the interceptor actually found the token
            console.log("✈️ API: Token attached to request");
        } else {
            console.log("⚠️ API: No token found in SecureStore for this request");
        }
    } catch (error) {
        console.error("❌ API: SecureStore Error", error);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// We are NOT adding a response interceptor yet. 
// We want to see the raw errors in the screen first.

export default API;