-- List active Telegram-enabled respondents and their latest scheduled Telegram delivery for Kyiv date.
-- Usage: run in psql with $1 = optional date (YYYY-MM-DD, Kyiv date).
-- If omitted, the query uses current UTC timestamp converted to Kyiv date.

WITH params AS (
  SELECT
    CASE
      WHEN $1 IS NOT NULL AND $1::text <> '' THEN $1::date
      ELSE (NOW() AT TIME ZONE 'Europe/Kyiv')::date
    END AS report_date
),
window AS (
  SELECT
    (date_trunc('day', report_date) AT TIME ZONE 'Europe/Kyiv') AS start_at,
    ((date_trunc('day', report_date) + INTERVAL '1 day') AT TIME ZONE 'Europe/Kyiv') AS end_at
  FROM params
),
active_respondents AS (
  SELECT
    r.id,
    r.legal_name,
    r.display_name,
    array_agg(c.telegram_chat_id ORDER BY c.telegram_chat_id) FILTER (WHERE c.telegram_chat_id IS NOT NULL) AS telegram_chat_ids
  FROM public.respondent r
  JOIN public.respondent_contact c
    ON c.respondent_id = r.id
   AND c.active = true
   AND c.telegram_chat_id IS NOT NULL
  WHERE r.active = true
    AND r.status = 'active'
    AND r.collection_mode IN ('self_service', 'telegram_request')
  GROUP BY r.id, r.legal_name, r.display_name
),
ranked_deliveries AS (
  SELECT
    d.*,
    ROW_NUMBER() OVER (PARTITION BY d.respondent_id ORDER BY d.sent_at DESC) AS rn
  FROM public.respondent_email_delivery d
  WHERE d.trigger LIKE 'telegram_scheduled_%'
    AND d.sent_at >= (SELECT start_at FROM window)
    AND d.sent_at < (SELECT end_at FROM window)
)
SELECT
  r.id AS respondent_id,
  r.legal_name,
  r.display_name,
  COALESCE(array_to_string(r.telegram_chat_ids, ', '), 'none') AS telegram_chat_ids,
  d.id AS delivery_id,
  d.sent_at AS latest_delivery_at,
  d.status AS latest_delivery_status,
  d.trigger AS latest_delivery_trigger,
  d.error AS latest_delivery_error,
  (d.id IS NULL OR d.status <> 'sent') AS failed_or_missing_latest
FROM active_respondents r
LEFT JOIN ranked_deliveries d
  ON d.respondent_id = r.id
 AND d.rn = 1
ORDER BY (d.id IS NULL OR d.status <> 'sent') DESC, r.legal_name ASC;
