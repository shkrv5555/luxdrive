/**
 * ProtectedRoute — Yalnız autentifikasiya olunmuş istifadəçilərə icazə
 *
 * roles?: 'customer' | 'renter' | 'admin' | string[] — opsional rol yoxlanışı
 *
 * İstifadə:
 *   <Route element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser } from '@store/slices/authSlice.js';

export default function ProtectedRoute({ children, roles }) {
  const isAuth = useSelector(selectIsAuthenticated);
  const user   = useSelector(selectUser);
  const location = useLocation();

  // Login olmayıbsa — login səhifəsinə yönəlt
  // `state.from` ilə geri qayıtmaq üçün yaddaşda saxla
  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Rol yoxlanışı
  if (roles && roles.length > 0) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(user?.role)) {
      // Rol uyğun deyil → ana səhifəyə
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
