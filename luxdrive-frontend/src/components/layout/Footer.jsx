/**
 * Footer + Cookie Banner + Mobile Menu — kiçik layout komponentləri
 */
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Instagram, Facebook, MessageCircle, Youtube, Phone, Mail, MapPin, X } from 'lucide-react';
import { acceptCookies, selectCookieBanner, closeMobileMenu, selectMobileMenuOpen } from '@store/slices/uiSlice.js';
import { selectIsAuthenticated, logoutUser } from '@store/slices/authSlice.js';
import './Footer.css';

// ── FOOTER ────────────────────────────────────────────────
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-logo">LuxDrive</div>
          <p className="footer-desc">
            Azərbaycanın premium avtomobil icarə platforması.
            Lüks sürüş təcrübəsi hər kəs üçün.
          </p>
          <div className="social-links">
            <a className="social-link" aria-label="Instagram"><Instagram size={16} /></a>
            <a className="social-link" aria-label="Facebook"><Facebook size={16} /></a>
            <a className="social-link" aria-label="WhatsApp"><MessageCircle size={16} /></a>
            <a className="social-link" aria-label="YouTube"><Youtube size={16} /></a>
          </div>
        </div>

        <div>
          <div className="footer-hd">Sayt</div>
          <div className="footer-links">
            <Link to="/" className="footer-link">Ana Səhifə</Link>
            <Link to="/cars" className="footer-link">Avtomobillər</Link>
            <Link to="/about" className="footer-link">Haqqımızda</Link>
            <Link to="/contact" className="footer-link">Əlaqə</Link>
          </div>
        </div>

        <div>
          <div className="footer-hd">Hesab</div>
          <div className="footer-links">
            <Link to="/login" className="footer-link">Daxil ol</Link>
            <Link to="/register" className="footer-link">Qeydiyyat</Link>
            <Link to="/dashboard" className="footer-link">Profilim</Link>
          </div>
        </div>

        <div>
          <div className="footer-hd">Əlaqə</div>
          <div className="footer-links">
            <span className="footer-link"><Phone size={12} /> +994 50 000 00 00</span>
            <span className="footer-link"><Mail size={12} /> info@luxdrive.az</span>
            <span className="footer-link"><MapPin size={12} /> Bakı, Azərbaycan</span>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <span className="footer-copy">© {new Date().getFullYear()} LuxDrive. Bütün hüquqlar qorunur.</span>
        <span className="footer-copy">Premium & Avanqard Dizayn</span>
      </div>
    </footer>
  );
}

// ── COOKIE BANNER ─────────────────────────────────────────
// Kompakt sol-alt kart. Qəbul və ya bağla — sayt dizaynını pozmur.
export function CookieBanner() {
  const dispatch = useDispatch();
  const visible = useSelector(selectCookieBanner);
  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Kuki bildirişi">
      <div className="cookie-row">
        <div className="cookie-icon">🍪</div>
        <div className="cookie-text">
          <h4>Kuki istifadəsi</h4>
          <p>Saytımız təcrübəni yaxşılaşdırmaq üçün kukilərdən istifadə edir.</p>
        </div>
      </div>
      <div className="cookie-btns">
        <button className="btn btn-ghost btn-sm" onClick={() => dispatch(acceptCookies())}>
          İmtina
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => dispatch(acceptCookies())}>
          Qəbul et
        </button>
      </div>
    </div>
  );
}

// ── MOBİL MENÜ ───────────────────────────────────────────
export function MobileMenu() {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectMobileMenuOpen);
  const isAuth = useSelector(selectIsAuthenticated);

  const close = () => dispatch(closeMobileMenu());
  const handleLogout = () => { dispatch(logoutUser()); close(); };

  return (
    <>
      <div className={`mobile-overlay ${isOpen ? 'open' : ''}`} onClick={close} />
      <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
        <button className="mobile-close" onClick={close} aria-label="Bağla">
          <X size={20} />
        </button>

        <Link to="/" className="mobile-link" onClick={close}>Ana Səhifə</Link>
        <Link to="/cars" className="mobile-link" onClick={close}>Avtomobillər</Link>
        <Link to="/about" className="mobile-link" onClick={close}>Haqqımızda</Link>
        <Link to="/contact" className="mobile-link" onClick={close}>Əlaqə</Link>

        <div className="mobile-divider" />

        {!isAuth ? (
          <>
            <Link to="/login" className="mobile-link" onClick={close}>Daxil ol</Link>
            <Link to="/register" className="mobile-link" onClick={close}>Qeydiyyat</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className="mobile-link" onClick={close}>Profilim</Link>
            <button className="mobile-link mobile-logout" onClick={handleLogout}>
              Çıxış
            </button>
          </>
        )}
      </div>
    </>
  );
}
