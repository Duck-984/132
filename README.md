# StyleTech Shop — Telegram Mini App

Современный мультикатегорийный интернет-магазин в формате Telegram Mini App для рынка Узбекистана.

## Quick Start

```bash
# 1. Клонируйте и установите зависимости
git clone <repo-url> && cd project
npm install

# 2. Настройте переменные окружения
cp .env.example .env   # заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY

# 3. Запустите dev-сервер
npm run dev
```

Откройте http://localhost:5173 в браузере или запустите через Telegram бота.

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Telegram WebApp                       │
│                  (tma.js/sdk-react)                      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   React Frontend                        │
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  Pages   │  │Components│  │  Store   │  │  Hooks  │  │
│  │ /pages/  │  │/components│ │ (Zustand)│  │ /hooks/ │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │
│       │             │             │             │        │
│       └──────┬──────┴─────────────┴─────────────┘        │
│              │                                           │
│       ┌──────▼──────┐                                   │
│       │    lib/      │  Supabase client, auth,          │
│       │  supabase/   │  queries, hooks, utils           │
│       └──────┬──────┘                                   │
└──────────────┼──────────────────────────────────────────┘
               │  HTTPS
┌──────────────▼──────────────────────────────────────────┐
│                   Supabase Backend                       │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ PostgreSQL  │  │ Edge Functions│  │    Storage     │  │
│  │  (RLS)     │  │ create-payment│  │ product-images │  │
│  │            │  │ payme-callback│  │                │  │
│  └────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Стек технологий

| Слой | Технологии |
|------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **State** | Zustand (клиент), TanStack Query (сервер) |
| **Routing** | React Router v7 |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |
| **Telegram** | @tma.js/sdk-react |
| **Icons** | Lucide React |
| **Deploy** | Vercel (frontend) + Supabase Cloud (backend) |

## Структура проекта

```
src/
├── components/           # UI: Layout, Header, BottomNav, ProductCard, BannerSlider, Toast
├── pages/
│   ├── admin/            # AdminDashboard, AdminProducts, AdminOrders, AdminUsers, AdminBanners, AdminDelivery
│   ├── Home.tsx          # Главная (выбор языка / лента пользователя)
│   ├── Catalog.tsx       # Каталог с поиском и фильтрами
│   ├── ProductDetail.tsx # Карточка товара (галерея, размеры, отзывы)
│   ├── Cart.tsx          # Корзина
│   ├── Checkout.tsx      # Оформление заказа (доставка, оплата)
│   ├── Orders.tsx        # История заказов
│   ├── Profile.tsx       # Профиль с реферальной программой
│   ├── Favorites.tsx     # Избранное
│   └── Register.tsx      # Регистрация нового пользователя
├── store/                # Zustand stores (useAppStore, useCartStore)
├── lib/
│   ├── supabase/         # Клиент, React Query хуки, SQL запросы
│   ├── auth.ts           # Аутентификация и роли
│   ├── telegram.ts       # Telegram WebApp API
│   ├── utils.ts          # Форматирование, хелперы
│   └── translations.ts   # Локализация (ru/uz)
├── hooks/                # useTranslation, useDebounce
└── index.css             # Design system: btn-brand, card-premium, input-premium
supabase/
├── functions/            # Edge Functions (create-payment, payme-callback, process-broadcast)
└── migrations/           # SQL миграции
```

## Возможности

- Мультикатегорийный каталог (одежда, аксессуары, техника)
- Двуязычность (Русский / O'zbekcha)
- Корзина с выбором размеров и цветов
- Оформление заказа с выбором города, типа доставки и оплаты
- Онлайн-оплата: Payme, Click, Uzum Bank, наличные
- История заказов с таймлайном статусов
- Профиль с реферальной системой
- Промо-баннеры
- Полная интеграция с Telegram WebApp (хаптик, кнопки, данные пользователя)
- Админ-панель с ролевым доступом (admin / manager / seller)

## Дизайн-система

CSS-компоненты в `src/index.css` для единообразия UI:

| Класс | Назначение |
|-------|-----------|
| `.btn-brand` | Primary кнопка (bg-surface-900, hover, active-scale) |
| `.btn-brand-outline` | Outline кнопка |
| `.card-premium` | Карточка (rounded-2xl, shadow-card) |
| `.input-premium` | Поле ввода (rounded-xl, focus:ring-accent) |
| `.badge-premium` | Бейдж |

## База данных

Таблицы Supabase: `categories`, `products`, `users`, `admin_accounts`, `orders`, `banners`, `delivery_zones`, `referrals`, `reviews`, `promotions`

Все таблицы защищены через Row Level Security (RLS).

## Админ-панель

Доступ: `/admin`

| Роль | Доступ |
|------|--------|
| **admin** | Сотрудники, Заказы, Товары, Баннеры, Доставка, Аналитика |
| **manager** | Заказы, Товары, Баннеры, Доставка, Аналитика |
| **seller** | Товары (частично) |

Аккаунты по умолчанию: `admin@shop.uz / Admin123`, `manager@shop.uz / Manager123`, `seller@shop.uz / Seller123`

## Команды

```bash
npm run dev          # Dev-сервер
npm run build        # Production сборка
npm run lint         # ESLint проверка
npm run typecheck    # TypeScript проверка
npm run preview      # Превью production сборки
```

## Деплой

1. Подключите репозиторий к Vercel
2. Добавьте переменные окружения: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Деплой автоматический при пуше в `main`

Подробнее в `DEPLOYMENT.md`.

## Лицензия

MIT
