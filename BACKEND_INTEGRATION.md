# Backend Integration Guide

Этот документ описывает, что нужно реализовать на backend для полноценной работы приложения.

## 🔌 API Endpoints

### 1. Проверка подписок на каналы

**Endpoint:** `POST /api/check-subscription`

**Request:**
```json
{
  "userId": 123456789,
  "channelId": 1,
  "channelUsername": "@technews"
}
```

**Response:**
```json
{
  "isSubscribed": true,
  "subscribedAt": "2024-01-15T10:00:00Z"
}
```

**Реализация:**
Используйте Telegram Bot API метод `getChatMember`:
```python
from telegram import Bot

async def check_subscription(user_id: int, channel_username: str):
    bot = Bot(token=YOUR_BOT_TOKEN)
    try:
        member = await bot.get_chat_member(
            chat_id=channel_username,
            user_id=user_id
        )
        return member.status in ['member', 'administrator', 'creator']
    except:
        return False
```

### 2. Обработка платежей Telegram Stars

**Endpoint:** `POST /api/process-payment`

**Request:**
```json
{
  "userId": 123456789,
  "amount": 15,
  "type": "gift_purchase",
  "giftId": 1
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "txn_123456"
}
```

**Реализация:**
Используйте Telegram Bot API для работы со звёздами:
- `answerPreCheckoutQuery` - для подтверждения платежа
- `answerShippingQuery` - для обработки доставки

### 3. Создание заказа на пиар

**Endpoint:** `POST /api/create-promo-order`

**Request:**
```json
{
  "userId": 123456789,
  "channelLink": "https://t.me/mychannel",
  "subscribersCount": 50,
  "cost": 225
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order_123456",
  "status": "pending"
}
```

### 4. Получение статистики пользователя

**Endpoint:** `GET /api/user-stats?userId=123456789`

**Response:**
```json
{
  "stars": 150,
  "completedTasks": [1, 2, 3, 4, 5, 6],
  "receivedGifts": [1, 2],
  "activeSubscriptions": 6,
  "pendingSubscriptions": 0
}
```

## 📋 Периодические задачи

### Проверка подписок

Создайте cron job или scheduled task, который:
1. Находит все подписки со статусом `pending` и `checkUntil <= now`
2. Проверяет каждую подписку через Telegram Bot API
3. Обновляет статус в базе данных
4. Если подписка активна - добавляет задание в `completedTasks`
5. Если отписка - помечает как `failed` и удаляет из `completedTasks`

**Пример (Python + Celery):**
```python
from celery import Celery
from datetime import datetime, timedelta

app = Celery('subbs')

@app.task
def check_pending_subscriptions():
    pending_subs = Subscription.objects.filter(
        status='pending',
        check_until__lte=datetime.now()
    )
    
    for sub in pending_subs:
        is_subscribed = await check_subscription(
            sub.user_id, 
            sub.channel_username
        )
        
        if is_subscribed:
            sub.status = 'active'
            sub.verified_at = datetime.now()
            # Add to completed tasks
            UserTask.objects.get_or_create(
                user_id=sub.user_id,
                channel_id=sub.channel_id,
                defaults={'completed': True}
            )
        else:
            sub.status = 'failed'
            sub.failed_at = datetime.now()
            # Remove from completed tasks
            UserTask.objects.filter(
                user_id=sub.user_id,
                channel_id=sub.channel_id
            ).delete()
        
        sub.save()
```

### Повторная проверка активных подписок

Проверяйте активные подписки каждые 7 дней:
```python
@app.task
def recheck_active_subscriptions():
    active_subs = Subscription.objects.filter(
        status='active',
        verified_at__lte=datetime.now() - timedelta(days=7)
    )
    
    for sub in active_subs:
        is_still_subscribed = await check_subscription(
            sub.user_id,
            sub.channel_username
        )
        
        if not is_still_subscribed:
            sub.status = 'failed'
            sub.failed_at = datetime.now()
            # Remove from completed tasks
            UserTask.objects.filter(
                user_id=sub.user_id,
                channel_id=sub.channel_id
            ).delete()
            sub.save()
```

## 🗄️ Структура базы данных

### Таблица `users`
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    stars INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Таблица `subscriptions`
```sql
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    channel_id INT NOT NULL,
    channel_username VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, failed
    subscribed_at TIMESTAMP NOT NULL,
    check_until TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    failed_at TIMESTAMP,
    last_check TIMESTAMP
);
```

### Таблица `completed_tasks`
```sql
CREATE TABLE completed_tasks (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    channel_id INT NOT NULL,
    completed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);
```

### Таблица `received_gifts`
```sql
CREATE TABLE received_gifts (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    gift_id INT NOT NULL,
    received_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, gift_id)
);
```

### Таблица `promo_orders`
```sql
CREATE TABLE promo_orders (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    channel_link VARCHAR(500) NOT NULL,
    subscribers_count INT NOT NULL,
    cost INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, cancelled
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

## 🔐 Безопасность

1. **Валидация данных:** Всегда проверяйте входящие данные на backend
2. **Rate limiting:** Ограничьте частоту запросов от одного пользователя
3. **Telegram WebApp Data:** Проверяйте подпись `initData` от Telegram
4. **Хранение токенов:** Никогда не храните токены бота в frontend коде

## 📱 Webhook для Telegram Bot

Настройте webhook для получения обновлений:
```python
from telegram import Update
from telegram.ext import Application, CommandHandler

async def webhook_handler(update: Update, context):
    # Handle subscription events, payments, etc.
    pass

app = Application.builder().token(BOT_TOKEN).build()
app.add_handler(CommandHandler("start", webhook_handler))
app.run_webhook(listen="0.0.0.0", port=8443, url_path="webhook")
```

## 🚀 Деплой

Рекомендуемый стек:
- **Backend:** Node.js (Express) или Python (FastAPI/Django)
- **Database:** PostgreSQL или MongoDB
- **Task Queue:** Celery (Python) или Bull (Node.js)
- **Hosting:** Heroku, Railway, или VPS

## 📝 Примечания

- Все проверки подписок должны выполняться на backend через Telegram Bot API
- Frontend только отображает данные и отправляет запросы
- Все критические операции (проверка подписок, платежи) должны быть на backend
- Используйте WebSocket или polling для обновления статусов в реальном времени
