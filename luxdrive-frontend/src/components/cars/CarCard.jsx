/**
 * CarCard — Avtomobil kartı
 *
 * Funksionallıqlar:
 *   • Şəkil + status + kateqoriya badge
 *   • Ürək düyməsi (favorit toggle)
 *   • Reytinq + qiymət
 *   • Klikləndikdə detal səhifəsinə yönləndirir
 */
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, Settings, Fuel, Users, Star } from 'lucide-react';
import { toggleFavorite, selectFavoriteIds } from '@store/slices/favoritesSlice.js';
import { selectIsAuthenticated } from '@store/slices/authSlice.js';
import { openModal } from '@store/slices/uiSlice.js';
import toast from 'react-hot-toast';
import './CarCard.css';

const CAT_LABELS = {
  economy: 'Economy', business: 'Business', luxury: 'Lüks',
  suv: 'SUV', sport: 'Sport',
};

const FUEL_LABELS = {
  petrol: 'Benzin', diesel: 'Dizel', hybrid: 'Hibrid', electric: 'Elektrik',
};

export default function CarCard({ car }) {
  const dispatch = useDispatch();
  const isAuth = useSelector(selectIsAuthenticated);
  const favoriteIds = useSelector(selectFavoriteIds);
  const isFav = favoriteIds.includes(car.id);

  // Ürək düyməsi kliki — kartın əsas linkinə getməsin deyə
  const handleFavClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuth) {
      toast.error('Favoritlərə əlavə etmək üçün daxil olun');
      dispatch(openModal({ name: 'login' }));
      return;
    }
    dispatch(toggleFavorite(car.id));
  };

  const avgRating = parseFloat(car.avg_rating) || 0;
  const reviewCount = parseInt(car.review_count) || 0;

  return (
    <Link to={`/cars/${car.id}`} className="car-card">
      <div className="car-img-wrap">
        <img
          className="car-img"
          src={car.image_url || '/placeholder-car.jpg'}
          alt={`${car.brand} ${car.model}`}
          loading="lazy"
        />
        <span className={`car-status-badge ${car.is_available ? 'avail' : 'rented'}`}>
          {car.is_available ? 'Boş' : 'İcarədə'}
        </span>
        <span className="car-cat-badge">{CAT_LABELS[car.category] || car.category}</span>

        <button
          type="button"
          className={`heart-btn ${isFav ? 'loved' : ''}`}
          onClick={handleFavClick}
          aria-label={isFav ? 'Favoritdən çıxar' : 'Favorit əlavə et'}
        >
          <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="car-body">
        <div className="car-name">{car.brand} {car.model}</div>
        <div className="car-year">{car.year}</div>

        <div className="car-specs">
          <span className="car-spec">
            <Settings size={12} /> {car.transmission === 'auto' ? 'Avtomat' : 'Mexaniki'}
          </span>
          <span className="car-spec">
            <Fuel size={12} /> {FUEL_LABELS[car.fuel] || car.fuel}
          </span>
          <span className="car-spec">
            <Users size={12} /> {car.seats}
          </span>
        </div>

        <div className="car-footer">
          <div className="car-price">
            ₼{car.price_per_day} <span>/ gün</span>
          </div>
          <div className="car-rating">
            <Star size={12} fill="currentColor" />
            {avgRating > 0 ? avgRating.toFixed(1) : '—'} ({reviewCount})
          </div>
        </div>
      </div>
    </Link>
  );
}
