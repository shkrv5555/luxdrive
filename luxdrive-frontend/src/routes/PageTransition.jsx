/**
 * PageTransition — Səhifələr arası premium keçid effekti
 *
 * SADƏLƏŞDİRİLMİŞ VERSİYA: yalnız fade-in animasiyası, key-əsaslı.
 * Köhnə versiyada fade-out event-i bəzən tutulmurdu və səhifə
 * `opacity: 0` vəziyyətində qalırdı (boş ekran kimi görünürdü).
 *
 * İndi: route dəyişəndə React `key` ilə komponent re-mount edir,
 * yeni səhifə CSS animasiyası ilə içəri gəlir.
 */
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

export default function PageTransition({ children }) {
  const location = useLocation();
  // key dəyişəndə React komponent ağacını yenidən qurur → animasiya işə düşür
  return (
    <>
      {/* Yuxarıdan qızıl shimmer xətti — hər route dəyişikliyində */}
      <div key={`shimmer-${location.pathname}`} className="page-shimmer-line" />

      {/* Səhifə məzmunu — fade-in + slide-up */}
      <div key={location.pathname} className="page-fade-in">
        {children}
      </div>
    </>
  );
}
