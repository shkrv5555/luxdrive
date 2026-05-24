# Frontend — Claude Code Sənədi

> Tam strukturu görmək üçün: `../CLAUDE.md`

## Stack
React 18 • Vite 5 • Redux Toolkit 2 • React Router 6 • Axios • Socket.io-client • React Hook Form + Zod • lucide-react • react-hot-toast

## Quick Start
```bash
npm install
npm run dev    # :5173, proxy → :5000 backend
```

## Path Aliases (`vite.config.js`)

```javascript
'@'           → src
'@api'        → src/api
'@components' → src/components
'@pages'      → src/pages
'@store'      → src/store
'@hooks'      → src/hooks
'@routes'     → src/routes
'@utils'      → src/utils
```

**HƏMİŞƏ alias istifadə et:**
```javascript
// ✅ Düzgün
import { authAPI } from '@api/endpoints.js';

// ❌ Yanlış
import { authAPI } from '../../api/endpoints.js';
```

## Redux Pattern

```javascript
// 1. Slice yarat: src/store/slices/xxxSlice.js
export const fetchXxx = createAsyncThunk('xxx/fetch', async (params, { rejectWithValue }) => {
  try { const { data } = await xxxAPI.list(params); return data; }
  catch (err) { return rejectWithValue(err); }
});

// 2. Store-da qeyd et: src/store/index.js
import xxxReducer from './slices/xxxSlice.js';

// 3. Komponentdə istifadə
const dispatch = useDispatch();
const data = useSelector(selectXxx);
dispatch(fetchXxx());
```

## Form Pattern (Zod + RHF)

```javascript
const schema = z.object({
  email: z.string().email('Düzgün e-mail'),
  password: z.string().min(8).regex(/[A-Z]/, '1 böyük hərf'),
});

const { register, handleSubmit, formState: { errors }, setError } = useForm({
  resolver: zodResolver(schema),
});

// Backend xətalarını forma yönləndir
useEffect(() => {
  if (error?.fields) {
    Object.entries(error.fields).forEach(([f, msg]) =>
      setError(f, { type: 'server', message: msg })
    );
  }
}, [error]);
```

## Socket Pattern

```javascript
import { getSocket } from '@hooks/useSocket.js';

// Event göndər
getSocket()?.emit('chat:send', { receiverId, content }, (ack) => {
  if (ack.error) toast.error(ack.message);
});

// Event qəbul et (window custom event)
useEffect(() => {
  const handler = (e) => setMessages(prev => [...prev, e.detail]);
  window.addEventListener('chat:message', handler);
  return () => window.removeEventListener('chat:message', handler);
}, []);
```

## Axios Interceptor (auto refresh)

`src/api/client.js`:
- 401 + `TOKEN_EXPIRED` → avtomatik `/api/auth/refresh` çağırır
- Yeni access token ilə orijinal sorğu təkrarlanır
- Eyni anda 5 sorğu fail olarsa, yalnız 1 refresh işə düşür (queue)
- Refresh də fail olarsa → `auth:expired` event → login-ə yönəlir

## ⚠️ KRİTİK QAYDALAR

### 1. CSS faylları MÜTLƏQ git-ə commit et
**Səbəb:** Vercel build "Invalid resolved ID" verir əgər import edilən `.css` fayl git-də yoxdursa.

```bash
git status              # untracked .css faylları yoxla
git add src/pages/*.css # əlavə et
```

### 2. Lazy load istifadə et
```javascript
const Home = lazy(() => import('@pages/Home.jsx'));
// Vite manualChunks ilə vendor ayrı (`react-vendor`, `redux-vendor`, `utils`)
```

### 3. Page Transition pattern
`src/routes/PageTransition.jsx` — **key-əsaslı** re-mount istifadə edir, **fadeOut-dan QAÇIN** (event sıxışdırılır → boş səhifə).

```jsx
<div key={location.pathname} className="page-fade-in">{children}</div>
```

### 4. ProtectedRoute roles
```jsx
<Route path="/admin/*" element={
  <ProtectedRoute roles={['admin']}>
    <AdminPanel />
  </ProtectedRoute>
} />
```

## Komponent Hiyerarxiyası

```
App.jsx
├── InitialLoader (splash — yalnız ilk session)
├── Navbar (admin səhifələrində gizli)
├── NotificationDropdown
├── MobileMenu
├── AppRouter (PageTransition daxil)
│   └── <Routes>
│       ├── public: Home, Cars, CarDetail, About, Contact
│       ├── auth: Login, Register, AdminLogin
│       ├── ProtectedRoute → Dashboard (customer + renter)
│       └── ProtectedRoute roles=['admin'] → AdminPanel
├── Footer + CookieBanner (admin/dashboard-da gizli)
├── ChatPanel (admin-də gizli)
└── Toaster (qlobal)
```

## CMS Pattern

`pages/About.jsx` və `pages/Contact.jsx` məzmunu **DB-dən** yüklənir:
```javascript
// Default mətnlər (admin redaktə etməyibsə fallback)
const DEFAULT_TEXTS = { badge: '...', ... };
const [texts, setTexts] = useState(DEFAULT_TEXTS);

useEffect(() => {
  pagesAPI.get('about').then(({ data }) => {
    if (data.page?.meta?.texts) setTexts({ ...DEFAULT_TEXTS, ...data.page.meta.texts });
  });
}, []);
```

Admin Settings (`AdminPanel.jsx` → `SettingsSection`) — site name, location, contact info-nu DB-də `slug='settings'` altında saxlayır.

## Stil sistemi

Bütün rənglər `src/styles/global.css`-də CSS variables:
- `var(--gold)`, `var(--purple)`, `var(--cyan)`
- `var(--bg-0)` … `var(--bg-3)` (qatlanmış fon)
- `var(--tx-1)` … `var(--tx-3)` (mətn ierarxiyası)
- `var(--font-disp)` Playfair, `var(--font-main)` Inter

**`background-color: black` ƏVƏZİNƏ** → `background: var(--bg-0)`.

## Build & Deploy

```bash
npm run build           # Lokal yoxla
# Çıxış: dist/ → Vercel oxuyur
# Vercel.json — SPA rewrites + cache + security headers
```

Vercel `Root Directory: luxdrive-frontend` təyin edilməlidir.

## Tez-tez rastlanan xətalar

| Xəta | Səbəb | Həll |
|---|---|---|
| `Invalid resolved ID` | CSS faylı git-də yoxdur | `git add src/.../*.css` |
| `Cannot find module '@xxx'` | vite.config.js-də alias yoxdur | Alias əlavə et |
| Boş səhifə (404 hissi) | PageTransition animation stuck | Key-əsaslı pattern istifadə et |
| WebSocket qoşulmur | VITE_SOCKET_URL yanlış / CORS | `.env.production`-i yoxla |
| `npm run build` fail | Untracked fayl, syntax error | `npm run build` lokalda test et əvvəlcə |
