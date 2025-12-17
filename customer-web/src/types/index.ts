// Auth Types (H20)
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  address: string;
}

export interface RegisterResponse {
  status: string;
  customer_id: number;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  customer: Customer;
}

export interface Customer {
  customer_id: number | string;
  email?: string;
  full_name: string;
  phone_number?: string;
  status: string;
}

// Conversation Types (H19)
export type ConversationStatus = 
  | 'AI_AGENT_TEXTING'
  | 'AI_AGENT_CALLING'
  | 'FORWARDING'
  | 'HUMAN_AGENT_TEXTING'
  | 'HUMAN_AGENT_CALLING';

export interface Conversation {
  id: string;
  title: string;
  status: ConversationStatus;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConversationRequest {
  title: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'customer' | 'ai' | 'human_agent';
  content: string;
  created_at: string;
  emotion?: string;
  customer_satisfaction?: number;
}

export interface SendMessageRequest {
  content: string;
}

export interface Rating {
  conversation_id: string;
  rating: number;
  comment: string;
}

export interface RatingRequest {
  rating: number;
  comment: string;
}

// Socket.IO Event Payloads
export interface TextStartPayload {
  conversation_id: string;
  message_id: string;
  sender: 'ai' | 'human_agent';
}

export interface TextChunkPayload {
  conversation_id: string;
  message_id: string;
  content: string;
  is_final: boolean;
}

export interface TextStopPayload {
  conversation_id: string;
  message_id: string;
}

export interface StatusSwitchPayload {
  conversation_id: string;
  old_status: ConversationStatus;
  new_status: ConversationStatus;
  reason: string;
}

export interface CallStartPayload {
  conversation_id: string;
}

export interface CallEndPayload {
  conversation_id: string;
}

export interface AudioStartPayload {
  conversation_id: string;
}

export interface AudioChunkPayload {
  conversation_id: string;
  audio: ArrayBuffer;
}

export interface AudioStopPayload {
  conversation_id: string;
}

export interface AudioFilePayload {
  conversation_id: string;
  audio: ArrayBuffer;
  mime_type: string;
}

// API Error Response
export interface ApiError {
  status: string;
  error_code: string;
  message: string;
}

// Pagination
export interface PaginatedResponse<T> {
  content: T[];
  page_number?: number;
  page_size?: number;
  total_elements?: number;
  total_pages?: number;
}

export interface ContentResponse<T> {
  content: T;
}
