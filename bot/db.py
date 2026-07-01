"""
Модуль работы с базой данных (Supabase).
Таблица bot_users хранит chat_id всех пользователей, написавших боту.
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def save_user(chat_id: int, first_name: str, username: str | None = None) -> None:
    """Сохранить пользователя (upsert — без дубликатов)."""
    _client.table("bot_users").upsert(
        {
            "chat_id": chat_id,
            "first_name": first_name,
            "username": username,
            "is_blocked": False,
        },
        on_conflict="chat_id",
    ).execute()


def get_all_chat_ids() -> list[int]:
    """Получить все chat_id активных (не заблокировавших бот) пользователей."""
    response = (
        _client.table("bot_users")
        .select("chat_id")
        .eq("is_blocked", False)
        .execute()
    )
    return [row["chat_id"] for row in response.data]


def mark_blocked(chat_id: int) -> None:
    """Пометить пользователя как заблокировавшего бот."""
    _client.table("bot_users").update({"is_blocked": True}).eq(
        "chat_id", chat_id
    ).execute()


def get_user_count() -> int:
    """Общее количество активных пользователей."""
    response = (
        _client.table("bot_users")
        .select("chat_id", count="exact")
        .eq("is_blocked", False)
        .execute()
    )
    return response.count or 0
