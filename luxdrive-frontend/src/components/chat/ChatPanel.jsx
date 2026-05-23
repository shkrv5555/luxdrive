/**
 * ChatPanel — Floating sağ alt küncdə chat widget
 *
 * Real-time Socket.io event-ləri:
 *   • chat:message  — gələn mesaj
 *   • chat:typing   — "yazır..." göstəricisi
 *   • chat:read     — mavi tik effekti
 *
 * `useSocket` hook custom window event-lərini dispatch edir,
 * burada onlara abunə oluruq.
 */
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MessageCircle, Send, X, ArrowLeft } from 'lucide-react';
import { getSocket } from '@hooks/useSocket.js';
import { chatAPI } from '@api/endpoints.js';
import { selectIsAuthenticated, selectUser } from '@store/slices/authSlice.js';
import { selectChatOpen, openChat, closeChat, selectActiveChatUser } from '@store/slices/uiSlice.js';
import './ChatPanel.css';

export default function ChatPanel() {
  const dispatch = useDispatch();
  const isAuth = useSelector(selectIsAuthenticated);
  const user   = useSelector(selectUser);
  const isOpen = useSelector(selectChatOpen);
  const activeChatUserId = useSelector(selectActiveChatUser);

  const [conversations, setConversations]   = useState([]);
  const [messages, setMessages]             = useState([]);
  const [otherUser, setOtherUser]           = useState(null);
  const [input, setInput]                   = useState('');
  const [otherTyping, setOtherTyping]       = useState(false);
  const [unreadTotal, setUnreadTotal]       = useState(0);

  const bodyRef = useRef(null);
  const typingTimeout = useRef(null);

  // ── İlk yüklənmə: söhbətlər siyahısı və ümumi unread sayı ──
  useEffect(() => {
    if (!isAuth) return;
    chatAPI.unreadCount()
      .then(({ data }) => setUnreadTotal(data.count))
      .catch(() => {});
  }, [isAuth]);

  useEffect(() => {
    if (isOpen && !activeChatUserId) {
      chatAPI.conversations()
        .then(({ data }) => setConversations(data.conversations))
        .catch(() => {});
    }
  }, [isOpen, activeChatUserId]);

  // ── Aktiv söhbət açıldıqda mesajları yüklə ──
  useEffect(() => {
    if (!activeChatUserId) {
      setMessages([]);
      setOtherUser(null);
      return;
    }
    chatAPI.messages(activeChatUserId, { limit: 50 })
      .then(({ data }) => setMessages(data.messages));

    // Söhbətdən qarşı tərəfin məlumatını çıxar
    const conv = conversations.find((c) => c.other_id === activeChatUserId);
    if (conv) {
      setOtherUser({
        id: conv.other_id, name: conv.other_name,
        avatar: conv.other_avatar, online: conv.other_online,
      });
    }

    // Socket-də mesajları oxundu et
    const socket = getSocket();
    socket?.emit('chat:read', { senderId: activeChatUserId });
  }, [activeChatUserId, conversations]);

  // ── Socket event-lərinə abunə ol ──
  useEffect(() => {
    const handleMessage = (e) => {
      const msg = e.detail;
      // Cari açıq söhbətə aiddir?
      const isCurrentChat = activeChatUserId &&
        (msg.senderId === activeChatUserId || msg.receiverId === activeChatUserId);
      if (isCurrentChat) {
        setMessages((prev) => [...prev, msg]);
        // Avtomatik oxundu et
        if (msg.senderId === activeChatUserId) {
          getSocket()?.emit('chat:read', { senderId: activeChatUserId });
        }
      } else if (msg.receiverId === user?.id) {
        // Başqa söhbətdən mesaj — unread sayını artır
        setUnreadTotal((n) => n + 1);
        // Söhbətlər siyahısını yenilə
        chatAPI.conversations().then(({ data }) => setConversations(data.conversations));
      }
    };

    const handleTyping = (e) => {
      const { senderId, isTyping } = e.detail;
      if (senderId === activeChatUserId) {
        setOtherTyping(isTyping);
      }
    };

    window.addEventListener('chat:message', handleMessage);
    window.addEventListener('chat:typing',  handleTyping);
    return () => {
      window.removeEventListener('chat:message', handleMessage);
      window.removeEventListener('chat:typing',  handleTyping);
    };
  }, [activeChatUserId, user]);

  // ── Aşağı scroll (yeni mesaj gəldikdə) ──
  useEffect(() => {
    bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight);
  }, [messages, otherTyping]);

  // ── Mesaj göndər ──
  const sendMessage = () => {
    const content = input.trim();
    if (!content || !activeChatUserId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('chat:send', { receiverId: activeChatUserId, content }, (ack) => {
      if (ack?.error) {
        console.error('Mesaj göndərilə bilmədi:', ack.message);
      }
      // Mesaj `chat:message` event-i ilə qayıdır → siyahıya əlavə olunur
    });
    setInput('');
  };

  // ── "Yazır..." event-ini göndər ──
  const handleTyping = () => {
    const socket = getSocket();
    if (!socket || !activeChatUserId) return;
    socket.emit('chat:typing', { receiverId: activeChatUserId, isTyping: true });
    // 3 san sonra "stop typing"
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('chat:typing', { receiverId: activeChatUserId, isTyping: false });
    }, 3000);
  };

  if (!isAuth) return null;

  return (
    <>
      {/* Floating FAB düyməsi */}
      {!isOpen && (
        <button className="chat-fab" onClick={() => dispatch(openChat())} aria-label="Çat">
          <MessageCircle size={22} />
          {unreadTotal > 0 && <span className="chat-fab-dot">{unreadTotal > 9 ? '9+' : unreadTotal}</span>}
        </button>
      )}

      {/* Çat paneli */}
      {isOpen && (
        <div className="chat-panel">
          <div className="chat-hdr">
            <div className="chat-hdr-info">
              {activeChatUserId && (
                <button className="chat-back" onClick={() => dispatch(openChat(null))}>
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className="chat-hdr-avatar">
                {otherUser?.avatar
                  ? <img src={otherUser.avatar} alt="" />
                  : otherUser?.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '💬'}
                {otherUser?.online && <span className="chat-online-dot" />}
              </div>
              <div>
                <div className="chat-hdr-name">
                  {otherUser?.name || 'Söhbətlər'}
                </div>
                <div className="chat-hdr-status">
                  {otherUser ? (otherUser.online ? 'Onlayn' : 'Oflayn') : `${conversations.length} söhbət`}
                </div>
              </div>
            </div>
            <button className="chat-close" onClick={() => dispatch(closeChat())}>
              <X size={18} />
            </button>
          </div>

          {/* Söhbətlər siyahısı */}
          {!activeChatUserId ? (
            <div className="chat-conv-list">
              {conversations.length === 0 ? (
                <div className="chat-empty">
                  <MessageCircle size={36} />
                  <div>Hələ söhbət yoxdur</div>
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.other_id}
                    className="chat-conv-item"
                    onClick={() => dispatch(openChat(c.other_id))}
                  >
                    <div className="chat-conv-avatar">
                      {c.other_avatar
                        ? <img src={c.other_avatar} alt="" />
                        : c.other_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                      {c.other_online && <span className="chat-online-dot" />}
                    </div>
                    <div className="chat-conv-body">
                      <div className="chat-conv-name">{c.other_name}</div>
                      <div className="chat-conv-preview">{c.content}</div>
                    </div>
                    {parseInt(c.unread_count) > 0 && (
                      <span className="chat-conv-badge">{c.unread_count}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Mesajlar */}
              <div className="chat-body" ref={bodyRef}>
                {messages.map((m) => (
                  <div key={m.id} className={`chat-msg ${m.sender_id === user?.id ? 'self' : 'other'}`}>
                    {m.content}
                    <div className="chat-msg-time">
                      {new Date(m.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                      {m.sender_id === user?.id && m.is_read && ' ✓✓'}
                    </div>
                  </div>
                ))}
                {otherTyping && (
                  <div className="chat-typing">
                    <span /><span /><span />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="chat-input">
                <input
                  type="text"
                  placeholder="Mesaj yazın..."
                  value={input}
                  onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button className="chat-send" onClick={sendMessage} disabled={!input.trim()}>
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
