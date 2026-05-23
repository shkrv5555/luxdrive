/**
 * AdminPanel — Tam admin sistem idarəetməsi
 *
 * Bölmələr: Dashboard | Müştərilər | İcarəçilər | Avtomobillər | Rezervasiyalar | Rəylər | Promo
 *
 * Bütün endpoint-lər `requireRole('admin')` ilə qorunur — backend-də.
 * Frontend yalnız vizual maskalama edir.
 */
import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ChartPie, Users, Building2, Car as CarIcon, Calendar, Star,
  Tag, LogOut, Ban, Trash2, ToggleRight, ToggleLeft, Search,
  FileText, Save, MessageSquare, Send, Circle,
} from 'lucide-react';
import { adminAPI, bookingsAPI, reviewsAPI, carsAPI, chatAPI } from '@api/endpoints.js';
import { getSocket } from '@hooks/useSocket.js';
import { selectUser, logoutUser } from '@store/slices/authSlice.js';
import toast from 'react-hot-toast';
import './AdminPanel.css';

export default function AdminPanel() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [section, setSection] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', icon: ChartPie,  label: 'Dashboard' },
    { id: 'customers', icon: Users,     label: 'Müştərilər' },
    { id: 'renters',   icon: Building2, label: 'İcarəçilər' },
    { id: 'cars',      icon: CarIcon,   label: 'Avtomobillər' },
    { id: 'bookings',  icon: Calendar,  label: 'Rezervasiyalar' },
    { id: 'reviews',   icon: Star,      label: 'Rəylər' },
    { id: 'promos',    icon: Tag,       label: 'Promo kodları' },
    { id: 'pages',     icon: FileText,  label: 'Səhifələr' },
    { id: 'messages',  icon: MessageSquare, label: 'Mesajlar' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">⚡ Admin Panel</div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`admin-nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <item.icon size={16} /> {item.label}
            </button>
          ))}
          <button
            className="admin-nav-item logout"
            onClick={() => dispatch(logoutUser()).then(() => navigate('/'))}
          >
            <LogOut size={16} /> Çıxış
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        {section === 'dashboard' && <DashboardSection />}
        {section === 'customers' && <UsersSection role="customer" />}
        {section === 'renters'   && <UsersSection role="renter" />}
        {section === 'cars'      && <CarsAdminSection />}
        {section === 'bookings'  && <BookingsAdminSection />}
        {section === 'reviews'   && <ReviewsAdminSection />}
        {section === 'promos'    && <PromosSection />}
        {section === 'pages'     && <PagesSection />}
        {section === 'messages'  && <MessagesSection />}
      </main>
    </div>
  );
}

