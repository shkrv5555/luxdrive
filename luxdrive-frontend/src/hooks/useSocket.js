/**
 * ════════════════════════════════════════════════════════════
 * useSocket Hook
 * ════════════════════════════════════════════════════════════
 *
 * Socket.io client-i avtomatik:
 *   • istifadəçi giriş edəndə qoşur
 *   • çıxış edəndə bağlayır
 *   • token yenilənəndə yenidən qoşur
 *
 * Redux ilə inteqrasiya: yeni event-lər avtomatik
 * notificationsSlice və chat-ə yönləndirilir.
 *
 * İstifadə:
 *   const socket = useSocket();
 *   socket.emit('chat:send', { receiverId, content }, ack => ...);
 */
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { tokenStorage } from '@api/client.js';
import { selectIsAuthenticated } from '@store/slices/authSlice.js';
import { addNotification, setUnreadCount } from '@store/slices/notificationsSlice.js';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socketInstance = null;

export function getSocket() {
  return socketInstance;
}

export function useSocket() {
  const dispatch = useDispatch();
  const isAuth = useSelector(selectIsAuthenticated);
  const socketRef = useRef(null);

  useEffect(() => {
    // Yalnız autentifikasiya olunmuş istifadəçilər üçün
    if (!isAuth) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        socketInstance = null;
      }
      return;
    }

    const token = tokenStorage.getAccess();
    if (!token) return;

    // Socket yarat
    const socket = io(SOCKET_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;
    socketInstance = socket;

    // ── EVENT HANDLER-LƏRİ ──────────────────────────────
    socket.on('connect', () => {
      console.log('🔌 Socket qoşuldu:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket ayrıldı:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket bağlantı xətası:', err.message);
      // Token problemləri vəziyyətində auth event-i göndər
      if (err.message === 'INVALID_TOKEN' || err.message === 'TOKEN_EXPIRED') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    });

    // ── Real-time bildirişlər ───────────────────────────
    socket.on('notification:new', (notif) => {
      dispatch(addNotification(notif));
      // Toast göstər (cari səhifədən asılı olmayaraq)
      toast.success(notif.title, {
        duration: 4000,
        icon: '🔔',
        style: {
          background: '#0E0E28',
          color: '#F0F0FF',
          border: '1px solid rgba(212,175,55,0.3)',
        },
      });
    });

    socket.on('notification:unreadCount', ({ count }) => {
      dispatch(setUnreadCount(count));
    });

    // ── Çat event-ləri (chat panel-ə forward) ───────────
    // Custom event-lər yayımlanır — komponentlər abunə olur
    socket.on('chat:message', (msg) => {
      window.dispatchEvent(new CustomEvent('chat:message', { detail: msg }));
    });

    socket.on('chat:typing', (data) => {
      window.dispatchEvent(new CustomEvent('chat:typing', { detail: data }));
    });

    socket.on('chat:read', (data) => {
      window.dispatchEvent(new CustomEvent('chat:read', { detail: data }));
    });

    // ── Online/Offline tracking ─────────────────────────
    socket.on('user:online', ({ userId }) => {
      window.dispatchEvent(new CustomEvent('user:online', { detail: { userId } }));
    });

    socket.on('user:offline', ({ userId }) => {
      window.dispatchEvent(new CustomEvent('user:offline', { detail: { userId } }));
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
      socketInstance = null;
    };
  }, [isAuth, dispatch]);

  return socketRef.current;
}
