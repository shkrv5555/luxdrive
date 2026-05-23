/**
 * AdminPanel — Tam admin sistem idarəetməsi
 *
 * Bölmələr: Dashboard | Müştərilər | İcarəçilər | Avtomobillər | Rezervasiyalar | Rəylər | Promo
 *
 * Bütün endpoint-lər `requireRole('admin')` ilə qorunur — backend-də.
 * Frontend yalnız vizual maskalama edir.
 */
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ChartPie, Users, Building2, Car as CarIcon, Calendar, Star,
  Tag, LogOut, Ban, Trash2, ToggleRight, ToggleLeft, Search,
} from 'lucide-react';
import { adminAPI, bookingsAPI, reviewsAPI, carsAPI } from '@api/endpoints.js';
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

  const block = async (u) => {
    await adminAPI.blockUser(u.id, !u.is_blocked);
    toast.success(u.is_blocked ? 'Blok açıldı' : 'Bloklandı');
    load();
  };

  const remove = async (u) => {
    if (!confirm(`${u.name} silinsin?`)) return;
    await adminAPI.deleteUser(u.id);
    toast.success('Silindi');
    load();
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
    await carsAPI.remove(c.id);
    toast.success('Silindi');
    load();
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
    await reviewsAPI.remove(id);
    toast.success('Silindi');
    setReviews(reviews.filter((r) => r.id !== id));
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
