// API Configuration
export const config = {
  // S04 Customer Identity Service (H20 APIs)
  authApiBaseUrl: import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:5001/api/v1',
  
  // S01 Consultation Service (H19 APIs)
  consultationApiBaseUrl: import.meta.env.VITE_CONSULTATION_API_BASE_URL || 'http://localhost:5000/api/v1',
  
  // Socket.IO URL for real-time features
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
};

// Token storage keys
export const AUTH_TOKEN_KEY = 'telcenter_access_token';
export const CUSTOMER_KEY = 'telcenter_customer';
