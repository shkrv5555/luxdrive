/**
 * PageTransition — Səhifələr arası premium keçid effekti
 *
 * CSS-əsaslı (Framer Motion lazım deyil), light və performant.
 * useLocation hook ilə route dəyişikliyini izləyir, animasiya tətbiq edir.
 *
 * Effekt: yumşaq fade + yuxarıdan aşağıya slide + qızıl shimmer overlay
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

export default function PageTransition({ children }) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState('fadeIn'); // 'fadeIn' | 'fadeOut'

  useEffect(() => {
    // Yeni route gəldikdə: 1) fade-out → 2) content yenilə → 3) fade-in
    if (location.pathname !== displayLocation.pathname) {
      setStage('fadeOut');
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (stage === 'fadeOut') {
      // Outgoing animasiya bitdi — yeni content yüklə və fade-in başlat
      setDisplayLocation(location);
      setStage('fadeIn');
      // Səhifəni yuxarıya scroll et
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Premium shimmer overlay - keçid zamanı yuxarı sürüşən qızıl xətt */}
      <div className={`page-shimmer ${stage === 'fadeOut' ? 'active' : ''}`} />

      {/* Səhifə məzmunu - fade + slide animasiyası */}
      <div
        className={`page-transition ${stage}`}
        onAnimationEnd={handleAnimationEnd}
      >
        {children}
      </div>
    </>
  );
}
