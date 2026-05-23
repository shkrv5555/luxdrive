/**
 * ════════════════════════════════════════════════════════════
 * AppRouter — Bütün route-lar (Faza 4b tamamlandı)
 * ════════════════════════════════════════════════════════════
 */
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';

// Lazy loading — code splitting
const Home       = lazy(() => import('@pages/Home.jsx'));
const Cars       = lazy(() => import('@pages/Cars.jsx'));
const CarDetail  = lazy(() => import('@pages/CarDetail.jsx'));
const About      = lazy(() => import('@pages/About.jsx'));
const Contact    = lazy(() => import('@pages/Contact.jsx'));
const Login      = lazy(() => import('@pages/auth/Login.jsx'));
const Register   = lazy(() => import('@pages/auth/Register.jsx'));
const AdminLogin = lazy(() => import('@pages/auth/AdminLogin.jsx'));
const Dashboard  = lazy(() => import('@pages/dashboard/Dashboard.jsx'));
const AdminPanel = lazy(() => import('@pages/admin/AdminPanel.jsx'));
const NotFound   = lazy(() => import('@pages/NotFound.jsx'));

function PageLoader() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div className="loader" style={{ width: 28, height: 28 }} />
    </div>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/"            element={<Home />} />
        <Route path="/cars"        element={<Cars />} />
        <Route path="/cars/:id"    element={<CarDetail />} />
        <Route path="/about"       element={<About />} />
        <Route path="/contact"     element={<Contact />} />

        {/* Auth */}
        <Route path="/login"       element={<Login />} />
        <Route path="/register"    element={<Register />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Qorunan: müştəri + icarəçi */}
        <Route path="/dashboard/*" element={
          <ProtectedRoute roles={['customer', 'renter']}>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Qorunan: yalnız admin */}
        <Route path="/admin/*" element={
          <ProtectedRoute roles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
