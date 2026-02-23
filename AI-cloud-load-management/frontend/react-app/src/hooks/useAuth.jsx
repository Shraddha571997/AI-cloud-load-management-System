import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
};

const authReducer = (state, action) => {
    switch (action.type) {
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                isAuthenticated: true,
                isLoading: false,
            };
        case 'LOGOUT':
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
            };
        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload,
            };
        default:
            return state;
    }
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('access_token');
        const user = localStorage.getItem('user');

        if (token && user) {
            try {
                const userData = JSON.parse(user);
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: { user: userData },
                });
            } catch (error) {
                console.error('Error parsing user data:', error);
                logout();
            }
        } else {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    const login = async (credentials) => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            const response = await authAPI.login(credentials);
            const { access_token, refresh_token, user } = response.data;

            // Store tokens and user data
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            localStorage.setItem('user', JSON.stringify(user));

            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { user },
            });

            toast.success(`Welcome back, ${user.username}!`);
            return { success: true };
        } catch (error) {
            dispatch({ type: 'SET_LOADING', payload: false });
            const message = error.response?.data?.message || 'Login failed';
            toast.error(message);
            return { success: false, message };
        }
    };

    const register = async (userData) => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            await authAPI.register(userData);

            toast.success('Registration successful! Please login.');
            dispatch({ type: 'SET_LOADING', payload: false });
            return { success: true };
        } catch (error) {
            dispatch({ type: 'SET_LOADING', payload: false });
            const message = error.response?.data?.message || 'Registration failed';
            toast.error(message);
            return { success: false, message };
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');

        dispatch({ type: 'LOGOUT' });
        toast.success('Logged out successfully');
    };

    const value = {
        ...state,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};