import { Navigate } from 'react-router-dom';

export function GarageProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('garageToken');
  if (!token) return <Navigate to="/garage/login" replace />;
  return <>{children}</>;
}
