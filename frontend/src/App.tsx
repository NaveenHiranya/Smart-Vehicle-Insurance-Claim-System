import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { VehiclesPage, VehicleDetailPage, AddVehiclePage } from './pages/VehiclesPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { ClaimsPage } from './pages/ClaimsPage';
import { NewClaimPage } from './pages/NewClaimPage';
import { ClaimDetailPage } from './pages/ClaimDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminClaimsPage } from './pages/admin/AdminClaimsPage';
import { AdminClaimDetailPage } from './pages/admin/AdminClaimDetailPage';
import { AdminDocumentsPage } from './pages/admin/AdminDocumentsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
          <Route path="/vehicles" element={<ProtectedRoute><Layout><VehiclesPage /></Layout></ProtectedRoute>} />
          <Route path="/vehicles/new" element={<ProtectedRoute><Layout><AddVehiclePage /></Layout></ProtectedRoute>} />
          <Route path="/vehicles/:id" element={<ProtectedRoute><Layout><VehicleDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/policies" element={<ProtectedRoute><Layout><PoliciesPage /></Layout></ProtectedRoute>} />
          <Route path="/claims" element={<ProtectedRoute><Layout><ClaimsPage /></Layout></ProtectedRoute>} />
          <Route path="/claims/new" element={<ProtectedRoute><Layout><NewClaimPage /></Layout></ProtectedRoute>} />
          <Route path="/claims/:id" element={<ProtectedRoute><Layout><ClaimDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminLayout><AdminDashboardPage /></AdminLayout></AdminProtectedRoute>} />
          <Route path="/admin/users" element={<AdminProtectedRoute><AdminLayout><AdminUsersPage /></AdminLayout></AdminProtectedRoute>} />
          <Route path="/admin/claims" element={<AdminProtectedRoute><AdminLayout><AdminClaimsPage /></AdminLayout></AdminProtectedRoute>} />
          <Route path="/admin/claims/:id" element={<AdminProtectedRoute><AdminLayout><AdminClaimDetailPage /></AdminLayout></AdminProtectedRoute>} />
          <Route path="/admin/documents" element={<AdminProtectedRoute><AdminLayout><AdminDocumentsPage /></AdminLayout></AdminProtectedRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
