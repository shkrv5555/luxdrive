/**
 * InitialLoader — Saytın ilk yüklənmə splash ekranı
 *
 * Premium animasiya:
 *   1. Qızıl LuxDrive loqosu fade-in + scale-up
 *   2. Aşağıda incə progress bar (gradient: gold → purple → cyan)
 *   3. Ekran fade-out edir, kontent ortaya çıxır
 *
 * sessionStorage istifadə edir — yalnız ilk session açılışında göstərilir,
 * səhifə yenilənəndə təkrar görünmür (UX).
 */
import { useEffect, useState } from 'react';
import './InitialLoader.css';

export default function InitialLoader() {
  const [stage, setStage] = useState('loading'); // 'loading' | 'exit' | 'done'

  useEffect(() => {
    // Bu sessiyada artıq göstərilibsə, dərhal keç
    if (sessionStorage.getItem('ld_splash_shown')) {
      setStage('done');
      return;
    }

    // İlk render: progress animasiyası, 1.4 san sonra fade-out
    const exitTimer = setTimeout(() => setStage('exit'),  1400);
    // Fade-out animasiyası bitdikdə loader DOM-dan silinir
    const doneTimer = setTimeout(() => {
      setStage('done');
      sessionStorage.setItem('ld_splash_shown', '1');
    }, 2000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (stage === 'done') return null;

  return (
    <div className={`initial-loader ${stage === 'exit' ? 'exit' : ''}`} aria-hidden="true">
      {/* Arxa planda parıldayan radial gradient */}
      <div className="loader-bg-glow" />

      {/* Qızıl tor pattern arxa planda */}
      <div className="loader-grid" />

      {/* Logo */}
      <div className="loader-content">
        <div className="loader-logo">
          <span className="logo-lux">Lux</span>
          <span className="logo-drive">Drive</span>
        </div>
        <div className="loader-tagline">PREMIUM AVTOMOBİL İCARƏSİ</div>

        {/* Progress bar */}
        <div className="loader-progress">
          <div className="loader-progress-fill" />
        </div>
      </div>
    </div>
  );
}
