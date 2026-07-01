# StyleTech Shop - Руководство по развертыванию

## Обзор

StyleTech Shop — современный Telegram Mini App для продаж одежды, аксессуаров и техники на рынке Узбекистана.

## Возможности

- Мультикатегорийный каталог с расширенными фильтрами и сортировкой
- Продвинутая карточка товара с галереей изображений, отзывами и шарингом
- Интеграция с Payme, Click и Uzum Bank для онлайн-платежей
- Реферальная система с бонусами
- Акции и промо-разделы (Новинки, Распродажа, Избранное)
- Система отзывов и рейтингов
- Админ-панель с полным CRUD товаров и управлением заказами
- Двухязычная поддержка (Русский / O'zbekcha)
- Полная интеграция с Telegram WebApp API
- Toast-уведомления и плавные анимации

## Стек технологий

- React 18 + TypeScript + Vite
- Tailwind CSS для стилизации
- Zustand для state management
- TanStack Query для data fetching
- React Router v6 для навигации
- Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- Telegram WebApp SDK

## Развертывание на Vercel

### 1. Подготовка Supabase

База данных и Edge Functions уже настроены. Убедитесь, что:

1. Все миграции применены (проверьте в Supabase Dashboard → Database → Migrations)
2. Edge Functions развернуты:
   - `create-payment` - создание платежей
   - `payme-callback` - webhook для Payme

3. Создайте публичный bucket `product-images` в Storage (если еще не создан):
   - Откройте Supabase Dashboard → Storage
   - Создайте новый bucket с именем `product-images`
   - Сделайте его публичным

4. Настройте секреты для Edge Functions в Supabase Dashboard:
   ```bash
   # Payme
   PAYME_MERCHANT_ID=your_merchant_id
   PAYME_BASE_URL=https://checkout.paycom.uz

   # Click
   CLICK_MERCHANT_ID=your_merchant_id
   CLICK_SERVICE_ID=your_service_id
   CLICK_SECRET_KEY=your_secret_key

   # Uzum Bank
   UZUM_MERCHANT_ID=your_merchant_id
   UZUM_API_KEY=your_api_key
   UZUM_BASE_URL=https://api.uzumbank.uz/merchant/v1
   ```

5. Создайте админ-пользователя в Supabase Auth:
   - Email: `admin@shop.uz`
   - Password: `Admin123` (измените после первого входа)

### 2. Развертывание на Vercel

1. Подключите репозиторий к Vercel:
   ```bash
   vercel
   ```

2. Настройте переменные окружения в Vercel Dashboard:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. Деплой произойдет автоматически при push в main

### 3. Настройка Telegram Mini App

1. Создайте бота через @BotFather
2. Получите токен бота
3. Настройте Web App URL через @BotFather:
   ```
   /newapp
   # Выберите вашего бота
   # Введите название приложения
   # Введите описание
   # Загрузите иконку
   # Введите URL: https://your-vercel-app.vercel.app
   ```

4. Добавьте кнопку Web App в бота:
   ```
   /setmenubutton
   # Выберите вашего бота
   # Введите текст кнопки: "Открыть магазин"
   # Введите URL: https://your-vercel-app.vercel.app
   ```

## Настройка платежных систем

### Payme

1. Зарегистрируйтесь на https://payme.uz/
2. Получите Merchant ID
3. Настройте webhook URL: `https://your-supabase-url.supabase.co/functions/v1/payme-callback`
4. Добавьте секреты в Supabase Edge Functions

### Click

1. Зарегистрируйтесь на https://click.uz/
2. Получите Merchant ID, Service ID и Secret Key
3. Настройте callback URL в Click Dashboard
4. Добавьте секреты в Supabase Edge Functions

### Uzum Bank

1. Зарегистрируйтесь как мерчант на https://uzumbank.uz/
2. Получите API ключи
3. Настройте webhook URL
4. Добавьте секреты в Supabase Edge Functions

## Тестирование

### Локальное тестирование

```bash
npm run dev
```

Приложение будет доступно на http://localhost:5173

### Тестирование в Telegram

1. Откройте вашего бота в Telegram
2. Нажмите на кнопку меню или используйте команду /start
3. Mini App откроется внутри Telegram

## Добавление тестовых данных

Используйте админ-панель для добавления товаров:

1. Откройте `/admin` в приложении
2. Войдите с credentials `admin@shop.uz / Admin123`
3. Перейдите в "Товары"
4. Добавьте новые товары с изображениями

Или используйте SQL для массового добавления через Supabase SQL Editor.

## Мониторинг и логи

### Supabase

- Database logs: Dashboard → Database → Logs
- Edge Functions logs: Dashboard → Edge Functions → Logs
- Storage usage: Dashboard → Storage → Usage

### Vercel

- Build logs: Vercel Dashboard → Deployments
- Function logs: Vercel Dashboard → Functions

## Обновления

### Обновление кода

```bash
git add .
git commit -m "Update: описание изменений"
git push origin main
```

Vercel автоматически задеплоит новую версию.

### Обновление базы данных

Создайте новую миграцию в `supabase/migrations/` и примените через Supabase Dashboard.

## Поддержка

Для вопросов и поддержки:
- Telegram: @your_support_username
- Email: support@yourshop.uz

## Безопасность

- Все платежные данные обрабатываются через защищенные Edge Functions
- RLS (Row Level Security) включен для всех таблиц
- API ключи хранятся только в Supabase Secrets
- HTTPS для всех соединений

## Производительность

- Lazy loading изображений
- Code splitting
- Optimistic UI updates
- Realtime subscriptions для заказов
- CDN для статических ресурсов (Vercel)

## Checklist запуска

- [ ] Supabase проект создан
- [ ] Все миграции применены
- [ ] Storage bucket создан и настроен
- [ ] Edge Functions развернуты
- [ ] Секреты платежных систем настроены
- [ ] Админ-пользователь создан
- [ ] Тестовые товары добавлены
- [ ] Vercel проект создан
- [ ] Переменные окружения настроены
- [ ] Telegram бот создан
- [ ] Web App URL настроен
- [ ] Платежные системы протестированы
- [ ] Мобильный UI протестирован в Telegram

Готово к запуску!
