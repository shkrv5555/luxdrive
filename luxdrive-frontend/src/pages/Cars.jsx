/**
 * Cars list səhifəsi
 *
 * Backend pagination ilə işləyir — bütün filtrlər URL-də saxlanılır
 * ki, istifadəçi linki paylaşa bilsin.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Filter } from 'lucide-react';
import { carsAPI } from '@api/endpoints.js';
import CarCard from '@components/cars/CarCard.jsx';
import './Cars.css';

const CATEGORIES = [
  { value: '',         label: 'Hamısı' },
  { value: 'economy',  label: 'Economy' },
  { value: 'business', label: 'Business' },
  { value: 'luxury',   label: 'Lüks' },
  { value: 'suv',      label: 'SUV' },
  { value: 'sport',    label: 'Sport' },
];

export default function Cars() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // URL-dən filtrləri oxu
  const filters = {
    search:       searchParams.get('search') || '',
    category:     searchParams.get('category') || '',
    transmission: searchParams.get('transmission') || '',
    status:       searchParams.get('status') || '',
    priceMin:     searchParams.get('priceMin') || '',
    priceMax:     searchParams.get('priceMax') || '',
    sortBy:       searchParams.get('sortBy') || 'newest',
    page:         parseInt(searchParams.get('page')) || 1,
  };

  // Filtrlər dəyişəndə API çağır
  useEffect(() => {
    const fetchCars = async () => {
      setIsLoading(true);
      try {
        const params = Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        );
        params.limit = 12;
        const { data } = await carsAPI.list(params);
        setCars(data.items);
        setPagination(data.pagination);
      } catch (err) {
        console.error('Cars yüklənə bilmədi:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCars();
  }, [searchParams]);

  // Filtrləri URL-ə yaz (geri düyməsi işləsin)
  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else       next.delete(key);
    // Page-i sıfırla
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: false });
  };

  const resetFilters = () => setSearchParams({});

  return (
    <div className="cars-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title gradient-text">Bütün Avtomobillər</h1>
          <p className="page-sub">{pagination.total} avtomobil tapıldı</p>
        </div>

        {/* ── FİLTR PANELİ ─────────────────────────────── */}
        <div className="filter-bar">
          <div className="filter-row">
            <div className="filter-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Marka, model axtar..."
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
              />
            </div>

            <select
              value={filters.category}
              onChange={(e) => setFilter('category', e.target.value)}
              className="filter-select"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilter('sortBy', e.target.value)}
              className="filter-select"
            >
              <option value="newest">Ən yeni</option>
              <option value="price_asc">Qiymət ↑</option>
              <option value="price_desc">Qiymət ↓</option>
              <option value="rating">Reytinq</option>
            </select>

            <div className="filter-price">
              <input
                type="number"
                placeholder="Min ₼"
                value={filters.priceMin}
                onChange={(e) => setFilter('priceMin', e.target.value)}
              />
              <span>—</span>
              <input
                type="number"
                placeholder="Max ₼"
                value={filters.priceMax}
                onChange={(e) => setFilter('priceMax', e.target.value)}
              />
            </div>

            <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
              <X size={16} /> Sıfırla
            </button>
          </div>

          {/* Status çipləri */}
          <div className="filter-chips">
            {[
              { value: '',         label: 'Hamısı' },
              { value: 'available', label: 'Boş' },
              { value: 'rented',    label: 'İcarədə' },
            ].map((c) => (
              <button
                key={c.value}
                className={`chip ${filters.status === c.value ? 'active' : ''}`}
                onClick={() => setFilter('status', c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── NƏTİCƏLƏR ────────────────────────────────── */}
        {isLoading ? (
          <div className="cars-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 360 }} />
            ))}
          </div>
        ) : cars.length === 0 ? (
          <div className="empty-state">
            <Filter size={48} />
            <h3>Avtomobil tapılmadı</h3>
            <p>Filtrləri dəyişin və ya sıfırlayın.</p>
            <button className="btn btn-secondary" onClick={resetFilters}>
              Sıfırla
            </button>
          </div>
        ) : (
          <>
            <div className="cars-grid">
              {cars.map((car) => <CarCard key={car.id} car={car} />)}
            </div>

            {/* ── PAGINATION ─────────────────────────── */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={!pagination.hasPrev}
                  onClick={() => setFilter('page', pagination.page - 1)}
                >
                  ← Əvvəlki
                </button>
                <span className="page-info">
                  Səhifə <strong>{pagination.page}</strong> / {pagination.totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={!pagination.hasNext}
                  onClick={() => setFilter('page', pagination.page + 1)}
                >
                  Növbəti →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
