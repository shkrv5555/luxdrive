/**
 * Input komponenti — react-hook-form ilə uyğun
 *
 * Props:
 *   label, type, placeholder, icon, error, ...register(name)
 */
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './Input.css';

const Input = forwardRef(function Input({
  label,
  type = 'text',
  placeholder,
  icon,
  error,
  hint,
  ...props
}, ref) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const actualType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="input-wrap">
        {icon && <span className="input-icon-left">{icon}</span>}
        <input
          ref={ref}
          type={actualType}
          placeholder={placeholder}
          className={`form-control ${error ? 'err' : ''} ${icon ? 'has-icon' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="input-icon-right"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <div className="form-err">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
});

export default Input;
