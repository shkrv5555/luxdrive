/**
 * Button komponenti — bütün variantlar, ölçülər, və loading state
 *
 * Props:
 *   variant: 'primary' | 'secondary' | 'purple' | 'danger' | 'ghost'
 *   size:    'sm' | 'md' | 'lg'
 *   isLoading: boolean
 *   icon:    ReactNode (sol tərəfdə)
 *   fullWidth: boolean
 */
import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon = null,
  fullWidth = false,
  disabled = false,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-full',
    isLoading && 'btn-loading',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <span className="loader" />
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
