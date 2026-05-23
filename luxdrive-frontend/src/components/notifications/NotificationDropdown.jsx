/**
 * NotificationDropdown — Zəng ikonu klik açılan dropdown
 *
 * Socket.io-dan gələn yeni bildirişlər redux store-da avtomatik
 * `addNotification` action ilə əlavə olunur — bu komponent
 * sadəcə oxuyur və render edir.
 */
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, X } from 'lucide-react';
import {
  selectNotifications, selectUnreadCount, selectPanelOpen,
  closePanel, markNotificationRead, markAllNotificationsRead,
} from '@store/slices/notificationsSlice.js';
import './NotificationDropdown.css';

// "Time ago" hesablama — server datasını lokallaşdır
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'İndi';
  if (diff < 3600)  return `${Math.floor(diff/60)} dəq əvvəl`;
  if (diff < 86400) return `${Math.floor(diff/3600)} saat əvvəl`;
  return `${Math.floor(diff/86400)} gün əvvəl`;
}

const TYPE_EMOJI = { booking: '📅', review: '⭐', promo: '🎁', info: 'ℹ️', success: '✅' };

export default function NotificationDropdown() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOpen = useSelector(selectPanelOpen);
  const items  = useSelector(selectNotifications);
  const unread = useSelector(selectUnreadCount);
  const ref = useRef(null);

  // Xaricə klik → bağla
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        dispatch(closePanel());
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, dispatch]);

  if (!isOpen) return null;

  const handleClick = (n) => {
    if (!n.is_read) dispatch(markNotificationRead(n.id));
    if (n.link) {
      dispatch(closePanel());
      navigate(n.link);
    }
  };

  return (
    <div ref={ref} className="notif-dropdown">
      <div className="notif-hdr">
        <div className="notif-hdr-title">
          <Bell size={16} style={{ color: 'var(--gold)' }} />
          Bildirişlər
          {unread > 0 && <span className="notif-count">{unread}</span>}
        </div>
        <div className="notif-hdr-actions">
          {unread > 0 && (
            <button
              className="notif-action"
              onClick={() => dispatch(markAllNotificationsRead())}
              title="Hamısını oxu"
            >
              <Check size={14} /> Hamısı
            </button>
          )}
          <button className="notif-action" onClick={() => dispatch(closePanel())}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="notif-list">
        {items.length === 0 ? (
          <div className="notif-empty">
            <Bell size={32} />
            <div>Bildiriş yoxdur</div>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.is_read ? '' : 'unread'}`}
              onClick={() => handleClick(n)}
            >
              <div className="notif-ico">{TYPE_EMOJI[n.type] || '🔔'}</div>
              <div className="notif-body">
                <div className="notif-title">{n.title}</div>
                {n.message && <div className="notif-msg">{n.message}</div>}
                <div className="notif-time">{timeAgo(n.created_at)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
