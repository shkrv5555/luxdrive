/**
 * CarDetail — Avtomobil detal səhifəsi
 *
 * • Tam avtomobil məlumatı
 * • Spesifikasiya kartları
 * • Rəylər siyahısı
 * • Rezerv et düyməsi → BookingModal açır
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Settings, Fuel, Users, Calendar, Star,
  CheckCircle, XCircle, MessageCircle, Phone, LogIn,
} from 'lucide-react';
import { carsAPI, reviewsAPI } from '@api/endpoints.js';
import { openModal, openChat } from '@store/slices/uiSlice.js';
import { selectIsAuthenticated, selectUser } from '@store/slices/authSlice.js';
import BookingModal from '@components/booking/BookingModal.jsx';
import './CarDetail.css';

const FUEL_LABELS = { petrol: 'Benzin', diesel: 'Dizel', hybrid: 'Hibrid', electric: 'Elektrik' };

export default function CarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuth = useSelector(selectIsAuthenticated);
  const user   = useSelector(selectUser);

  const [car, setCar]         = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      carsAPI.get(id),
      reviewsAPI.byCar(id, { limit: 20 }),
    ])
      .then(([carRes, rvRes]) => {
        setCar(carRes.data.car);
        setReviews(rvRes.data.items);
      })
      .catch(() => navigate('/cars'))
      .finally(() => setIsLoading(false));
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="detail-page container">
        <div className="skeleton" style={{ height: 400, marginTop: '6rem' }} />
      </div>
    );
  }
  if (!car) return null;

  const avgRating = parseFloat(car.avg_rating) || 0;
  const canBook   = isAuth && car.is_available && user?.role === 'customer';

  // Rezerv düyməsi kliki
  const handleBook = () => {
    if (!isAuth) {
      navigate('/login', { state: { from: `/cars/${id}` } });
      return;
    }
    dispatch(openModal({ name: 'booking', data: { car } }));
  };

  // İcarəçi ilə çat
  const handleChat = () => {
    if (!isAuth) {
      navigate('/login', { state: { from: `/cars/${id}` } });
      return;
    }
    dispatch(openChat(car.renter_id));
  };

  return (
    <div className="detail-page">
      <div className="detail-layout container">
        {/* Sol — şəkil və rəylər */}
        <div>
          <Link to="/cars" className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
            <ArrowLeft size={16} /> Avtomobillərə qayıt
          </Link>

          <img
            className="detail-img"
            src={car.image_url || '/placeholder-car.jpg'}
            alt={`${car.brand} ${car.model}`}
          />

          {/* Açıqlama */}
          {car.description && (
            <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-2)', borderRadius: 'var(--r-lg)' }}>
              <h3 style={{ marginBottom: '0.8rem', fontSize: '1.1rem' }}>Avtomobil haqqında</h3>
              <p style={{ color: 'var(--tx-2)', lineHeight: 1.7, fontSize: '0.92rem' }}>
                {car.description}
              </p>
            </div>
          )}

          {/* Rəylər */}
          <div className="detail-reviews">
            <h3 style={{ fontFamily: 'var(--font-disp)', fontSize: '1.4rem', marginBottom: '1.2rem' }}>
              Müştəri Rəyləri ({reviews.length})
            </h3>

            {reviews.length === 0 ? (
              <div className="empty-state">
                <MessageCircle size={36} />
                <h3>Hələ rəy yoxdur</h3>
                <p>İlk rəyi siz yaza bilərsiniz!</p>
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="review-card">
                  <div className="review-hdr">
                    <div className="reviewer-info">
                      <div className="reviewer-avatar">
                        {r.customer_avatar
                          ? <img src={r.customer_avatar} alt="" />
                          : r.customer_name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="reviewer-name">{r.customer_name}</div>
                        <div className="review-date">
                          {new Date(r.created_at).toLocaleDateString('az-AZ')}
                        </div>
                      </div>
                    </div>
                    <div className="review-stars">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </div>
                  </div>
                  <div className="review-text">{r.comment}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sağ — info və booking */}
        <div className="detail-info">
          <div className="detail-brand">{car.brand}</div>
          <h1 className="detail-title">{car.brand} {car.model}</h1>

          <div style={{ marginBottom: '0.8rem' }}>
            {car.is_available ? (
              <span className="badge-status avail">
                <CheckCircle size={12} /> Boş — İcarəyə götürülə bilər
              </span>
            ) : (
              <span className="badge-status rented">
                <XCircle size={12} /> İcarədə — Hazırda mövcud deyil
              </span>
            )}
          </div>

          <div className="spec-grid">
            <div className="spec-box">
              <Settings size={20} style={{ color: 'var(--gold)' }} />
              <div className="spec-val">{car.transmission === 'auto' ? 'Avtomat' : 'Mexaniki'}</div>
              <div className="spec-lbl">Ötürücü</div>
            </div>
            <div className="spec-box">
              <Fuel size={20} style={{ color: 'var(--gold)' }} />
              <div className="spec-val">{FUEL_LABELS[car.fuel]}</div>
              <div className="spec-lbl">Yanacaq</div>
            </div>
            <div className="spec-box">
              <Users size={20} style={{ color: 'var(--gold)' }} />
              <div className="spec-val">{car.seats} nəfər</div>
              <div className="spec-lbl">Oturacaq</div>
            </div>
            <div className="spec-box">
              <Calendar size={20} style={{ color: 'var(--gold)' }} />
              <div className="spec-val">{car.year}</div>
              <div className="spec-lbl">İl</div>
            </div>
          </div>

          {/* Booking kartı */}
          <div className="booking-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--tx-3)', marginBottom: '0.2rem' }}>
                  Gündəlik qiymət
                </div>
                <div className="car-price" style={{ fontSize: '1.6rem' }}>
                  ₼{car.price_per_day} <span>/ gün</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--gold)', fontSize: '1.4rem', fontWeight: 800 }}>
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--tx-3)' }}>
                  <Star size={11} style={{ verticalAlign: 'middle', color: 'var(--gold)' }} /> {reviews.length} rəy
                </div>
              </div>
            </div>

            {!car.is_available ? (
              <button className="btn btn-ghost btn-full" disabled>
                <XCircle size={16} /> Hazırda mövcud deyil
              </button>
            ) : !isAuth ? (
              <button className="btn btn-primary btn-full" onClick={handleBook}>
                <LogIn size={16} /> Rezerv etmək üçün daxil olun
              </button>
            ) : user?.role === 'renter' || user?.role === 'admin' ? (
              <button className="btn btn-ghost btn-full" disabled>
                {user?.role === 'admin' ? 'Admin rezerv edə bilməz' : 'İcarəçilər rezerv edə bilməz'}
              </button>
            ) : (
              <button className="btn btn-primary btn-full" onClick={handleBook}>
                <Calendar size={16} /> İndi Rezerv Et
              </button>
            )}

            {/* İcarəçi ilə əlaqə */}
            {isAuth && car.renter_id !== user?.id && (
              <button
                className="btn btn-secondary btn-full"
                style={{ marginTop: '0.8rem' }}
                onClick={handleChat}
              >
                <MessageCircle size={16} /> İcarəçi ilə əlaqə
              </button>
            )}
          </div>

          {/* İcarəçi məlumatı */}
          <div className="renter-info">
            <div className="renter-avatar">
              {car.renter_avatar
                ? <img src={car.renter_avatar} alt="" />
                : car.renter_name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--tx-3)' }}>İcarəçi</div>
              <div style={{ fontWeight: 700 }}>{car.renter_name}</div>
              {car.renter_phone && (
                <div style={{ fontSize: '0.78rem', color: 'var(--tx-2)', marginTop: '0.2rem' }}>
                  <Phone size={11} style={{ verticalAlign: 'middle' }} /> {car.renter_phone}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rezerv modal */}
      <BookingModal onSuccess={() => carsAPI.get(id).then(({data}) => setCar(data.car))} />
    </div>
  );
}
