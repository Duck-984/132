"""
Модуль массовой рассылки.

Два режима:
  1. Прямая отправка (< 100 пользователей) — мгновенно из бота
  2. Очередь (>= 100 пользователей) — создаёт job в broadcast_jobs,
     обработку выполняет edge function process-broadcast

Защита от бана Telegram:
  - Не более 25 сообщений/сек (лимит 30)
  - Обработка RetryAfter
  - Пометка заблокировавших бот
"""

import asyncio
import logging
from dataclasses import dataclass

from telegram import Bot
from telegram.error import Forbidden, BadRequest, RetryAfter, TimedOut

import db
from config import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client

logger = logging.getLogger(__name__)

MESSAGES_PER_SECOND = 25
DELAY = 1.0 / MESSAGES_PER_SECOND
QUEUE_THRESHOLD = 100


@dataclass
class BroadcastResult:
    """Результат рассылки."""
    total: int = 0
    success: int = 0
    blocked: int = 0
    errors: int = 0
    queued: bool = False
    job_id: str | None = None


async def broadcast(bot: Bot, text: str, created_by: str = "admin") -> BroadcastResult:
    """
    Отправить сообщение всем пользователям бота.

    Если пользователей >= QUEUE_THRESHOLD, создаёт задачу в очереди.
    Иначе — отправляет напрямую.
    """
    chat_ids = db.get_all_chat_ids()
    result = BroadcastResult(total=len(chat_ids))

    if len(chat_ids) >= QUEUE_THRESHOLD:
        return await _enqueue_broadcast(text, created_by, len(chat_ids))

    # Прямая отправка для малых аудиторий
    for chat_id in chat_ids:
        try:
            await bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML")
            result.success += 1

        except Forbidden:
            db.mark_blocked(chat_id)
            result.blocked += 1
            logger.info("User %d blocked the bot.", chat_id)

        except BadRequest as e:
            if "chat not found" in str(e).lower():
                db.mark_blocked(chat_id)
                result.blocked += 1
            else:
                result.errors += 1
                logger.warning("BadRequest for %d: %s", chat_id, e)

        except RetryAfter as e:
            logger.warning("Rate limited. Sleeping %s sec.", e.retry_after)
            await asyncio.sleep(e.retry_after)
            try:
                await bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML")
                result.success += 1
            except Exception:
                result.errors += 1

        except TimedOut:
            result.errors += 1
            logger.warning("Timeout for %d", chat_id)

        except Exception as e:
            result.errors += 1
            logger.error("Unexpected error for %d: %s", chat_id, e)

        await asyncio.sleep(DELAY)

    # Запись в audit_log
    _log_audit(created_by, result)
    return result


async def _enqueue_broadcast(text: str, created_by: str, total: int) -> BroadcastResult:
    """Создать задачу в очереди broadcast_jobs."""
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    response = client.table("broadcast_jobs").insert({
        "message": text,
        "parse_mode": "HTML",
        "status": "pending",
        "total_recipients": total,
        "created_by": created_by,
    }).execute()

    job_id = response.data[0]["id"] if response.data else None

    logger.info("Broadcast queued: job_id=%s, recipients=%d", job_id, total)

    return BroadcastResult(
        total=total,
        queued=True,
        job_id=job_id,
    )


def _log_audit(admin_id: str, result: BroadcastResult) -> None:
    """Записать результат рассылки в audit_log."""
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        client.table("audit_log").insert({
            "admin_id": admin_id,
            "action": "broadcast",
            "entity_type": "broadcast_jobs",
            "details": {
                "total": result.total,
                "sent": result.success,
                "failed": result.errors,
                "blocked": result.blocked,
            },
        }).execute()
    except Exception as e:
        logger.error("Failed to write audit log: %s", e)
