/**
 * BookingModal — Rezervasiya formu
 *
 * • Tarix seçimi (start/end)
 * • Promo kodu (backend yoxlayır)
 * • Real-time qiymət hesablama
 * • Submit edəndə backend tranzaksiyası işə düşür
 *   (race condition = 409 → "Bu tarixdə artıq rezerv edilib" mesajı)
 */
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Calendar, Tag, Check, X } from 'lucide-react';
import { bookingsAPI } from '@api/endpoints.js';
import { closeModal, selectActiveModal, selectModalData } from '@store/slices/uiSlice.js';
import toast from 'react-hot-toast';
import './BookingModal.css';

export default function BookingModal({ onSuccess }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const activeModal = useSelector(selectActiveModal);
  const data = useSelector(selectModalData);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [applied, setApplied]     = useState(null); // tətbiq edilmiş promo
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (activeModal !== 'booking' || !data?.car) return null;

  const car = data.car;
  const today = new Date().toISOString().slice(0, 10);

  // Qiymət hesabla (frontend tərəfdə — UX üçün; backend nəticə yenidən yoxlayır)
  const days = (startDate && endDate)
    ? Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
    : 0;
  const subtotal = days > 0 ? days * parseFloat(car.price_per_day) : 0;
  const discount = applied ? subtotal * applied.discount_pct / 100 : 0;
  const total = subtotal - discount;

  const close = () => {
    dispatch(closeModal());
    setStartDate(''); setEndDate(''); setPromoCode(''); setApplied(null);
  };

  const handleSubmit = async () => {
    if (days <= 0) {
      toast.error('Düzgün tarix aralığı seçin');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: res } = await bookingsAPI.create({
        carId: car.id,
        startDate, endDate,
        promoCode: applied?.code || undefined,
      });
      toast.success('Rezervasiya yaradıldı!');
      close();
      onSuccess?.(res.booking);
      navigate('/dashboard/bookings');
    } catch (err) {
      // 409 DATE_CONFLICT
      if (err.code === 'DATE_CONFLICT') {
        toast.error('Bu tarixdə avtomobil artıq rezerv edilib');
      } else {
        toast.error(err.message || 'Rezervasiya yaradıla bilmədi');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal modal-md">
        <div className="modal-hdr">
          <div>
            <div className="modal-title">Rezervasiya Et</div>
            <div className="modal-sub">{car.brand} {car.model} — ₼{car.price_per_day}/gün</div>
          </div>
          <button className="modal-close" onClick={close}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Tarix seçimi */}
          <div className="date-grid">
            <div className="form-group">
              <label className="form-label">Başlama tarixi</label>
              <input
                className="form-control"
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bitmə tarixi</label>
              <input
                className="form-control"
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Qiymət break — yalnız tarix seçilibsə */}
          {days > 0 && (
            <div className="price-break">
              <div className="price-row">
                <span>Gündəlik qiymət</span>
                <span className="amt">₼{car.price_per_day}</span>
              </div>
              <div className="price-row">
                <span>Günlərin sayı</span>
                <span className="amt">{days} gün</span>
              </div>
              {applied && (
                <div className="price-row">
                  <span>Endirim ({applied.code})</span>
                  <span className="amt" style={{ color: 'var(--ok)' }}>-₼{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="price-row total">
                <span>Cəmi</span>
                <span className="amt">₼{total.toFixed(2)}</span>
              </div>

              {/* Promo kodu */}
              {!applied ? (
                <div className="promo-row">
                  <input
                    type="text"
                    placeholder="LUX10, VIP20..."
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      // Frontend-də mock yoxlama — real promo kodu backend yoxlayır
                      // Sadəlik üçün, hard-coded local map istifadə edirik
                      const codes = { LUX10: 10, VIP20: 20, WELCOME15: 15, SUMMER25: 25 };
                      const pct = codes[promoCode];
                      if (pct) {
                        setApplied({ code: promoCode, discount_pct: pct });
                        toast.success(`${pct}% endirim tətbiq edildi`);
                      } else {
                        toast.error('Yanlış promo kodu');
                      }
                    }}
                  >
                    <Tag size={14} /> Tətbiq et
                  </button>
                </div>
              ) : (
                <div className="promo-applied">
                  <span><Check size={14} /> {applied.code} — {applied.discount_pct}% endirim</span>
                  <button onClick={() => { setApplied(null); setPromoCode(''); }}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-ftr">
          <button
            className="btn btn-primary btn-full"
            onClick={handleSubmit}
            disabled={isSubmitting || days <= 0}
          >
            {isSubmitting ? <span className="loader" /> : <><Check size={16} /> Rezerv Et</>}
          </button>
        </div>
      </div>
    </div>
  );
}
