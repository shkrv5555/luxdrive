/**
 * AdminLogin — Gizli admin giriş səhifəsi
 *
 * Logoya 5x klikdən sonra navigate('/admin-login') ilə açılır.
 * URL birbaşa daxil olunsa da, ancaq admin role-lu istifadəçiləri qəbul edir.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Lock, Mail } from 'lucide-react';
import {
  adminLoginUser, selectAuthError, selectAuthStatus, clearError,
  selectIsAdmin
} from '@store/slices/authSlice.js';
import Input from '@components/ui/Input.jsx';
import Button from '@components/ui/Button.jsx';
import './Auth.css';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export default function AdminLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const status = useSelector(selectAuthStatus);
  const error = useSelector(selectAuthError);
  const isAdmin = useSelector(selectIsAdmin);

  useEffect(() => {
    if (isAdmin) navigate('/admin', { replace: true });
  }, [isAdmin, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => {
    dispatch(clearError());
    dispatch(adminLoginUser(data));
  };

  return (
    <div className="auth-page">
      <div className="auth-card admin-card">
        <div className="auth-hdr">
          <div className="auth-title">
            <ShieldCheck size={22} style={{ verticalAlign: 'middle', color: 'var(--gold)' }} />
            {' '}Admin Girişi
          </div>
          <div className="auth-sub">Bu panel yalnız sistem administratorları üçündür</div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Admin E-mail"
            type="email"
            placeholder="admin@luxdrive.az"
            icon={<Mail size={16} />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Şifrə"
            type="password"
            placeholder="Admin şifrəsi"
            icon={<Lock size={16} />}
            error={errors.password?.message}
            {...register('password')}
          />

          {error && (
            <div className="auth-error">{error.message}</div>
          )}

          <Button type="submit" variant="primary" fullWidth isLoading={status === 'loading'}>
            Admin Girişi
          </Button>
        </form>
      </div>
    </div>
  );
}
