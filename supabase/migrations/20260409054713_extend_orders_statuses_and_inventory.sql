/*
  # Extend Orders and Inventory Management

  ## Changes Summary

  ### 1. Orders table - extended statuses and status history
  - Changes the `status` column constraint to support 9 new statuses:
    new → processing → assembling → assembled → shipping → delivered → cancelled → return_requested → returned
  - Adds `status_history` JSONB column to track all status changes with timestamps and admin info
  
  ### 2. Products table - no schema change needed (stock column already exists)
  
  ## New order statuses (9 total):
  1. new            - Новый / Yangi
  2. processing     - В обработке / Ko'rib chiqilmoqda
  3. assembling     - В сборке / Yig'ilmoqda
  4. assembled      - Собран / Yig'ildi
  5. shipping       - В доставке / Yetkazilmoqda
  6. delivered      - Доставлен / Yetkazildi
  7. cancelled      - Отменён / Bekor qilindi
  8. return_requested - Возврат / Qaytarish
  9. returned       - Возвращён / Qaytarildi

  ## status_history JSON structure:
  Array of: { status: string, changed_at: string, changed_by: string, note?: string }
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'status_history'
  ) THEN
    ALTER TABLE orders ADD COLUMN status_history jsonb DEFAULT '[]'::jsonb NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
