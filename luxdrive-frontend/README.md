# LuxDrive Frontend

React (Vite) ilə qurulmuş luxury avtomobil icarəsi platformasının frontend hissəsi.

## Stack

- **React 18** + Vite (fast HMR + lazy loading)
- **Redux Toolkit** (auth, notifications, favorites, ui)
- **React Router v6** (qorunan route-lar, role-əsaslı)
- **Axios** + interceptor-lar (avtomatik token refresh)
- **Socket.io-client** + custom `useSocket` hook
- **React Hook Form** + **Zod** (forma validasiyası)
- **react-hot-toast** (toast bildirişləri)
- **lucide-react** (ikonlar)

## Quraşdırma

```bash
# 1. Asılılıqları yüklə
npm install

# 2. Backend-ə qoşulma URL-ni təyin et
cp .env.example .env
# Boş saxlasanız vite.config.js-də proxy istifadə olunur (localhost:5000)

# 3. Backend serverini ayrı pəncərədə işə salın
# cd ../luxdrive-backend && npm run dev

# 4. Frontend dev server
npm run dev
# Açıq: http://localhost:5173
```

## Layihə Strukturu

```
src/
├── api/
│   ├── client.js          Axios + interceptor-lar (token refresh)
│   └── endpoints.js       Bütün API çağırışları
├── store/
│   ├── index.js           Redux store
│   └── slices/
│       ├── authSlice.js
│       ├── notificationsSlice.js
│       ├── favoritesSlice.js
│       └── uiSlice.js
├── hooks/
│   └── useSocket.js       Socket.io + Redux inteqrasiyası
├── routes/
│   ├── AppRouter.jsx      Lazy-loaded routes
│   └── ProtectedRoute.jsx Role-based guard
├── components/
│   ├── layout/Navbar.jsx
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   └── Input.jsx
│   └── cars/CarCard.jsx
├── pages/
│   ├── Home.jsx
│   ├── Cars.jsx
│   ├── NotFound.jsx
│   └── auth/
│       ├── Login.jsx
│       ├── Register.jsx
│       └── AdminLogin.jsx
├── styles/global.css      CSS dəyişənləri + reset
├── App.jsx                Root komponent
└── main.jsx               Entry point
```

## Gizli Admin Girişi

Logoya **5 dəfə ardıcıl klik** (2 saniyə içində) → `/admin-login` səhifəsi.

## Build

```bash
npm run build           # dist/ qovluğunda production bundle
npm run preview         # Build-i lokal yoxla
```

Vite manualChunks ilə vendor (react, redux, axios) ayrı bundle-da — daha yaxşı caching.

## Faza 4b-də əlavə olunacaq

- `/cars/:id` Avtomobil detal səhifəsi (booking modal ilə)
- `/dashboard` Müştəri/İcarəçi panelləri
- `/admin/*` Admin panel (statistikalar, cədvəllər)
- Chat panel (Socket.io ilə canlı mesajlaşma)
- Notification dropdown
- Mobil hamburger menu
- Avatar yükləmə
