import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { message } from 'antd';

// Auth State
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  permissions: []
};

// Auth Actions
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  CHANGE_PASSWORD_START: 'CHANGE_PASSWORD_START',
  CHANGE_PASSWORD_SUCCESS: 'CHANGE_PASSWORD_SUCCESS',
  CHANGE_PASSWORD_FAILURE: 'CHANGE_PASSWORD_FAILURE',
  SET_PERMISSIONS: 'SET_PERMISSIONS',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Auth Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.CHANGE_PASSWORD_START:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        permissions: action.payload.permissions || [],
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.CHANGE_PASSWORD_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
        isAuthenticated: false,
        user: null
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState
      };

    case AUTH_ACTIONS.CHANGE_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.SET_PERMISSIONS:
      return {
        ...state,
        permissions: action.payload
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Create Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication on app load
  useEffect(() => {
    // Note: Auto-authentication removed - user must login manually each session
  }, []);

  // Login function
  const login = async (username, password, remember = false) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      // Call real GMAC authentication API
      throw new Error('GMAC Authentication API chưa được implement');
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: error.message
      });
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // TODO: Call logout API if needed
      
      // Note: No localStorage cleanup needed since app doesn't persist user data

      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    } catch (error) {
      console.error('Logout error:', error);
      message.error('Có lỗi xảy ra khi đăng xuất');
    }
  };

  // Change password function
  const changePassword = async (currentPassword, newPassword) => {
    dispatch({ type: AUTH_ACTIONS.CHANGE_PASSWORD_START });

    try {
      // Call real GMAC change password API
      throw new Error('GMAC Change Password API chưa được implement');
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.CHANGE_PASSWORD_FAILURE,
        payload: error.message
      });
      throw error;
    }
  };

  // Check permission function
  const hasPermission = (permission) => {
    if (!state.permissions || state.permissions.length === 0) {
      return false;
    }
    return state.permissions.includes(permission) || state.permissions.includes('*');
  };

  // Check multiple permissions
  const hasAnyPermission = (permissions) => {
    return permissions.some(permission => hasPermission(permission));
  };

  // Check if user has admin role
  const isAdmin = () => {
    return state.user?.role === 'admin' || hasPermission('admin');
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    logout,
    changePassword,
    hasPermission,
    hasAnyPermission,
    isAdmin,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
