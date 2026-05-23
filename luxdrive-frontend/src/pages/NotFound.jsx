/**
 * 404 — Tapılmadı səhifəsi
 */
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6rem 1.5rem 3rem',
      textAlign: 'center',
    }}>
      <h1 className="gradient-text" style={{
        fontFamily: 'var(--font-disp)',
        fontSize: '6rem',
        fontWeight: 900,
        marginBottom: '0.5rem',
      }}>404</h1>
      <p style={{ color: 'var(--tx-2)', fontSize: '1.05rem', marginBottom: '2rem' }}>
        Axtardığınız səhifə tapılmadı.
      </p>
      <Link to="/" className="btn btn-primary btn-lg">
        <Home size={18} /> Ana səhifəyə qayıt
      </Link>
    </div>
  );
}
