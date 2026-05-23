/**
 * Login səhifəsi
 *
 * • react-hook-form + Zod validasiyası
 * • Backend xətalarını fields səviyyəsində göstərir
 * • Uğurlu giriş sonrası `state.from`-a yönəlir (yaxud /)
 */
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock } from 'lucide-react';
import { loginUser, selectAuthError, selectAuthStatus, clearError, selectIsAuthenticated } from '@store/slices/authSlice.js';
import Input from '@components/ui/Input.jsx';
import Button from '@components/ui/Button.jsx';
import './Auth.css';

// Validasiya sxemi
const schema = z.object({
  email:    z.string().email('Düzgün e-mail daxil edin'),
  password: z.string().min(1, 'Şifrə tələb olunur'),
});

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const status = useSelector(selectAuthStatus);
  const error = useSelector(selectAuthError);
  const isAuth = useSelector(selectIsAuthenticated);

  // Hard-coded yönləndirmə → əgər artıq daxil olunmuşsa, dashboard-a
  useEffect(() => {
    if (isAuth) {
      const from = location.state?.from || '/';
      navigate(from, { replace: true });
    }
  }, [isAuth, location.state, navigate]);

  // Form
  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: zodResolver(schema),
  });

  // Backend xətalarını forma yönləndir
  useEffect(() => {
    if (error?.fields) {
      Object.entries(error.fields).forEach(([field, msg]) => {
        setError(field, { type: 'server', message: msg });
      });
    }
  }, [error, setError]);

  // Giriş
  const onSubmit = (data) => {
    dispatch(clearError());
    dispatch(loginUser(data));
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hdr">
          <div className="auth-title">Xoş gəldiniz</div>
          <div className="auth-sub">Hesabınıza daxil olun</div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="E-mail"
            type="email"
            placeholder="email@gmail.com"
            icon={<Mail size={16} />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Şifrə"
            type="password"
            placeholder="Şifrəniz"
            icon={<Lock size={16} />}
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Ümumi server xətası (məs. INVALID_CREDENTIALS) */}
          {error && !error.fields && (
            <div className="auth-error">{error.message}</div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={status === 'loading'}
          >
            Daxil ol
          </Button>
        </form>

        <div className="auth-switch">
          Hesabınız yoxdur? <Link to="/register">Qeydiyyat</Link>
        </div>
      </div>
    </div>
  );
}
