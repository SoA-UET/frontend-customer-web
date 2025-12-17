import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AUTH_TOKEN_KEY, CUSTOMER_KEY } from '../config';
import { authService } from '../services';
import type { Customer, LoginRequest, RegisterRequest } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  customer: Customer | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const savedCustomer = localStorage.getItem(CUSTOMER_KEY);
    
    if (token && savedCustomer) {
      try {
        setCustomer(JSON.parse(savedCustomer));
        setIsAuthenticated(true);
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(CUSTOMER_KEY);
      }
    }
    setLoading(false);
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.handleOAuthCallback(code, state);
      
      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(response.customer));
      setCustomer(response.customer);
      setIsAuthenticated(true);
      
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Đăng nhập OAuth thất bại';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.login(data);
      
      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(response.customer));
      setCustomer(response.customer);
      setIsAuthenticated(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error.response?.data?.message || 'Đăng nhập thất bại';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      setLoading(true);
      setError(null);
      await authService.register(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error.response?.data?.message || 'Đăng ký thất bại';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => {
    const oauthUrl = authService.getOAuthLoginUrl('google');
    window.location.href = oauthUrl;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    setCustomer(null);
    setIsAuthenticated(false);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        customer,
        login,
        register,
        loginWithGoogle,
        logout,
        loading,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
