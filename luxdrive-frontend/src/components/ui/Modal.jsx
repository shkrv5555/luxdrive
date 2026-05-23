/**
 * Modal komponenti — Redux ilə inteqrasiyalı
 *
 * Hər səhifədən openModal({name: 'login'}) ilə açıla bilər.
 * Escape, backdrop klik və ya X düyməsi ilə bağlanır.
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { closeModal, selectActiveModal } from '@store/slices/uiSlice.js';
import './Modal.css';

export default function Modal({ name, title, subtitle, children, footer, size = 'md' }) {
  const dispatch = useDispatch();
  const activeModal = useSelector(selectActiveModal);
  const isOpen = activeModal === name;

  // Escape ilə bağlama
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') dispatch(closeModal()); };
    window.addEventListener('keydown', handler);
    // Body scroll kilidlə
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, dispatch]);

  if (!isOpen) return null;

  // Backdrop kliki — yalnız overlay-ə düşmüş kliki tutur
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) dispatch(closeModal());
  };

  return (
    <div className="modal-overlay open" onClick={handleBackdrop}>
      <div className={`modal modal-${size}`}>
        <div className="modal-hdr">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
          </div>
          <button className="modal-close" onClick={() => dispatch(closeModal())} aria-label="Bağla">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-ftr">{footer}</div>}
      </div>
    </div>
  );
}
