"""
StyleTech Shop — Telegram Bot с функцией массовой рассылки.

Команды:
  /start       — Регистрация пользователя
  /help        — Справка
  /broadcast   — Массовая рассылка (только для ADMIN_ID)
  /stats       — Статистика пользователей (только для ADMIN_ID)
"""

import logging

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from config import BOT_TOKEN, ADMIN_ID
import db
from broadcaster import broadcast, BroadcastResult

# ─── Логирование ───────────────────────────────────────────────────────────

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


# ─── Хендлеры ──────────────────────────────────────────────────────────────


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка /start — сохраняем пользователя и приветствуем."""
    user = update.effective_user
    if not user:
        return

    # Сохраняем chat_id (upsert — без дубликатов)
    db.save_user(
        chat_id=user.id,
        first_name=user.first_name or "",
        username=user.username,
    )

    await update.message.reply_text(
        f"Привет, {user.first_name}! 👋\n\n"
        "Добро пожаловать в StyleTech Shop.\n"
        "Вы подписаны на наши уведомления и акции."
    )
    logger.info("User registered: %d (%s)", user.id, user.username)


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка /help."""
    text = (
        "🛍 <b>StyleTech Shop Bot</b>\n\n"
        "Этот бот отправляет уведомления о:\n"
        "• Новых товарах\n"
        "• Скидках и акциях\n"
        "• Статусе ваших заказов\n\n"
        "Команды:\n"
        "/start — Подписаться на уведомления\n"
        "/help — Эта справка"
    )
    await update.message.reply_text(text, parse_mode="HTML")


async def cmd_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /broadcast <текст> — Массовая рассылка.
    Доступна ТОЛЬКО администратору (ADMIN_ID).
    """
    user = update.effective_user
    if not user or user.id != ADMIN_ID:
        await update.message.reply_text("⛔ У вас нет доступа к этой команде.")
        return

    # Извлекаем текст после /broadcast
    if not context.args:
        await update.message.reply_text(
            "Использование:\n<code>/broadcast Текст сообщения</code>",
            parse_mode="HTML",
        )
        return

    message_text = " ".join(context.args)
    user_count = db.get_user_count()

    # Подтверждение начала рассылки
    status_msg = await update.message.reply_text(
        f"📤 Начинаю рассылку для <b>{user_count}</b> пользователей...",
        parse_mode="HTML",
    )

    # Выполняем рассылку
    result: BroadcastResult = await broadcast(context.bot, message_text, created_by=str(user.id))

    # Отчёт
    if result.queued:
        report = (
            f"📋 <b>Рассылка поставлена в очередь</b>\n\n"
            f"📊 Получателей: {result.total}\n"
            f"🆔 Job ID: <code>{result.job_id}</code>\n\n"
            f"Обработка начнётся автоматически."
        )
    else:
        report = (
            f"✅ <b>Рассылка завершена</b>\n\n"
            f"📊 Всего: {result.total}\n"
            f"✓ Доставлено: {result.success}\n"
            f"🚫 Заблокировали: {result.blocked}\n"
            f"⚠️ Ошибки: {result.errors}"
        )
    await status_msg.edit_text(report, parse_mode="HTML")
    logger.info(
        "Broadcast done: total=%d, success=%d, blocked=%d, errors=%d, queued=%s",
        result.total,
        result.success,
        result.blocked,
        result.errors,
        result.queued,
    )


async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /stats — Статистика бота.
    Доступна ТОЛЬКО администратору.
    """
    user = update.effective_user
    if not user or user.id != ADMIN_ID:
        await update.message.reply_text("⛔ У вас нет доступа к этой команде.")
        return

    count = db.get_user_count()
    await update.message.reply_text(
        f"📊 <b>Статистика</b>\n\nАктивных подписчиков: <b>{count}</b>",
        parse_mode="HTML",
    )


async def handle_any_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Любое сообщение — регистрируем пользователя (на случай, если пропустили /start)."""
    user = update.effective_user
    if not user:
        return
    db.save_user(
        chat_id=user.id,
        first_name=user.first_name or "",
        username=user.username,
    )


# ─── Запуск ────────────────────────────────────────────────────────────────


def main() -> None:
    """Запуск бота."""
    app = Application.builder().token(BOT_TOKEN).build()

    # Регистрация хендлеров
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("broadcast", cmd_broadcast))
    app.add_handler(CommandHandler("stats", cmd_stats))

    # Перехватываем любые сообщения для сохранения chat_id
    app.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, handle_any_message))

    logger.info("Bot started. ADMIN_ID=%d", ADMIN_ID)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
