/**
 * Contact — Əlaqə səhifəsi
 *
 * Bölmələr:
 *   • Əlaqə formu (ad, email, mövzu, mesaj)
 *   • Əlaqə məlumatları kartları (telefon, email, ünvan)
 *   • İş saatları
 *   • Sosial media linkləri
 *   • FAQ (Tez-tez verilən suallar)
 */
import { useState, useEffect } from 'react';
import {
  Phone, Mail, MapPin, Clock, Send, MessageCircle,
  Instagram, Facebook, Twitter, Youtube,
  HelpCircle, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pagesAPI } from '@api/endpoints.js';
import './Contact.css';

// Default əlaqə məlumatları (admin redaktə etməyibsə fallback)
const DEFAULT_META = {
  phone: '+994 50 000 00 00',
  email: 'info@luxdrive.az',
  whatsapp: '+994500000000',
  address: 'Bakı, Nəsimi rayonu',
  working_hours: 'Hər gün 09:00 — 22:00',
  instagram: 'luxdrive.az',
  facebook: 'luxdrive.az',
};

export default function Contact() {
  // Form state
  const [form, setForm] = useState({
    name: '', email: '', subject: '', message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FAQ state — açıq olan sual indeksi
  const [openFaq, setOpenFaq] = useState(0);

  // Səhifə məzmunu (admin tərəfindən redaktə oluna bilər)
  const [meta, setMeta] = useState(DEFAULT_META);

  useEffect(() => {
    // DB-dən admin tərəfindən qoyulmuş əlaqə məlumatlarını yüklə
    pagesAPI.get('contact')
      .then(({ data }) => {
        if (data.page?.meta) {
          setMeta({ ...DEFAULT_META, ...data.page.meta });
        }
      })
      .catch(() => { /* Default-lara qayıt */ });
  }, []);

  // Telefon nömrəsindən link üçün rəqəmlər
  const phoneDigits = (meta.phone || '').replace(/[^0-9+]/g, '');

  // Form göndərmə (simulasiyalı — backend endpoint əlavə oluna bilər)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      return toast.error('Bütün məcburi sahələri doldurun');
    }
    if (!form.email.includes('@')) {
      return toast.error('Düzgün e-mail daxil edin');
    }

    setIsSubmitting(true);
    // Real layihədə burada POST /api/contact çağırılır
    await new Promise((resolve) => setTimeout(resolve, 1200));

    toast.success('Mesajınız uğurla göndərildi! 24 saat ərzində cavablandırılacaq.', {
      duration: 5000,
    });
    setForm({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  // FAQ məlumatları
  const faqs = [
    {
      q: 'Avtomobil necə icarəyə götürə bilərəm?',
      a: 'Saytımızda qeydiyyatdan keçin → istədiyiniz avtomobili seçin → tarix seçib "Rezerv et" düyməsinə basın. Təsdiq dərhal gəlir.',
    },
    {
      q: 'Hansı sənədlər lazımdır?',
      a: 'Sürücülük vəsiqəsi (ən azı 1 il təcrübə) və şəxsiyyət vəsiqəsi tələb olunur. 18 yaş və yuxarı şəxslər icarə edə bilər.',
    },
    {
      q: 'Sığorta var?',
      a: 'Bəli! Bütün avtomobillər tam KASKO + icbari sığortalıdır. Hər hansı problem yaransa, biz həll edirik.',
    },
    {
      q: 'Endirim kodlarını necə tətbiq edirəm?',
      a: 'Rezervasyon səhifəsində "Promo kod" sahəsi var. Orada kodu yazın (məs: LUX10, VIP20). Cari kodlar üçün canlı çat ilə əlaqə saxlayın.',
    },
    {
      q: 'Rezervasiyanı necə ləğv edə bilərəm?',
      a: 'Profilim → Rezervasiyalarım bölməsindən "Ləğv et" düyməsinə basın. Aktiv rezervasiyalar dərhal ləğv edilir, ödəniş 3-5 iş günündə qaytarılır.',
    },
    {
      q: 'İcarəçi kimi qeydiyyatdan necə keçim?',
      a: 'Qeydiyyat səhifəsində "İcarəçi" rolunu seçin. Daxil olduqdan sonra Dashboard-da "Avtomobillərim" bölməsindən öz avtomobillərinizi əlavə edə bilərsiniz.',
    },
  ];

  return (
    <div className="contact-page">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="contact-hero">
        <div className="container">
          <div className="contact-badge">
            <MessageCircle size={14} /> 24/7 Dəstək
          </div>
          <h1 className="contact-title">
            Bizimlə <span className="gradient-text">Əlaqə</span>
          </h1>
          <p className="contact-subtitle">
            Sualınız var? Dəstəyə ehtiyacınız var? Komandamız sizinlə əlaqə saxlamağa hazırdır.
          </p>
        </div>
      </section>

      <div className="glow-divider" />

      {/* ── ƏLAQƏ KARTLARI ──────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="contact-info-grid">
            <div className="contact-info-card">
              <div className="contact-info-icon gold"><Phone size={26} /></div>
              <h3 className="contact-info-title">Telefon</h3>
              <p className="contact-info-value">{meta.phone}</p>
              <p className="contact-info-hint">{meta.working_hours}</p>
              <a href={`tel:${phoneDigits}`} className="contact-info-link">Zəng et →</a>
            </div>

            <div className="contact-info-card">
              <div className="contact-info-icon purple"><Mail size={26} /></div>
              <h3 className="contact-info-title">E-mail</h3>
              <p className="contact-info-value">{meta.email}</p>
              <p className="contact-info-hint">24 saat ərzində cavab</p>
              <a href={`mailto:${meta.email}`} className="contact-info-link">Yaz →</a>
            </div>

            <div className="contact-info-card">
              <div className="contact-info-icon cyan"><MapPin size={26} /></div>
              <h3 className="contact-info-title">Ünvan</h3>
              <p className="contact-info-value">{meta.address}</p>
              <p className="contact-info-hint">Cənub Bulvarı 22</p>
              <a
                href="https://maps.google.com/?q=Baku+Nasimi"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-info-link"
              >Xəritədə →</a>
            </div>

            <div className="contact-info-card">
              <div className="contact-info-icon green"><Clock size={26} /></div>
              <h3 className="contact-info-title">İş Saatları</h3>
              <p className="contact-info-value">B.e — Cümə: 09:00–20:00</p>
              <p className="contact-info-hint">Şənbə-Bazar: 10:00–18:00</p>
              <span className="contact-info-link" style={{ color: 'var(--ok)' }}>
                <span className="online-dot"></span> Hazırda Online
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="glow-divider" />

      {/* ── FORMA + XƏRİTƏ ──────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="contact-grid">
            {/* SOL — Form */}
            <div className="contact-form-wrap">
              <div className="section-tag" style={{ marginBottom: '0.8rem' }}>Mesaj göndər</div>
              <h2 className="contact-section-title">
                Bizə <span className="gradient-text">Yazın</span>
              </h2>
              <p style={{ color: 'var(--tx-2)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Formanı doldurun, komandamız tezliklə əlaqə saxlayacaq.
              </p>

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Ad Soyad *</label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Tam adınız"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-mail *</label>
                    <input
                      className="form-control"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@gmail.com"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mövzu</label>
                  <select
                    className="form-control"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  >
                    <option value="">Mövzu seçin</option>
                    <option value="rental">Avtomobil İcarəsi</option>
                    <option value="payment">Ödəniş</option>
                    <option value="renter">İcarəçi olmaq</option>
                    <option value="support">Texniki Dəstək</option>
                    <option value="partnership">Tərəfdaşlıq</option>
                    <option value="other">Digər</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mesaj *</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Mesajınızı buraya yazın..."
                    required
                    style={{ resize: 'vertical', minHeight: '120px' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ width: '100%' }}
                >
                  <Send size={16} />
                  {isSubmitting ? 'Göndərilir...' : 'Mesajı Göndər'}
                </button>
              </form>
            </div>

            {/* SAĞ — Xəritə + sosial */}
            <div className="contact-side">
              {/* Xəritə placeholder (real layihədə Google Maps embed) */}
              <div className="map-card">
                <iframe
                  title="LuxDrive Ofis"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=49.82%2C40.37%2C49.88%2C40.42&layer=mapnik&marker=40.395%2C49.852"
                  style={{ width: '100%', height: '300px', border: 'none', borderRadius: 'var(--r-lg)' }}
                  loading="lazy"
                />
                <a
                  href="https://www.openstreetmap.org/?mlat=40.395&mlon=49.852#map=14/40.395/49.852"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-link"
                >
                  Böyük xəritədə bax →
                </a>
              </div>

              {/* Sosial media */}
              <div className="social-card">
                <h3 className="social-title">Sosial Şəbəkələrdə</h3>
                <p style={{ color: 'var(--tx-3)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  Yeni avtomobillər və xüsusi təkliflər
                </p>
                <div className="social-icons">
                  <a href="#" className="social-icon-link instagram"><Instagram size={20} /></a>
                  <a href="#" className="social-icon-link facebook"><Facebook size={20} /></a>
                  <a href="#" className="social-icon-link twitter"><Twitter size={20} /></a>
                  <a href="#" className="social-icon-link youtube"><Youtube size={20} /></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="glow-divider" />

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">FAQ</div>
            <h2 className="section-title">
              Tez-tez Verilən <span className="gradient-text">Suallar</span>
            </h2>
          </div>

          <div className="faq-list">
            {faqs.map((f, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                >
                  <div className="faq-q-text">
                    <HelpCircle size={18} style={{ color: 'var(--gold)' }} />
                    <span>{f.q}</span>
                  </div>
                  <ChevronDown
                    size={20}
                    style={{
                      transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.3s ease',
                      color: 'var(--tx-3)',
                    }}
                  />
                </button>
                {openFaq === i && <div className="faq-answer">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
