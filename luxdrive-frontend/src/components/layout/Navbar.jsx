/**
 * Navbar — əsas naviqasiya
 *
 * • Logo 5x klik → admin login səhifəsi (gizli giriş)
 * • Scroll-da fon dəyişir
 * • İstifadəçi vəziyyətinə görə fərqli düymələr
 * • Mobil ekranda hamburger menü
 */
import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut } from 'lucide-react';
import { selectIsAuthenticated, selectUser, logoutUser } from '@store/slices/authSlice.js';
import { selectUnreadCount, togglePanel } from '@store/slices/notificationsSlice.js';
import { toggleMobileMenu } from '@store/slices/uiSlice.js';
import './Navbar.css';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuth = useSelector(selectIsAuthenticated);
  const user   = useSelector(selectUser);
  const unread = useSelector(selectUnreadCount);

  const [scrolled, setScrolled] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef(null);

  // Scroll dinləyici — fon effekti
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Gizli admin girişi — 2 saniyə içində 5 klik
  const handleLogoClick = (e) => {
    e.preventDefault();
    clickCount.current += 1;
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 2000);
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      navigate('/admin-login');
    } else {
      // Adi klikdə ana səhifəyə
      if (clickCount.current === 1) {
        setTimeout(() => {
          if (clickCount.current <= 1) navigate('/');
        }, 250);
      }
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => navigate('/'));
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        {/* Logo — gizli admin girişi üçün hədəf */}
        <a className="nav-logo" onClick={handleLogoClick} href="/">
          Lux<span>Drive</span>
        </a>

        {/* Desktop linkləri */}
        <div className="nav-links">
          <NavLink to="/"     end className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Ana Səhifə</NavLink>
          <NavLink to="/cars"     className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Avtomobillər</NavLink>
          <NavLink to="/about"    className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Haqqımızda</NavLink>
          <NavLink to="/contact"  className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Əlaqə</NavLink>
        </div>

        {/* Sağ tərəf əməliyyatları */}
        <div className="nav-actions">
          {!isAuth ? (
            // Giriş etməyiblər
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">Daxil ol</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Qeydiyyat</Link>
            </>
          ) : (
            // Giriş ediblər
            <>
              {/* Bildiriş zəngi */}
              <button
                className="notif-btn"
                onClick={() => dispatch(togglePanel())}
                aria-label="Bildirişlər"
              >
                <Bell size={18} />
                {unread > 0 && <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>}
              </button>

              {/* İstifadəçi profili */}
              <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="nav-user">
                <div className="nav-user-avatar">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" />
                  ) : (
                    user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
                  )}
                </div>
                <span className="nav-user-name">{user?.name?.split(' ')[0]}</span>
              </Link>

              <button className="btn btn-ghost btn-sm" onClick={handleLogout} aria-label="Çıxış">
                <LogOut size={16} />
              </button>
            </>
          )}

          {/* Mobil hamburger */}
          <button className="hamburger" onClick={() => dispatch(toggleMobileMenu())} aria-label="Menyu">
            <Menu size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}
