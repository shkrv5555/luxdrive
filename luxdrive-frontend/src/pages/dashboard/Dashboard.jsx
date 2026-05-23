/**
 * Dashboard — Customer və Renter üçün ümumi layout
 *
 * Yan paneldə tab-lar, sağda aktiv bölmə.
 * Müştəri rolu üçün: Profil, Rezervasiyalar, Rəylər, Favorilər
 * İcarəçi rolu üçün: Profil, Avtomobillərim, Gələn Rezervasiyalar
 */
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  User, Calendar, Star, Heart, Car as CarIcon, Inbox,
  Camera, LogOut, Save, Lock, Eye, EyeOff,
  Trash2, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import {
  selectUser, selectIsRenter, updateUserProfile,
  uploadAvatar, logoutUser, clearAuth,
} from '@store/slices/authSlice.js';
import { fetchFavorites, selectFavorites, toggleFavorite } from '@store/slices/favoritesSlice.js';
import { bookingsAPI, reviewsAPI, usersAPI, carsAPI } from '@api/endpoints.js';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Dashboard.css';

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user     = useSelector(selectUser);
  const isRenter = useSelector(selectIsRenter);
  const [section, setSection] = useState('profile');

  if (!user) return null;

  // Yan panel naviqasiya elementləri (rol əsaslı)
  const navItems = isRenter
    ? [
        { id: 'profile',  icon: User,     label: 'Profilim' },
        { id: 'cars',     icon: CarIcon,  label: 'Avtomobillərim' },
        { id: 'incoming', icon: Inbox,    label: 'Gələn Rezervasiyalar' },
      ]
    : [
        { id: 'profile',   icon: User,     label: 'Profilim' },
        { id: 'bookings',  icon: Calendar, label: 'Rezervasiyalarım' },
        { id: 'reviews',   icon: Star,     label: 'Rəylərim' },
        { id: 'favorites', icon: Heart,    label: 'Favoritlərim' },
      ];

  const initials = user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  return (
    <div className="dash-layout">
      {/* Yan panel */}
      <aside className="dash-sidebar">
        <div className="sidebar-top">
          <label className="sidebar-avatar" htmlFor="avatar-input">
            {user.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}
            <span className="avatar-upload-overlay"><Camera size={14} /></span>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  dispatch(uploadAvatar(e.target.files[0]))
                    .unwrap()
                    .then(() => toast.success('Avatar yeniləndi'))
                    .catch(() => toast.error('Yüklənə bilmədi'));
                }
              }}
            />
          </label>
          <div className="side-name">{user.name}</div>
          <div className="side-role">{isRenter ? 'İcarəçi' : 'Müştəri'}</div>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`side-nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <item.icon size={16} /> {item.label}
            </button>
          ))}
          <button
            className="side-nav-item logout"
            onClick={() => dispatch(logoutUser()).then(() => navigate('/'))}
          >
            <LogOut size={16} /> Çıxış
          </button>
        </nav>
      </aside>

      {/* Əsas məzmun */}
      <main className="dash-main">
        {section === 'profile'   && <ProfileSection user={user} />}
        {section === 'bookings'  && <BookingsSection />}
        {section === 'reviews'   && <ReviewsSection />}
        {section === 'favorites' && <FavoritesSection />}
        {section === 'cars'      && <MyCarsSection />}
        {section === 'incoming'  && <IncomingBookingsSection />}
      </main>
    </div>
  );
}

// ── PROFİL bölməsi ─────────────────────────────────────────
function ProfileSection({ user }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Profil sahələri
  const [name, setName]   = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');

  // Şifrə dəyişmə state-ləri
  const [oldPass, setOldPass]   = useState('');
  const [newPass, setNewPass]   = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOld,  setShowOld]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Hesab silmə state-ləri
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Profil yenilə ───────────────────────────────────────
  const saveProfile = () => {
    dispatch(updateUserProfile({ name, phone }))
      .unwrap()
      .then(() => toast.success('Profil yeniləndi'))
      .catch((err) => toast.error(err?.message || 'Xəta baş verdi'));
  };

  // ─── Şifrə dəyiş (gücləndirilmiş validasiya) ─────────────
  const changePassword = async () => {
    // Backend qaydaları ilə eyni: min 8, 1 böyük hərf, 1 rəqəm
    if (!oldPass) return toast.error('Köhnə şifrəni daxil edin');
    if (newPass.length < 8)        return toast.error('Yeni şifrə ən azı 8 simvol olmalıdır');
    if (!/[A-Z]/.test(newPass))    return toast.error('Şifrədə ən azı 1 böyük hərf olmalıdır');
    if (!/[0-9]/.test(newPass))    return toast.error('Şifrədə ən azı 1 rəqəm olmalıdır');
    if (newPass !== confirmPass)   return toast.error('Şifrələr uyğun gəlmir');
    if (newPass === oldPass)       return toast.error('Yeni şifrə köhnədən fərqli olmalıdır');

    setIsChangingPass(true);
    try {
      await usersAPI.changePassword({ oldPassword: oldPass, newPassword: newPass });
      toast.success('Şifrə uğurla dəyişdirildi! Digər cihazlardan çıxış edildi.');
      setOldPass(''); setNewPass(''); setConfirmPass('');
    } catch (err) {
      toast.error(err?.message || 'Şifrə dəyişdirilə bilmədi');
    } finally {
      setIsChangingPass(false);
    }
  };

  // ─── Hesab sil (2 mərhələli təsdiq) ──────────────────────
  const deleteAccount = async () => {
    if (deleteConfirmText !== 'SİL') {
      return toast.error('Təsdiq üçün böyük hərflərlə "SİL" yazın');
    }
    setIsDeleting(true);
    try {
      await usersAPI.deleteAccount();
      toast.success('Hesabınız silindi. Vidalaşırıq! 👋', { duration: 4000 });
      dispatch(clearAuth());
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      toast.error(err?.message || 'Hesab silinə bilmədi');
      setIsDeleting(false);
    }
  };

  // ─── Şifrə gücü göstərici (canlı feedback) ───────────────
  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8)       score++;
    if (pwd.length >= 12)      score++;
    if (/[A-Z]/.test(pwd))     score++;
    if (/[0-9]/.test(pwd))     score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { label: 'Zəif',   color: 'var(--err)',  width: 33 };
    if (score <= 3) return { label: 'Orta',   color: 'var(--warn)', width: 66 };
    return                  { label: 'Güclü', color: 'var(--ok)',   width: 100 };
  };
  const strength = getPasswordStrength(newPass);

  return (
    <>
      {/* ═══ ŞƏXSİ MƏLUMATLAR ═══════════════════════════════ */}
      <h2 className="dash-title">Şəxsi Məlumatlar</h2>
      <div className="dash-card">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Ad Soyad</label>
            <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-control" value={user.email} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Telefon</label>
            <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+994..." />
          </div>
          <div className="form-group">
            <label className="form-label">Doğum tarixi</label>
            <input className="form-control" value={user.date_of_birth?.slice(0, 10) || ''} disabled style={{ opacity: 0.6 }} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={saveProfile}>
          <Save size={16} /> Yadda saxla
        </button>
      </div>

      {/* ═══ ŞİFRƏ DƏYİŞMƏ ══════════════════════════════════ */}
      <h2 className="dash-title" style={{ marginTop: '2rem' }}>
        <ShieldCheck size={20} style={{ verticalAlign: 'middle', color: 'var(--purple-light)' }} />
        {' '}Şifrəni Dəyiş
      </h2>
      <div className="dash-card">
        <div className="form-grid">
          {/* Köhnə şifrə */}
          <div className="form-group">
            <label className="form-label">Köhnə şifrə</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showOld ? 'text' : 'password'}
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="Hazırkı şifrəniz"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                style={{
                  position: 'absolute', right: '0.7rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', color: 'var(--tx-3)', cursor: 'pointer',
                  padding: '0.3rem', display: 'flex',
                }}
                aria-label={showOld ? 'Gizlət' : 'Göstər'}
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Yeni şifrə */}
          <div className="form-group">
            <label className="form-label">Yeni şifrə</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Min 8 simvol, 1 böyük hərf, 1 rəqəm"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute', right: '0.7rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', color: 'var(--tx-3)', cursor: 'pointer',
                  padding: '0.3rem', display: 'flex',
                }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Şifrə gücü göstəricisi */}
            {strength && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{
                  height: '4px',
                  background: 'var(--bg-3)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${strength.width}%`,
                    background: strength.color,
                    transition: 'all 0.3s ease',
                  }} />
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  color: strength.color,
                  marginTop: '0.25rem',
                  display: 'inline-block',
                  fontWeight: 600,
                }}>
                  Güc: {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Şifrə təkrarı */}
          <div className="form-group">
            <label className="form-label">Yeni şifrəni təkrarla</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showConf ? 'text' : 'password'}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Eyni şifrəni təkrar yazın"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConf(!showConf)}
                style={{
                  position: 'absolute', right: '0.7rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', color: 'var(--tx-3)', cursor: 'pointer',
                  padding: '0.3rem', display: 'flex',
                }}
              >
                {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPass && newPass !== confirmPass && (
              <span style={{ fontSize: '0.72rem', color: 'var(--err)', marginTop: '0.25rem', display: 'block' }}>
                ⚠ Şifrələr uyğun gəlmir
              </span>
            )}
          </div>
        </div>

        <div style={{
          background: 'rgba(124, 58, 237, 0.08)',
          border: '1px solid rgba(124, 58, 237, 0.25)',
          borderRadius: 'var(--r-md)',
          padding: '0.7rem 1rem',
          fontSize: '0.78rem',
          color: 'var(--tx-2)',
          marginBottom: '1rem',
        }}>
          <ShieldCheck size={14} style={{ verticalAlign: 'middle', color: 'var(--purple-light)' }} />
          {' '}<strong>Təhlükəsizlik qaydaları:</strong> Min 8 simvol, ən azı 1 böyük hərf, 1 rəqəm.
          Şifrəni dəyişdikdən sonra bütün cihazlardan avtomatik çıxış ediləcək.
        </div>

        <button
          className="btn btn-purple"
          onClick={changePassword}
          disabled={isChangingPass}
        >
          <Lock size={16} />
          {isChangingPass ? 'Dəyişdirilir...' : 'Şifrəni Dəyiş'}
        </button>
      </div>

      {/* ═══ TƏHLÜKƏLİ ZONA — HESAB SİL ════════════════════ */}
      <h2 className="dash-title" style={{ marginTop: '2rem', color: 'var(--err)' }}>
        <AlertTriangle size={20} style={{ verticalAlign: 'middle' }} />
        {' '}Təhlükəli Zona
      </h2>
      <div className="dash-card" style={{
        borderColor: 'rgba(239, 68, 68, 0.3)',
        background: 'linear-gradient(135deg, rgba(239,68,68,0.04), var(--bg-2))',
      }}>
        {!showDeleteConfirm ? (
          // Mərhələ 1: Açılış sualı
          <>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--tx-1)' }}>
              Hesabı sil
            </h3>
            <p style={{ color: 'var(--tx-2)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.2rem' }}>
              Hesabınızı silsəniz, <strong>geri qaytarılması mümkün deyil</strong>. Bütün məlumatlarınız —
              {' '}rezervasiyalar, rəylər, favoritlər, və {user.role === 'renter' ? 'avtomobilləriniz' : 'profil məlumatlarınız'} —
              {' '}<strong style={{ color: 'var(--err)' }}>tamamilə silinəcək</strong>.
            </p>
            <button
              className="btn btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={16} /> Hesabımı Sil
            </button>
          </>
        ) : (
          // Mərhələ 2: Təsdiq
          <>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--err)' }}>
              <AlertTriangle size={18} style={{ verticalAlign: 'middle' }} /> Əminsiniz?
            </h3>
            <p style={{ color: 'var(--tx-2)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              Bu əməliyyat <strong style={{ color: 'var(--err)' }}>GERİ ALINA BİLMƏZ</strong>.
              Davam etmək üçün aşağıya böyük hərflərlə <strong style={{ color: 'var(--err)' }}>SİL</strong> yazın:
            </p>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <input
                className="form-control"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='Burada "SİL" yazın'
                style={{
                  borderColor: deleteConfirmText === 'SİL' ? 'var(--err)' : 'var(--border)',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  letterSpacing: '2px',
                  textAlign: 'center',
                }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-danger"
                onClick={deleteAccount}
                disabled={deleteConfirmText !== 'SİL' || isDeleting}
              >
                <Trash2 size={16} />
                {isDeleting ? 'Silinir...' : 'Bəli, Hesabımı Sil'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
              >
                Ləğv et
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── REZERVASIYALAR (müştəri) ──────────────────────────────
function BookingsSection() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setIsLoading(true);
    bookingsAPI.myBookings()
      .then(({ data }) => setBookings(data.bookings))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const cancel = async (id) => {
    if (!confirm('Rezervasiyanı ləğv etmək istəyirsiniz?')) return;
    try {
      await bookingsAPI.cancel(id);
      toast.success('Rezervasiya ləğv edildi');
      load();
    } catch (err) {
      toast.error(err?.message || 'Xəta');
    }
  };

  const STATUS_BADGE = {
    active:    { cls: 'bOk',   label: 'Aktiv' },
    completed: { cls: 'bCyan', label: 'Tamamlandı' },
    cancelled: { cls: 'bErr',  label: 'Ləğv edildi' },
  };

  return (
    <>
      <h2 className="dash-title">Rezervasiyalarım</h2>
      {isLoading ? <div className="skeleton" style={{ height: 100 }} /> :
       bookings.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>Rezervasiya yoxdur</h3>
        </div>
       ) : (
        bookings.map((b) => {
          const sb = STATUS_BADGE[b.status] || {};
          return (
            <div key={b.id} className="dash-card list-card">
              <img src={b.image_url || '/placeholder-car.jpg'} alt="" />
              <div className="list-body">
                <div className="list-title">{b.brand} {b.model}</div>
                <div className="list-meta">
                  {b.start_date?.slice(0,10)} → {b.end_date?.slice(0,10)} · {b.days} gün
                </div>
                <div className="list-meta">İcarəçi: {b.renter_name}</div>
              </div>
              <div className="list-actions">
                <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.1rem' }}>
                  ₼{b.total_price}
                </div>
                <span className={`badge ${sb.cls}`}>{sb.label}</span>
                {b.status === 'active' && (
                  <button className="btn btn-danger btn-sm" onClick={() => cancel(b.id)}>
                    Ləğv et
                  </button>
                )}
              </div>
            </div>
          );
        })
       )}
    </>
  );
}

// ── RƏYLƏR (müştəri) ──────────────────────────────────────
function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    reviewsAPI.myReviews().then(({ data }) => setReviews(data.reviews));
  }, []);

  return (
    <>
      <h2 className="dash-title">Rəylərim</h2>
      {reviews.length === 0 ? (
        <div className="empty-state">
          <Star size={48} />
          <h3>Hələ rəy yazmamısınız</h3>
        </div>
      ) : (
        reviews.map((r) => (
          <div key={r.id} className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong>{r.brand} {r.model}</strong>
              <span style={{ color: 'var(--gold)' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
            </div>
            <p style={{ color: 'var(--tx-2)', fontSize: '0.88rem' }}>{r.comment}</p>
            <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: '0.5rem' }}>
              {new Date(r.created_at).toLocaleDateString('az-AZ')}
            </div>
          </div>
        ))
      )}
    </>
  );
}

