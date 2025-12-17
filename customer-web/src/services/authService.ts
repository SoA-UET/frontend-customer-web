import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config, AUTH_TOKEN_KEY } from '../config';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
} from '../types';

// Create axios instance for Auth Service (S04 - H20 APIs)
const authApi: AxiosInstance = axios.create({
  baseURL: config.authApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding token
authApi.interceptors.request.use(
  (requestConfig: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && requestConfig.headers) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    return requestConfig;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
authApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Auth Service - H20 APIs
 * Handles user registration and authentication
 */
export const authService = {
  /**
   * POST /api/v1/auth/register
   * Register a new user account
   */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await authApi.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * POST /api/v1/auth/login
   * Login with phone number and password
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await authApi.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * GET /api/v1/auth/oauth/login
   * Redirect to OAuth provider
   */
  getOAuthLoginUrl: (provider: string = 'google'): string => {
    return `${config.authApiBaseUrl}/auth/oauth/login?provider=${provider}`;
  },

  /**
   * Handle OAuth callback (called after redirect)
   * GET /api/v1/auth/oauth/callback
   */
  handleOAuthCallback: async (code: string, state: string): Promise<LoginResponse> => {
    const response = await authApi.get<LoginResponse>('/auth/oauth/callback', {
      params: { code, state },
    });
    return response.data;
  },
};

export default authApi;
