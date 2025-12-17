import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ConversationProvider } from './contexts';
import { MainLayout } from './components/layout';
import ProtectedRoute from './components/ProtectedRoute';
import { LoginPage, RegisterPage } from './pages/auth';
import { ChatPage } from './pages/chat';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConversationProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
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