// ── FAVORİTLƏR ─────────────────────────────────────────────
function FavoritesSection() {
  const dispatch = useDispatch();
  const favorites = useSelector(selectFavorites);

  useEffect(() => { dispatch(fetchFavorites()); }, [dispatch]);

  return (
    <>
      <h2 className="dash-title">Favoritlərim</h2>
      {favorites.length === 0 ? (
        <div className="empty-state">
          <Heart size={48} />
          <h3>Hələ favoritiniz yoxdur</h3>
        </div>
      ) : (
        <div className="cars-grid">
          {favorites.map((c) => (
            <div key={c.id} className="dash-card list-card">
              <img src={c.image_url || '/placeholder-car.jpg'} alt="" />
              <div className="list-body">
                <div className="list-title">{c.brand} {c.model}</div>
                <div className="list-meta">₼{c.price_per_day}/gün · ⭐ {parseFloat(c.avg_rating).toFixed(1)}</div>
              </div>
              <div className="list-actions">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => dispatch(toggleFavorite(c.id))}
                >
                  <Heart size={14} /> Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── İCARƏÇİ: AVTOMOBİLLƏR (CRUD) ──────────────────────────
function MyCarsSection() {
  const user = useSelector(selectUser);
  const [cars, setCars] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editCar, setEditCar] = useState(null);

  const load = () => carsAPI.list({ renterId: user.id, limit: 50 })
    .then(({ data }) => setCars(data.items));

  useEffect(load, [user.id]);

  const remove = async (id) => {
    if (!confirm('Avtomobili silmək istəyirsiniz?')) return;
    await carsAPI.remove(id);
    toast.success('Silindi');
    load();
  };

  const toggleAvail = async (c) => {
    await carsAPI.setAvailability(c.id, !c.is_available);
    load();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="dash-title" style={{ marginBottom: 0 }}>Avtomobillərim</h2>
        <button className="btn btn-primary" onClick={() => { setEditCar(null); setShowForm(true); }}>
          + Avtomobil əlavə et
        </button>
      </div>

      {showForm && (
        <CarForm
          car={editCar}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {cars.length === 0 ? (
        <div className="empty-state">
          <CarIcon size={48} />
          <h3>Hələ avtomobiliniz yoxdur</h3>
        </div>
      ) : (
        cars.map((c) => (
          <div key={c.id} className="dash-card list-card">
            <img src={c.image_url || '/placeholder-car.jpg'} alt="" />
            <div className="list-body">
              <div className="list-title">
                {c.brand} {c.model}
                <span className={`badge ${c.is_available ? 'bOk' : 'bErr'}`} style={{ marginLeft: '.5rem' }}>
                  {c.is_available ? 'Boş' : 'İcarədə'}
                </span>
              </div>
              <div className="list-meta">{c.year} · ₼{c.price_per_day}/gün</div>
            </div>
            <div className="list-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditCar(c); setShowForm(true); }}>
                Redaktə
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleAvail(c)}>
                {c.is_available ? 'Bloklа' : 'Aç'}
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>
                Sil
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}

// ── Avtomobil əlavə/redaktə formu ─────────────────────────
function CarForm({ car, onClose, onSaved }) {
  const [form, setForm] = useState({
    brand:        car?.brand        || '',
    model:        car?.model        || '',
    year:         car?.year         || new Date().getFullYear(),
    pricePerDay:  car?.price_per_day || '',
    category:     car?.category     || 'economy',
    transmission: car?.transmission || 'auto',
    fuel:         car?.fuel         || 'petrol',
    seats:        car?.seats        || 5,
    imageUrl:     car?.image_url    || '',
    description:  car?.description  || '',
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async () => {
    try {
      const payload = { ...form, year: parseInt(form.year), pricePerDay: parseFloat(form.pricePerDay), seats: parseInt(form.seats) };
      if (car) {
        await carsAPI.update(car.id, payload);
        toast.success('Yeniləndi');
      } else {
        await carsAPI.create(payload);
        toast.success('Əlavə edildi');
      }
      onSaved();
    } catch (err) {
      toast.error(err?.message || 'Xəta');
    }
  };

  return (
    <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>{car ? 'Redaktə' : 'Yeni Avtomobil'}</h3>
      <div className="form-grid">
        <div className="form-group"><label className="form-label">Marka</label><input className="form-control" value={form.brand} onChange={(e) => set('brand', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Model</label><input className="form-control" value={form.model} onChange={(e) => set('model', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">İl</label><input className="form-control" type="number" value={form.year} onChange={(e) => set('year', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Qiymət/gün ₼</label><input className="form-control" type="number" value={form.pricePerDay} onChange={(e) => set('pricePerDay', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Kateqoriya</label>
          <select className="form-control" value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="economy">Economy</option><option value="business">Business</option><option value="luxury">Lüks</option><option value="suv">SUV</option><option value="sport">Sport</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Ötürücü</label>
          <select className="form-control" value={form.transmission} onChange={(e) => set('transmission', e.target.value)}>
            <option value="auto">Avtomat</option><option value="manual">Mexaniki</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Yanacaq</label>
          <select className="form-control" value={form.fuel} onChange={(e) => set('fuel', e.target.value)}>
            <option value="petrol">Benzin</option><option value="diesel">Dizel</option><option value="hybrid">Hibrid</option><option value="electric">Elektrik</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Oturacaq</label><input className="form-control" type="number" value={form.seats} onChange={(e) => set('seats', e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="form-label">Şəkil URL</label><input className="form-control" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." /></div>
      <div className="form-group"><label className="form-label">Açıqlama</label><textarea className="form-control" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <button className="btn btn-primary" onClick={submit}>Yadda saxla</button>
        <button className="btn btn-ghost" onClick={onClose}>Ləğv et</button>
      </div>
    </div>
  );
}

// ── İCARƏÇİ: GƏLƏN REZERVASIYALAR ─────────────────────────
function IncomingBookingsSection() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    bookingsAPI.incoming().then(({ data }) => setBookings(data.bookings));
  }, []);

  const STATUS_BADGE = {
    active:    { cls: 'bOk',   label: 'Aktiv' },
    completed: { cls: 'bCyan', label: 'Tamamlandı' },
    cancelled: { cls: 'bErr',  label: 'Ləğv' },
  };

  return (
    <>
      <h2 className="dash-title">Gələn Rezervasiyalar</h2>
      {bookings.length === 0 ? (
        <div className="empty-state">
          <Inbox size={48} />
          <h3>Hələ rezervasiya yoxdur</h3>
        </div>
      ) : (
        bookings.map((b) => {
          const sb = STATUS_BADGE[b.status] || {};
          return (
            <div key={b.id} className="dash-card list-card">
              <img src={b.image_url || '/placeholder-car.jpg'} alt="" />
              <div className="list-body">
                <div className="list-title">{b.brand} {b.model}</div>
                <div className="list-meta">Müştəri: {b.customer_name}</div>
                <div className="list-meta">{b.start_date?.slice(0,10)} → {b.end_date?.slice(0,10)} · {b.days} gün</div>
              </div>
              <div className="list-actions">
                <div style={{ color: 'var(--gold)', fontWeight: 800 }}>₼{b.total_price}</div>
                <span className={`badge ${sb.cls}`}>{sb.label}</span>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
