import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { MatrixTransitionProvider, useMatrixTransition } from './context/MatrixTransitionContext';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { ForgotPassword } from './pages/ForgotPassword';
import { AuthSelection } from './pages/AuthSelection';

// Matrix Route Change Transition Listener
const MatrixRouteListener: React.FC = () => {
  const location = useLocation();
  const { triggerMatrixTransition } = useMatrixTransition();

  useEffect(() => {
    triggerMatrixTransition();
  }, [location.pathname]);

  return null;
};

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh w-full bg-[#000000] flex flex-col items-center justify-center text-[#00ff41] p-4 font-mono">
        <div className="w-14 h-14 rounded-2xl bg-black border border-[#00ff41] flex items-center justify-center font-black text-xl mb-4 animate-pulse shadow-[0_0_15px_rgba(0,255,65,0.4)] overflow-hidden">
          <img src="/logos/TheRoom.jpg" alt="TheRoom Logo" className="w-full h-full object-cover" />
        </div>
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-[#00ff41] border-t-transparent" />
        <p className="text-xs text-[#00ff41]/70 mt-3 font-medium tracking-widest uppercase">Securing connection to TheRoom...</p>
      </div>
    );
  }

  if (!userProfile) {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (Redirects authenticated users to home)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, loading } = useAuth();

  if (loading) return null;

  if (userProfile) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <MatrixTransitionProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <MatrixRouteListener />
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/welcome"
                  element={
                    <PublicRoute>
                      <AuthSelection />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/auth"
                  element={
                    <PublicRoute>
                      <AuthSelection />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <PublicRoute>
                      <SignUp />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PublicRoute>
                      <ForgotPassword />
                    </PublicRoute>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </MatrixTransitionProvider>
    </ThemeProvider>
  );
}
