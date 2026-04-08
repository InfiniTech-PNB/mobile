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
            return {
                token,
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
            const token = await SecureStore.getItemAsync('token');
            if (token) {
                const userData = getUserFromToken(token);
                if (userData) setUser(userData);
            }
            setLoading(false);
        };
        loadToken();
    }, []);

    const login = async (token) => {
        await SecureStore.setItemAsync('token', token);
        const userData = getUserFromToken(token);
        setUser(userData);
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