// ── DASHBOARD STATS ───────────────────────────────────────
function DashboardSection() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminAPI.stats().then(({ data }) => setStats(data));
  }, []);

  if (!stats) return <div className="skeleton" style={{ height: 200 }} />;

  const cards = [
    { label: 'Müştəri',     value: stats.users.customers, icon: Users,      cls: 'gold' },
    { label: 'İcarəçi',     value: stats.users.renters,   icon: Building2,  cls: 'purple' },
    { label: 'Avtomobil',   value: stats.cars.total,      icon: CarIcon,    cls: 'cyan' },
    { label: 'Rezervasiya', value: stats.bookings.total,  icon: Calendar,   cls: 'green' },
    { label: 'Boş Avto',    value: stats.cars.available,  icon: ToggleRight, cls: 'cyan' },
    { label: 'Bloklu',      value: stats.users.blocked || 0, icon: Ban,     cls: 'gold' },
    { label: 'Rəy',         value: stats.reviews.total,   icon: Star,       cls: 'purple' },
    { label: 'Ümumi Gəlir', value: `₼${stats.bookings.total_revenue}`, icon: Tag, cls: 'green' },
  ];

  return (
    <>
      <h2 className="dash-title">Ümumi Statistika</h2>
      <div className="stats-grid">
        {cards.map((c, i) => (
          <div key={i} className={`stat-card ${c.cls}`}>
            <c.icon size={20} className="stat-icon" />
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Aylıq chart */}
      <div className="chart-card">
        <h3 className="chart-title">Son 6 Ay Rezervasiyaları</h3>
        <div className="chart-bars">
          {(() => {
            const max = Math.max(...stats.monthlyBookings.map((m) => parseInt(m.count)), 1);
            return stats.monthlyBookings.map((m) => (
              <div key={m.month} className="chart-bar-group">
                <div
                  className="chart-bar"
                  style={{ height: `${parseInt(m.count) / max * 100}%` }}
                  title={`${m.count} rezervasiya · ₼${m.revenue}`}
                />
                <div className="chart-lbl">{m.month}</div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Kateqoriyalar */}
      <div className="chart-card" style={{ marginTop: '1.2rem' }}>
        <h3 className="chart-title">Kateqoriya üzrə Avtomobillər</h3>
        {stats.categories.map((c) => (
          <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', marginBottom: '.5rem' }}>
            <div style={{ flex: 1, fontSize: '.82rem', color: 'var(--tx-2)' }}>{c.category}</div>
            <div style={{ flex: 2, height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${parseInt(c.count) / stats.cars.total * 100}%`,
                background: 'linear-gradient(90deg, var(--gold), var(--purple))',
                borderRadius: 4,
              }} />
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--gold)', fontWeight: 700, minWidth: 20 }}>{c.count}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── İSTİFADƏÇİLƏR (customer/renter) ──────────────────────
function UsersSection({ role }) {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setIsLoading(true);
    adminAPI.listUsers({ role, search, limit: 50 })
      .then(({ data }) => setUsers(data.items))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, role]);

  // Blok/aç — error handling ilə
  const block = async (u) => {
    try {
      await adminAPI.blockUser(u.id, !u.is_blocked);
      toast.success(u.is_blocked ? 'Blok açıldı' : 'Bloklandı');
      load();
    } catch (err) {
      // Backend xətasını istifadəçiyə göstər
      toast.error(err?.message || 'Əməliyyat alınmadı');
      console.error('Block error:', err);
    }
  };

  // Sil — error handling ilə
  const remove = async (u) => {
    if (!confirm(`${u.name} silinsin?`)) return;
    try {
      await adminAPI.deleteUser(u.id);
      toast.success('İstifadəçi silindi');
      load();
    } catch (err) {
      toast.error(err?.message || 'Silmə alınmadı');
      console.error('Delete error:', err);
    }
  };

  return (
    <>
      <h2 className="dash-title">{role === 'customer' ? 'Müştərilər' : 'İcarəçilər'}</h2>
      <div className="table-toolbar">
        <div className="filter-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Ad və ya email axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>İstifadəçi</th>
              <th>Email</th>
              <th>Telefon</th>
              <th>Tarix</th>
              <th>Status</th>
              <th>Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6}><div className="skeleton" style={{ height: 50 }} /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--tx-3)' }}>Tapılmadı</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <div className="table-avatar">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" /> :
                          u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      {u.name}
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>
                    {new Date(u.created_at).toLocaleDateString('az-AZ')}
                  </td>
                  <td>
                    {u.is_blocked
                      ? <span className="badge bErr">Bloklu</span>
                      : <span className="badge bOk">Aktiv</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '.3rem' }}>
                      <button
                        className={`btn btn-sm ${u.is_blocked ? 'btn-primary' : 'btn-danger'}`}
                        onClick={() => block(u)}
                        title={u.is_blocked ? 'Blok aç' : 'Blokla'}
                      >
                        <Ban size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── AVTOMOBİLLƏR (admin) ──────────────────────────────────
function CarsAdminSection() {
  const [cars, setCars] = useState([]);

  const load = () => carsAPI.list({ limit: 50 }).then(({ data }) => setCars(data.items));
  useEffect(load, []);

  const remove = async (c) => {
    if (!confirm(`${c.brand} ${c.model} silinsin?`)) return;
    try {
      await carsAPI.remove(c.id);
      toast.success('Avtomobil silindi');
      load();
    } catch (err) {
      toast.error(err?.message || 'Silmə alınmadı');
    }
  };

  return (
    <>
      <h2 className="dash-title">Bütün Avtomobillər</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Avtomobil</th><th>İcarəçi</th><th>Kateqoriya</th><th>Qiymət</th><th>Status</th><th>Reytinq</th><th></th></tr>
          </thead>
          <tbody>
            {cars.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <img src={c.image_url} style={{ width: 50, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} alt="" />
                    {c.brand} {c.model} ({c.year})
                  </div>
                </td>
                <td>{c.renter_name}</td>
                <td><span className="badge bPurple">{c.category}</span></td>
                <td style={{ color: 'var(--gold)', fontWeight: 700 }}>₼{c.price_per_day}</td>
                <td>{c.is_available ? <span className="badge bOk">Boş</span> : <span className="badge bErr">İcarədə</span>}</td>
                <td>⭐ {parseFloat(c.avg_rating).toFixed(1)} ({c.review_count})</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── REZERVASIYALAR (admin) ────────────────────────────────
function BookingsAdminSection() {
  const [bookings, setBookings] = useState([]);
  useEffect(() => { bookingsAPI.adminAll({ limit: 50 }).then(({ data }) => setBookings(data.items)); }, []);

  return (
    <>
      <h2 className="dash-title">Bütün Rezervasiyalar</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>ID</th><th>Müştəri</th><th>Avtomobil</th><th>Tarix</th><th>Məbləğ</th><th>Status</th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td style={{ fontSize: '.72rem', color: 'var(--tx-3)' }}>{b.id.slice(0,8)}</td>
                <td>{b.customer_name}</td>
                <td>{b.brand} {b.model}</td>
                <td style={{ fontSize: '.78rem' }}>{b.start_date?.slice(0,10)} → {b.end_date?.slice(0,10)}</td>
                <td style={{ color: 'var(--gold)', fontWeight: 700 }}>₼{b.total_price}</td>
                <td>
                  {b.status === 'active'    && <span className="badge bOk">Aktiv</span>}
                  {b.status === 'completed' && <span className="badge bCyan">Tamamlandı</span>}
                  {b.status === 'cancelled' && <span className="badge bErr">Ləğv</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── RƏYLƏR (admin) ────────────────────────────────────────
function ReviewsAdminSection() {
  const [reviews, setReviews] = useState([]);
  // Backend-də admin reviews endpoint-i `/api/reviews/admin/all`
  useEffect(() => {
    fetch('/api/reviews/admin/all', {
      headers: { Authorization: `Bearer ${localStorage.getItem('ld_accessToken')}` },
    })
      .then((r) => r.json())
      .then((data) => setReviews(data.items || []))
      .catch(() => {});
  }, []);

  const remove = async (id) => {
    if (!confirm('Rəyi silmək istəyirsiniz?')) return;
    try {
      await reviewsAPI.remove(id);
      toast.success('Rəy silindi');
      setReviews(reviews.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err?.message || 'Silmə alınmadı');
    }
  };

  return (
    <>
      <h2 className="dash-title">Bütün Rəylər</h2>
      {reviews.length === 0 ? (
        <div className="empty-state">
          <Star size={48} />
          <h3>Rəy yoxdur</h3>
        </div>
      ) : (
        reviews.map((r) => (
          <div key={r.id} className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
              <div>
                <strong>{r.customer_name}</strong> →
                <span style={{ color: 'var(--gold)' }}> {r.brand} {r.model}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <span style={{ color: 'var(--gold)' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p style={{ color: 'var(--tx-2)', fontSize: '.88rem' }}>{r.comment}</p>
            <div style={{ fontSize: '.72rem', color: 'var(--tx-3)', marginTop: '.5rem' }}>
              {new Date(r.created_at).toLocaleDateString('az-AZ')}
            </div>
          </div>
        ))
      )}
    </>
  );
}

// ── PROMO KODLAR ──────────────────────────────────────────
function PromosSection() {
  const [codes, setCodes] = useState([]);
  const [form, setForm]   = useState({ code: '', discountPct: 10, maxUses: '', validUntil: '' });
  const [showForm, setShowForm] = useState(false);

  const load = () => adminAPI.listPromos().then(({ data }) => setCodes(data.codes));
  useEffect(load, []);

  const create = async () => {
    try {
      await adminAPI.createPromo({
        code: form.code,
        discountPct: parseInt(form.discountPct),
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        validUntil: form.validUntil || undefined,
      });
      toast.success('Yaradıldı');
      setShowForm(false);
      setForm({ code: '', discountPct: 10, maxUses: '', validUntil: '' });
      load();
    } catch (err) {
      toast.error(err?.message || 'Xəta');
    }
  };

  const toggle = async (c) => {
    await adminAPI.togglePromo(c.id);
    load();
  };

  const remove = async (c) => {
    if (!confirm(`${c.code} silinsin?`)) return;
    await adminAPI.deletePromo(c.id);
    load();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="dash-title" style={{ marginBottom: 0 }}>Promo kodları</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          + Yeni kod
        </button>
      </div>

      {showForm && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Kod</label><input className="form-control" value={form.code} onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})} /></div>
            <div className="form-group"><label className="form-label">Endirim %</label><input className="form-control" type="number" min="1" max="100" value={form.discountPct} onChange={(e) => setForm({...form, discountPct: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Max istifadə</label><input className="form-control" type="number" value={form.maxUses} onChange={(e) => setForm({...form, maxUses: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Bitmə tarixi</label><input className="form-control" type="date" value={form.validUntil} onChange={(e) => setForm({...form, validUntil: e.target.value})} /></div>
          </div>
          <button className="btn btn-primary" onClick={create}>Yarat</button>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Kod</th><th>Endirim</th><th>İstifadə</th><th>Bitmə</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <td><strong style={{ color: 'var(--gold)' }}>{c.code}</strong></td>
                <td>{c.discount_pct}%</td>
                <td>{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                <td>{c.valid_until ? c.valid_until.slice(0,10) : '∞'}</td>
                <td>{c.is_active ? <span className="badge bOk">Aktiv</span> : <span className="badge bErr">Deaktiv</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: '.3rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>
                      {c.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// ── SƏHİFƏLƏR (About, Contact) — Admin redaktə bölməsi
// ═══════════════════════════════════════════════════════════
function PagesSection() {
  const [pages, setPages]       = useState([]);
  const [activeSlug, setActiveSlug] = useState('about');
  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [metaJson, setMetaJson] = useState('{}');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);

  // İlk yükləmədə bütün səhifələri al
  const loadPages = () => {
    setIsLoading(true);
    adminAPI.listPages()
      .then(({ data }) => {
        setPages(data.pages);
        // Aktiv slug-un məlumatlarını formaya yüklə
        const current = data.pages.find((p) => p.slug === activeSlug);
        if (current) {
          setTitle(current.title);
          setContent(current.content);
          setMetaJson(JSON.stringify(current.meta || {}, null, 2));
        }
      })
      .catch((err) => toast.error(err?.message || 'Səhifələr yüklənmədi'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadPages(); }, []);

  // Slug dəyişəndə formanı yenilə
  const selectPage = (slug) => {
    const p = pages.find((x) => x.slug === slug);
    if (p) {
      setActiveSlug(slug);
      setTitle(p.title);
      setContent(p.content);
      setMetaJson(JSON.stringify(p.meta || {}, null, 2));
    }
  };

  // Saxla
  const save = async () => {
    // JSON-u parse et — yanlış formatda olarsa xəta ver
    let meta;
    try {
      meta = JSON.parse(metaJson);
    } catch {
      return toast.error('Meta JSON formatı yanlışdır');
    }
    if (!title.trim()) return toast.error('Başlıq boş ola bilməz');
    if (!content.trim()) return toast.error('Məzmun boş ola bilməz');

    setIsSaving(true);
    try {
      await adminAPI.updatePage(activeSlug, { title, content, meta });
      toast.success(`"${activeSlug}" səhifəsi yeniləndi!`);
      loadPages(); // Yenidən yüklə
    } catch (err) {
      toast.error(err?.message || 'Yenilənmə alınmadı');
    } finally {
      setIsSaving(false);
    }
  };

  // Slug üçün dostsanə ad
  const SLUG_LABELS = {
    about:   'Haqqımızda',
    contact: 'Əlaqə',
    privacy: 'Məxfilik',
    terms:   'Şərtlər',
  };

  // Meta JSON üçün nümunə kömək mətni
  const META_HINTS = {
    contact: 'Misal:\n{\n  "phone": "+994 50 000 00 00",\n  "email": "info@luxdrive.az",\n  "address": "Bakı, Azərbaycan",\n  "working_hours": "Hər gün 09:00 — 22:00",\n  "instagram": "luxdrive.az",\n  "facebook": "luxdrive.az"\n}',
    about:   'Misal:\n{\n  "texts": {\n    "badge": "2022-dən bəri",\n    "hero_prefix": "Lüks Sürüş",\n    "hero_accent": "Hekayəmiz",\n    "subtitle": "Premium platforma...",\n    "mission_text": "...",\n    "vision_text": "..."\n  },\n  "established": 2022,\n  "cars_count": 500,\n  "happy_clients": 5000\n}',
  };

  if (isLoading && pages.length === 0) {
    return <div style={{ padding: '2rem' }}><div className="loader" /></div>;
  }

  return (
    <>
      <h2 className="dash-title">
        <FileText size={22} style={{ verticalAlign: 'middle', color: 'var(--gold)' }} />
        {' '}Sayt Səhifələri
      </h2>
      <p style={{ color: 'var(--tx-2)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Public səhifələrin (About, Contact) məzmununu buradan redaktə edə bilərsiniz.
        Dəyişikliklər dərhal sayta əks olunur.
      </p>

      {/* Səhifə seçimi tab-ları */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.5rem',
      }}>
        {pages.map((p) => (
          <button
            key={p.slug}
            onClick={() => selectPage(p.slug)}
            className={`btn btn-sm ${activeSlug === p.slug ? 'btn-primary' : 'btn-ghost'}`}
          >
            {SLUG_LABELS[p.slug] || p.slug}
          </button>
        ))}
      </div>

      {/* Redaktə forması */}
      <div className="dash-card">
        {/* Başlıq */}
        <div className="form-group">
          <label className="form-label">Səhifə başlığı</label>
          <input
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Səhifənin əsas başlığı"
          />
        </div>

        {/* Məzmun (HTML) */}
        <div className="form-group">
          <label className="form-label">
            Məzmun (HTML dəstəklənir)
            <span style={{ color: 'var(--tx-3)', fontWeight: 400, marginLeft: '0.5rem' }}>
              — &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt; istifadə edə bilərsiniz
            </span>
          </label>
          <textarea
            className="form-control"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            style={{
              fontFamily: 'Menlo, Consolas, monospace',
              fontSize: '0.85rem',
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Meta (JSON) */}
        <div className="form-group">
          <label className="form-label">
            Meta məlumat (JSON)
            <span style={{ color: 'var(--tx-3)', fontWeight: 400, marginLeft: '0.5rem' }}>
              — telefon, email, ünvan kimi strukturlaşdırılmış data
            </span>
          </label>
          <textarea
            className="form-control"
            value={metaJson}
            onChange={(e) => setMetaJson(e.target.value)}
            rows={10}
            style={{
              fontFamily: 'Menlo, Consolas, monospace',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              background: '#0a0a18',
            }}
            placeholder={META_HINTS[activeSlug] || '{}'}
          />
          {META_HINTS[activeSlug] && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ fontSize: '0.78rem', color: 'var(--gold)', cursor: 'pointer' }}>
                💡 Nümunə format göstər
              </summary>
              <pre style={{
                fontSize: '0.72rem',
                background: 'var(--bg-3)',
                padding: '0.8rem',
                borderRadius: 'var(--r-md)',
                marginTop: '0.5rem',
                color: 'var(--tx-2)',
                overflow: 'auto',
              }}>{META_HINTS[activeSlug]}</pre>
            </details>
          )}
        </div>

        {/* Saxla düyməsi */}
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={isSaving}
        >
          <Save size={16} />
          {isSaving ? 'Saxlanır...' : 'Dəyişiklikləri Saxla'}
        </button>

        {/* Önbax linki */}
        <a
          href={`/${activeSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          style={{ marginLeft: '0.5rem' }}
        >
          🔗 Səhifəyə bax (yeni tab)
        </a>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// ── MESAJLAR — Admin Live Chat (real-vaxt müştəri dəstəyi)
// ═══════════════════════════════════════════════════════════
function MessagesSection() {
  const [conversations, setConversations] = useState([]);
  const [activeUserId, setActiveUserId]   = useState(null);
  const [activeUser, setActiveUser]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [isSending, setIsSending]         = useState(false);
  const bodyRef = useRef(null);

  // ── Söhbətlər siyahısını yüklə ─────────────────────────
  const loadConversations = () => {
    chatAPI.conversations()
      .then(({ data }) => setConversations(data.conversations))
      .catch((err) => toast.error(err?.message || 'Söhbətlər yüklənmədi'));
  };

  useEffect(() => {
    loadConversations();
    // Hər 15 saniyədə bir yenilə (real-time + polling fallback)
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, []);

  // ── Aktiv söhbətin mesajlarını yüklə ───────────────────
  useEffect(() => {
    if (!activeUserId) {
      setMessages([]);
      setActiveUser(null);
      return;
    }

    chatAPI.messages(activeUserId, { limit: 100 })
      .then(({ data }) => {
        setMessages(data.messages);
        // Bu istifadəçinin mesajlarını oxundu olaraq işarələ (socket)
        getSocket()?.emit('chat:read', { senderId: activeUserId });
      })
      .catch((err) => toast.error(err?.message || 'Mesajlar yüklənmədi'));

    // İstifadəçi məlumatını siyahıdan tap
    const conv = conversations.find((c) => c.other_id === activeUserId);
    if (conv) {
      setActiveUser({
        id: activeUserId,
        name: conv.other_name,
        avatar: conv.other_avatar,
        role: conv.other_role,
        online: conv.other_online,
      });
    }
  }, [activeUserId, conversations]);

  // ── Yeni mesaj gəldikdə real-vaxt yenilə ───────────────
  useEffect(() => {
    const handler = (e) => {
      const msg = e.detail;
      // Aktiv söhbətə aiddirsə əlavə et
      if (msg.senderId === activeUserId || msg.receiverId === activeUserId) {
        setMessages((prev) => [...prev, msg]);
      }
      // Söhbətlər siyahısını yenilə
      loadConversations();
    };
    window.addEventListener('chat:message', handler);
    return () => window.removeEventListener('chat:message', handler);
  }, [activeUserId]);

  // ── Aşağıya scroll (yeni mesaj gəldikdə) ───────────────
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Mesaj göndər ───────────────────────────────────────
  const sendMessage = () => {
    const text = input.trim();
    if (!text || !activeUserId) return;

    setIsSending(true);
    const socket = getSocket();
    if (!socket) {
      toast.error('Socket bağlı deyil. Səhifəni yeniləyin.');
      setIsSending(false);
      return;
    }

    socket.emit('chat:send', { receiverId: activeUserId, content: text }, (ack) => {
      setIsSending(false);
      if (ack?.error) {
        toast.error(ack.message || 'Göndərilə bilmədi');
      } else {
        setInput('');
        // Mesajı dərhal göstər (optimistic update artıq event-də edilir)
      }
    });
  };

  // ── Zaman formatla ─────────────────────────────────────
  const formatTime = (iso) => {
    const date = new Date(iso);
    return date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <h2 className="dash-title">
        <MessageSquare size={22} style={{ verticalAlign: 'middle', color: 'var(--cyan)' }} />
        {' '}Canlı Mesajlar
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--ok)',
          marginLeft: '1rem',
          fontWeight: 600,
        }}>
          <Circle size={8} fill="var(--ok)" style={{ verticalAlign: 'middle' }} /> Siz onlayn-sınız
        </span>
      </h2>
      <p style={{ color: 'var(--tx-2)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Müştərilərdən gələn mesajları burada cavablandırın. Real-vaxt çatdırılma aktivdir.
      </p>

      <div className="dash-card" style={{
        padding: 0,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 320px) 1fr',
        minHeight: '500px',
        height: '70vh',
      }}>
        {/* ── Sol: söhbətlər siyahısı ─────────────────── */}
        <div style={{
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
          background: 'var(--bg-1)',
        }}>
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--tx-2)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            Söhbətlər ({conversations.length})
          </div>

          {conversations.length === 0 ? (
            <div style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              color: 'var(--tx-3)',
              fontSize: '0.85rem',
            }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <div>Hələ söhbət yoxdur</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                Müştərilərin mesajları burada görünəcək
              </div>
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.other_id}
                onClick={() => setActiveUserId(c.other_id)}
                style={{
                  padding: '0.9rem 1rem',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: activeUserId === c.other_id ? 'var(--bg-3)' : 'transparent',
                  borderLeft: activeUserId === c.other_id
                    ? '3px solid var(--gold)'
                    : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--bg-3)',
                    border: '2px solid var(--border-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: 'var(--gold)', fontSize: '0.85rem',
                    overflow: 'hidden', position: 'relative', flexShrink: 0,
                  }}>
                    {c.other_avatar
                      ? <img src={c.other_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (c.other_name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                    {/* Onlayn dot */}
                    {c.other_online && (
                      <span style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 10, height: 10, borderRadius: '50%',
                        background: 'var(--ok)',
                        border: '2px solid var(--bg-1)',
                      }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--tx-1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span>{c.other_name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--tx-3)', fontWeight: 400 }}>
                        {formatTime(c.created_at)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--tx-2)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '0.15rem',
                    }}>
                      {c.sender_id === c.other_id ? '' : '✓ '}{c.content}
                    </div>
                    {/* Oxunmamış sayğacı */}
                    {parseInt(c.unread_count) > 0 && (
                      <span style={{
                        background: 'var(--err)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '10px',
                        marginTop: '0.3rem',
                        display: 'inline-block',
                      }}>
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Sağ: aktiv söhbət ───────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!activeUser ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--tx-3)',
            }}>
              <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <div style={{ fontSize: '0.95rem' }}>Söhbət seçin</div>
              <div style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}>
                Sol tərəfdən müştəri ilə söhbəti açın
              </div>
            </div>
          ) : (
            <>
              {/* Başlıq */}
              <div style={{
                padding: '1rem 1.2rem',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'var(--bg-3)',
                    border: '2px solid var(--border-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: 'var(--gold)', fontSize: '0.8rem',
                    overflow: 'hidden',
                  }}>
                    {activeUser.avatar
                      ? <img src={activeUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (activeUser.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeUser.name}</div>
                    <div style={{
                      fontSize: '0.72rem',
                      color: activeUser.online ? 'var(--ok)' : 'var(--tx-3)',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}>
                      <Circle size={8} fill="currentColor" />
                      {activeUser.online ? 'Onlayn' : 'Offlayn'} · {activeUser.role}
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveUserId(null)}
                  title="Söhbəti bağla"
                >
                  ✕
                </button>
              </div>

              {/* Mesajlar */}
              <div
                ref={bodyRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  background: 'var(--bg-0)',
                }}
              >
                {messages.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: 'var(--tx-3)',
                    padding: '2rem',
                    fontSize: '0.85rem',
                  }}>
                    Hələ mesaj yoxdur. Salamlaşmaq üçün ilk mesajı göndərin!
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const isMine = m.sender_id !== activeUserId && m.senderId !== activeUserId;
                    return (
                      <div
                        key={m.id || i}
                        style={{
                          maxWidth: '75%',
                          alignSelf: isMine ? 'flex-end' : 'flex-start',
                          padding: '0.6rem 0.95rem',
                          background: isMine
                            ? 'linear-gradient(135deg, var(--gold), var(--gold-dark))'
                            : 'var(--bg-2)',
                          color: isMine ? 'var(--bg-0)' : 'var(--tx-1)',
                          borderRadius: 'var(--r-md)',
                          borderBottomRightRadius: isMine ? '4px' : 'var(--r-md)',
                          borderBottomLeftRadius: isMine ? 'var(--r-md)' : '4px',
                          fontSize: '0.88rem',
                          lineHeight: 1.4,
                          fontWeight: isMine ? 500 : 400,
                          border: !isMine ? '1px solid var(--border)' : 'none',
                          animation: 'fadeUp 0.25s ease',
                        }}
                      >
                        {m.content}
                        <div style={{
                          fontSize: '0.65rem',
                          opacity: 0.6,
                          marginTop: '0.25rem',
                          textAlign: 'right',
                        }}>
                          {formatTime(m.created_at || m.createdAt)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <div style={{
                padding: '0.8rem 1rem',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-1)',
                display: 'flex',
                gap: '0.6rem',
                alignItems: 'flex-end',
              }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Müştəriyə cavab yazın... (Enter göndərmək üçün)"
                  rows={2}
                  className="form-control"
                  style={{ resize: 'none', minHeight: 'auto' }}
                />
                <button
                  className="btn btn-primary"
                  onClick={sendMessage}
                  disabled={isSending || !input.trim()}
                  style={{ height: 'fit-content', padding: '0.8rem 1rem' }}
                  title="Göndər (Enter)"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
