import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

const OAUTH_TIMEOUT = 10000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processingOAuth = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ----------------------------------------------------
   * Restore auth from localStorage on app start
   * -------------------------------------------------- */
  useEffect(() => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const savedCustomer = localStorage.getItem(CUSTOMER_KEY);

      if (token && savedCustomer) {
        setCustomer(JSON.parse(savedCustomer));
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Failed to restore auth', err);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(CUSTOMER_KEY);
    }
  }, []);

  /* ----------------------------------------------------
   * OAuth CALLBACK HANDLER (CHỈ CHẠY Ở /oauth/callback)
   * -------------------------------------------------- */
  useEffect(() => {
    if (location.pathname !== '/oauth/callback') {
      return;
    }

    if (processingOAuth.current) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const errorParam = params.get('error');

    if (errorParam) {
      setError('Đăng nhập Google thất bại');
      navigate('/login', { replace: true });
      return;
    }

    if (!token) {
      setError('Thiếu token đăng nhập');
      navigate('/login', { replace: true });
      return;
    }

    processingOAuth.current = true;
    handleTokenFromUrl(token);
  }, [location.pathname, location.search]);

  /* ----------------------------------------------------
   * Process OAuth token
   * -------------------------------------------------- */
  const handleTokenFromUrl = async (token: string) => {
    timeoutRef.current = setTimeout(() => {
      if (processingOAuth.current) {
        setError('Đăng nhập Google bị timeout');
        cleanupOAuth();
        navigate('/login', { replace: true });
      }
    }, OAUTH_TIMEOUT);

    try {
      setLoading(true);
      setError(null);

      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('JWT không hợp lệ');
      }

      const payload = JSON.parse(atob(parts[1]));

      const customer: Customer = {
        customer_id: payload.sub || payload.customer_id,
        email: payload.email,
        full_name: payload.full_name || payload.name || '',
        phone_number: payload.phone_number || '',
        status: 'ACTIVE',
      };

      if (!customer.customer_id || !customer.email) {
        throw new Error('Thiếu thông tin người dùng');
      }

      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));

      setCustomer(customer);
      setIsAuthenticated(true);

      navigate('/', { replace: true });
    } catch (err) {
      console.error('OAuth token error', err);
      setError('Không thể xử lý đăng nhập Google');
      cleanupOAuth();
      navigate('/login', { replace: true });
    } finally {
      cleanupOAuth();
    }
  };

  const cleanupOAuth = () => {
    processingOAuth.current = false;
    setLoading(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  /* ----------------------------------------------------
   * Normal login
   * -------------------------------------------------- */
  const login = async (data: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login(data);

      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(response.customer));

      setCustomer(response.customer);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Đăng nhập thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------
   * Register
   * -------------------------------------------------- */
  const register = async (data: RegisterRequest) => {
    try {
      setLoading(true);
      setError(null);
      await authService.register(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Đăng ký thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------
   * OAuth redirect
   * -------------------------------------------------- */
  const loginWithGoogle = () => {
    setError(null);
    window.location.href = authService.getOAuthLoginUrl('google');
  };

  /* ----------------------------------------------------
   * Logout
   * -------------------------------------------------- */
  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    setCustomer(null);
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
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

/* ----------------------------------------------------
 * Hook
 * -------------------------------------------------- */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
