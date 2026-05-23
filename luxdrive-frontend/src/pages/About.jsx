/**
 * About — Haqqımızda səhifəsi
 *
 * Bölmələr:
 *   • Hero - şirkət hekayəsi
 *   • Statistika kartları (real-time DB-dən)
 *   • Missiya & Vizyon
 *   • Dəyərlərimiz
 *   • Komanda (placeholder)
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Target, Eye, Award, Shield, Zap,
  Users, Car, Calendar, Star, ArrowRight, Heart,
} from 'lucide-react';
import { carsAPI, pagesAPI } from '@api/endpoints.js';
import './About.css';

// Admin redaktə etməyibsə default mətnlər
const DEFAULT_TEXTS = {
  badge:        '2022-dən bəri xidmət edirik',
  hero_prefix:  'Lüks Sürüş',
  hero_accent:  'Hekayəmiz',
  subtitle:     'Azərbaycanın premium avtomobil icarə platforması. Biz sadəcə avtomobil icarə etmirik — biz unudulmaz təcrübə yaradırıq.',
  mission_text: 'Hər müştərinin lüks avtomobil icarəsi təcrübəsini sadə, sürətli və etibarlı etmək. Azərbaycanda avtomobil sahibləri ilə müştəriləri bir platformada birləşdirmək.',
  vision_text:  '2030-cu ilə qədər Cənubi Qafqazın ən böyük avtomobil icarə platforması olmaq. Süni intellekt və yeni texnologiyalarla tövsiyə sistemi yaratmaq.',
};

export default function About() {
  const [stats, setStats] = useState({ cars: 0, customers: 0, bookings: 0 });
  const [texts, setTexts] = useState(DEFAULT_TEXTS);

  // Statistikanı yüklə
  useEffect(() => {
    carsAPI.list({ limit: 1 })
      .then(({ data }) => setStats((s) => ({ ...s, cars: data.pagination?.total || 0 })))
      .catch(() => {});

    // Admin tərəfindən redaktə oluna bilən mətnləri yüklə
    pagesAPI.get('about')
      .then(({ data }) => {
        if (data.page?.meta?.texts) {
          setTexts({ ...DEFAULT_TEXTS, ...data.page.meta.texts });
        }
      })
      .catch(() => { /* Default-lara qayıt */ });
  }, []);

  return (
    <div className="about-page">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="about-hero">
        <div className="container">
          <div className="about-badge">
            <Sparkles size={14} /> {texts.badge}
          </div>
          <h1 className="about-title">
            {texts.hero_prefix} <span className="gradient-text">{texts.hero_accent}</span>
          </h1>
          <p className="about-subtitle">
            {texts.subtitle}
          </p>
        </div>
      </section>

      <div className="glow-divider" />

      {/* ── STATİSTİKA ───────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="stats-grid-about">
            <div className="stat-card-about">
              <div className="stat-icon-about gold"><Car size={28} /></div>
              <div className="stat-value-about">{stats.cars}+</div>
              <div className="stat-label-about">Premium Avtomobil</div>
            </div>
            <div className="stat-card-about">
              <div className="stat-icon-about purple"><Users size={28} /></div>
              <div className="stat-value-about">5000+</div>
              <div className="stat-label-about">Məmnun Müştəri</div>
            </div>
            <div className="stat-card-about">
              <div className="stat-icon-about cyan"><Calendar size={28} /></div>
              <div className="stat-value-about">12000+</div>
              <div className="stat-label-about">Tamamlanmış Rezervasiya</div>
            </div>
            <div className="stat-card-about">
              <div className="stat-icon-about green"><Star size={28} /></div>
              <div className="stat-value-about">4.9 ★</div>
              <div className="stat-label-about">Müştəri Reytinqi</div>
            </div>
          </div>
        </div>
      </section>

      <div className="glow-divider" />

      {/* ── MİSSİYA & VİZYON ─────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Bizim haqqımızda</div>
            <h2 className="section-title">
              Premium Yanaşma, <span className="gradient-text">Şəffaf Xidmət</span>
            </h2>
          </div>

          <div className="mission-grid">
            <div className="mission-card">
              <div className="mission-icon"><Target size={32} /></div>
              <h3 className="mission-title">Missiyamız</h3>
              <p className="mission-text">{texts.mission_text}</p>
            </div>

            <div className="mission-card">
              <div className="mission-icon"><Eye size={32} /></div>
              <h3 className="mission-title">Vizyonumuz</h3>
              <p className="mission-text">{texts.vision_text}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="glow-divider" />

      {/* ── DƏYƏRLƏRİMİZ ─────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Dəyərlərimiz</div>
            <h2 className="section-title">
              Niyə <span className="gradient-text">LuxDrive</span>?
            </h2>
            <p className="section-sub">
              Müştəri məmnuniyyəti və keyfiyyət bizim üçün ən önəmlidir
            </p>
          </div>

          <div className="values-grid">
            {[
              {
                icon: <Shield size={26} />,
                title: 'Tam Sığorta',
                text: 'Bütün avtomobillər KASKO + icbari sığortalıdır. Stresə yer yoxdur.',
                color: 'gold',
              },
              {
                icon: <Zap size={26} />,
                title: 'Sürətli Rezerv',
                text: 'Saniyələr içində avtomobil seç və rezerv et. Bürokratiya yoxdur.',
                color: 'purple',
              },
              {
                icon: <Award size={26} />,
                title: 'Premium Keyfiyyət',
                text: 'Yalnız yoxlanmış, baxım keçmiş avtomobillər. Hər zaman təmiz.',
                color: 'cyan',
              },
              {
                icon: <Heart size={26} />,
                title: '24/7 Dəstək',
                text: 'Canlı çat, telefon, email — hər zaman yanınızdayıq.',
                color: 'green',
              },
            ].map((v, i) => (
              <div key={i} className={`value-card value-${v.color}`}>
                <div className="value-icon">{v.icon}</div>
                <h4 className="value-title">{v.title}</h4>
                <p className="value-text">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-divider" />

      {/* ── KOMANDA (Placeholder) ────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Komandamız</div>
            <h2 className="section-title">
              Sizin <span className="gradient-text">Xidmətinizdə</span>
            </h2>
          </div>

          <div className="team-grid">
            {[
              { name: 'Rəşad Əliyev',    role: 'CEO & Təsisçi',         initials: 'RƏ' },
              { name: 'Səbinə Quliyeva', role: 'COO',                   initials: 'SQ' },
              { name: 'Tural Məmmədov',  role: 'CTO',                   initials: 'TM' },
              { name: 'Ləman Hüseynli',  role: 'Müştəri Xidmətləri',    initials: 'LH' },
            ].map((m, i) => (
              <div key={i} className="team-card">
                <div className="team-avatar">{m.initials}</div>
                <h4 className="team-name">{m.name}</h4>
                <p className="team-role">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="about-cta">
        <div className="container">
          <h2 className="cta-title">
            Hazırsınız <span className="gradient-text">başlamağa?</span>
          </h2>
          <p className="cta-subtitle">
            İndi premium avtomobil seçin və yola çıxın
          </p>
          <div className="cta-buttons">
            <Link to="/cars" className="btn btn-primary btn-lg">
              <Car size={18} /> Avtomobillərə Bax
            </Link>
            <Link to="/contact" className="btn btn-secondary btn-lg">
              Bizimlə Əlaqə <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
