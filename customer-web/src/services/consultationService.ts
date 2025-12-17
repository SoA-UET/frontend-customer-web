import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config, AUTH_TOKEN_KEY } from '../config';
import type {
  Conversation,
  CreateConversationRequest,
  Message,
  SendMessageRequest,
  Rating,
  RatingRequest,
  ContentResponse,
  PaginatedResponse,
} from '../types';

// Create axios instance for Consultation Service (S01 - H19 APIs)
const consultationApi: AxiosInstance = axios.create({
  baseURL: config.consultationApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding token
consultationApi.interceptors.request.use(
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
consultationApi.interceptors.response.use(
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
 * Consultation Service - H19 APIs
 * Handles conversations, messages, and ratings
 */
export const consultationService = {
  /**
   * POST /api/v1/conversations
   * Create a new consultation conversation
   */
  createConversation: async (data: CreateConversationRequest): Promise<ContentResponse<Conversation>> => {
    const response = await consultationApi.post<ContentResponse<Conversation>>('/conversations', data);
    return response.data;
  },

  /**
   * GET /api/v1/conversations/{conversation_id}
   * Get details of a conversation
   */
  getConversation: async (conversationId: string): Promise<ContentResponse<Conversation>> => {
    const response = await consultationApi.get<ContentResponse<Conversation>>(`/conversations/${conversationId}`);
    return response.data;
  },

  /**
   * GET /api/v1/conversations
   * Get all past conversations
   */
  getConversations: async (): Promise<ContentResponse<Conversation[]>> => {
    const response = await consultationApi.get<ContentResponse<Conversation[]>>('/conversations');
    return response.data;
  },

  /**
   * POST /api/v1/conversations/{conversation_id}/messages
   * Send a text message from customer
   */
  sendMessage: async (conversationId: string, data: SendMessageRequest): Promise<ContentResponse<Message>> => {
    const response = await consultationApi.post<ContentResponse<Message>>(
      `/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  },

  /**
   * GET /api/v1/conversations/{conversation_id}/messages
   * Get message history of a conversation
   */
  getMessages: async (
    conversationId: string,
    params?: { pageNumber?: number; pageSize?: number; search?: string }
  ): Promise<PaginatedResponse<Message>> => {
    const response = await consultationApi.get<PaginatedResponse<Message>>(
      `/conversations/${conversationId}/messages`,
      { params }
    );
    return response.data;
  },

  /**
   * GET /api/v1/conversations/{conversation_id}/rating
   * Get the current rating for a conversation
   */
  getRating: async (conversationId: string): Promise<Rating> => {
    const response = await consultationApi.get<Rating>(`/conversations/${conversationId}/rating`);
    return response.data;
  },

  /**
   * PUT /api/v1/conversations/{conversation_id}/rating
   * Submit or modify rating for a conversation
   */
  submitRating: async (conversationId: string, data: RatingRequest): Promise<Rating> => {
    const response = await consultationApi.put<Rating>(`/conversations/${conversationId}/rating`, data);
    return response.data;
  },

  /**
   * POST /api/v1/conversations/{conversation_id}/audio
   * Submit audio file for AI processing
   */
  submitAudio: async (conversationId: string, audioFile: Blob): Promise<void> => {
    const formData = new FormData();
    formData.append('file', audioFile, 'recording.wav');
    
    await consultationApi.post(`/conversations/${conversationId}/audio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default consultationApi;
