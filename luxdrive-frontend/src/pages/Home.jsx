/**
 * Home — Ana səhifə
 *
 * Bölmələr:
 *   • Hero
 *   • Xüsusiyyətlər
 *   • Seçilmiş avtomobillər (API-dən)
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Bolt, Star, Headphones, Sparkles, ArrowRight } from 'lucide-react';
import { carsAPI } from '@api/endpoints.js';
import CarCard from '@components/cars/CarCard.jsx';
import './Home.css';

export default function Home() {
  const [featuredCars, setFeaturedCars] = useState([]);
  const [stats, setStats] = useState({ cars: 0, customers: 0, renters: 0 });

  // Seçilmiş avtomobilləri yüklə
  useEffect(() => {
    carsAPI.list({ status: 'available', limit: 6, sortBy: 'rating' })
      .then(({ data }) => {
        setFeaturedCars(data.items || []);
        setStats((s) => ({ ...s, cars: data.pagination?.total || 0 }));
      })
      .catch((err) => console.error('Avtomobillər yüklənə bilmədi:', err));
  }, []);

  return (
    <div className="home">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-content container">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              <Sparkles size={14} /> №1 Premium İcarə Platforması
            </div>

            <h1 className="hero-title">
              Premium Avtomobil<br />
              <span className="gradient-text">İcarəsi — Yeni Səviyyə</span>
            </h1>

            <p className="hero-sub">
              Azərbaycanın ən lüks avtomobil icarə platforması.
              Seçin, rezerv edin, sürün — hər şey bir kliklə.
            </p>

            <div className="hero-actions">
              <Link to="/cars" className="btn btn-primary btn-lg">
                <Car size={18} /> Avtomobil Seç
              </Link>
              <Link to="/about" className="btn btn-secondary btn-lg">
                Necə işləyir <ArrowRight size={18} />
              </Link>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-num">{stats.cars}+</div>
                <div className="hero-stat-label">Avtomobil</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-num">24/7</div>
                <div className="hero-stat-label">Dəstək</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-num">100%</div>
                <div className="hero-stat-label">Sığortalı</div>
              </div>
            </div>
          </div>

          {/* Sağ tərəf — featured car preview */}
          {featuredCars[0] && (
            <div className="hero-visual">
              <div className="hero-card">
                <img className="hero-car-img" src={featuredCars[0].image_url} alt="" />
                <div className="hero-car-name">{featuredCars[0].brand} {featuredCars[0].model}</div>
                <div className="hero-car-price">
                  ₼{featuredCars[0].price_per_day} <span>/ gün</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="glow-divider" />

      {/* ── XÜSUSIYYƏTLƏR ────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Niyə LuxDrive?</div>
            <h2 className="section-title">
              Premium Təcrübə, <span className="gradient-text">Sərfəli Qiymət</span>
            </h2>
          </div>

          <div className="feature-grid">
            {[
              { icon: <Car size={24} />,        title: 'Geniş Seçim',     desc: 'Lüksdən ekonomu qədər hər kateqoriyadan avtomobillər.' },
              { icon: <Bolt size={24} />,       title: 'Ani Rezervasyon', desc: 'Saniyələr içində rezerv edin, dərhal təsdiq alın.' },
              { icon: <Star size={24} />,       title: 'Yoxlanmış İcarəçilər', desc: 'Bütün icarəçilər doğrulanmış, reytinqli.' },
              { icon: <Headphones size={24} />, title: '24/7 Dəstək',     desc: 'Hər zaman yanınızdayıq. Canlı çat və zəng dəstəyi.' },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-divider" />

      {/* ── SEÇİLMİŞ AVTOMOBİLLƏR ────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Populyar</div>
            <h2 className="section-title">
              Seçilmiş <span className="gradient-text">Avtomobillər</span>
            </h2>
          </div>

          <div className="cars-grid">
            {featuredCars.length === 0 ? (
              // Skeleton placeholder
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 360 }} />
              ))
            ) : (
              featuredCars.slice(0, 3).map((car) => <CarCard key={car.id} car={car} />)
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link to="/cars" className="btn btn-secondary btn-lg">
              Bütün Avtomobillərə Bax <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
