import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ConversationProvider } from './contexts';
import { MainLayout } from './components/layout';
import ProtectedRoute from './components/ProtectedRoute';
import { LoginPage, RegisterPage } from './pages/auth';
import { ChatPage } from './pages/chat';

function OAuthCallbackPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary rounded-card flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
        <h1 className="text-2xl font-bold text-text-main mb-2">Đang xử lý đăng nhập...</h1>
        <p className="text-text-muted">Vui lòng đợi trong giây lát</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConversationProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route
                path="/chat"
                element={
                  <MainLayout>
                    <ChatPage />
                  </MainLayout>
                }
              />
              
              {/* Redirect root to chat */}
              <Route path="/" element={<Navigate to="/chat" replace />} />
            </Route>

            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ConversationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
