import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const getUserFromToken = (token) => {
        try {
            const decoded = jwtDecode(token);
            const currentTime = Date.now() / 1000;
            
            if (decoded.exp < currentTime) {
                console.warn("Token has expired.");
                return null;
            }
            
            return {
                token, // Keep the token string in the object
                id: decoded.id,
                role: decoded.role,
                name: decoded.name,
                email: decoded.email
            };
        } catch (error) {
            return null;
        }
    };

    useEffect(() => {
        const loadToken = async () => {
            try {
                const token = await SecureStore.getItemAsync('token');
                console.log("Token found in SecureStore:", token ? "YES" : "NO");
                
                if (token) {
                    const userData = getUserFromToken(token);
                    if (userData) {
                        setUser(userData);
                    } else {
                        await SecureStore.deleteItemAsync('token');
                    }
                }
            } catch (e) {
                console.error("SecureStore load error:", e);
            } finally {
                setLoading(false);
            }
        };
        loadToken();
    }, []);

    const login = async (token) => {
        try {
            // 1. SAVE to storage
            await SecureStore.setItemAsync('token', token);

            // 2. Update STATE immediately
            const userData = getUserFromToken(token);
            setUser(userData);

            console.log("✅ AuthState: Token saved and user set");
            // NOTE: We do NOT navigate here. We let the _layout.jsx handle it.
        } catch (err) {
            console.error("Failed to save token", err);
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);