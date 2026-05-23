/**
 * Register səhifəsi
 *
 * Validasiya qaydaları (Zod):
 *   • E-mail formatlı
 *   • Şifrə 8+ simvol, 1 böyük hərf, 1 rəqəm
 *   • Doğum tarixi — 18 yaş+
 *   • Telefon opsional, amma formatlı
 *   • Rol seçimi: customer / renter
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Phone, Calendar } from 'lucide-react';
import { registerUser, selectAuthError, selectAuthStatus, clearError, selectIsAuthenticated } from '@store/slices/authSlice.js';
import Input from '@components/ui/Input.jsx';
import Button from '@components/ui/Button.jsx';
import './Auth.css';

// 18+ yaş hesablaması
function calcAge(dob) {
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

const schema = z.object({
  name:  z.string().min(2, 'Ad ən azı 2 simvol').max(120),
  email: z.string().email('Düzgün e-mail daxil edin'),
  password: z.string()
    .min(8, 'Şifrə ən azı 8 simvol olmalıdır')
    .regex(/[A-Z]/, 'Ən azı 1 böyük hərf')
    .regex(/[0-9]/, 'Ən azı 1 rəqəm'),
  phone: z.string()
    .regex(/^\+?[0-9\s-]{7,20}$/, 'Düzgün telefon nömrəsi')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z.string()
    .refine((v) => v && calcAge(v) >= 18, '18 yaş və yuxarı olmalısınız'),
});

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const status = useSelector(selectAuthStatus);
  const error = useSelector(selectAuthError);
  const isAuth = useSelector(selectIsAuthenticated);

  // Rol seçimi state — formdan kənar saxlanır (sadəlik üçün)
  const [role, setRole] = useState('customer');

  useEffect(() => {
    if (isAuth) navigate('/', { replace: true });
  }, [isAuth, navigate]);

  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (error?.fields) {
      Object.entries(error.fields).forEach(([field, msg]) => {
        setError(field, { type: 'server', message: msg });
      });
    }
  }, [error, setError]);

  const onSubmit = (data) => {
    dispatch(clearError());
    dispatch(registerUser({ ...data, role }));
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hdr">
          <div className="auth-title">Qeydiyyat</div>
          <div className="auth-sub">Yeni hesab yaradın</div>
        </div>

        {/* Rol seçimi */}
        <div className="role-tabs">
          <button
            type="button"
            className={`role-tab ${role === 'customer' ? 'active' : ''}`}
            onClick={() => setRole('customer')}
          >
            Müştəri
          </button>
          <button
            type="button"
            className={`role-tab ${role === 'renter' ? 'active' : ''}`}
            onClick={() => setRole('renter')}
          >
            İcarəçi
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Ad Soyad"
            placeholder="Tam adınız"
            icon={<User size={16} />}
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="E-mail (Gmail)"
            type="email"
            placeholder="email@gmail.com"
            icon={<Mail size={16} />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Doğum tarixi (18+)"
            type="date"
            icon={<Calendar size={16} />}
            error={errors.dateOfBirth?.message}
            {...register('dateOfBirth')}
          />

          <Input
            label="Telefon"
            type="tel"
            placeholder="+994 50 000 00 00"
            icon={<Phone size={16} />}
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Şifrə"
            type="password"
            placeholder="Min. 8 simvol, 1 böyük hərf, 1 rəqəm"
            icon={<Lock size={16} />}
            error={errors.password?.message}
            {...register('password')}
          />

          {error && !error.fields && (
            <div className="auth-error">{error.message}</div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={status === 'loading'}
          >
            Qeydiyyatdan keç
          </Button>
        </form>

        <div className="auth-switch">
          Artıq hesabınız var? <Link to="/login">Daxil ol</Link>
        </div>
      </div>
    </div>
  );
}
