-- Payment statuses for Easypaisa transfers. Kept in their own migration:
-- Postgres only lets a new enum value be used after the transaction that adds it.

alter type public.payment_status add value if not exists 'Pending Verification';
alter type public.payment_status add value if not exists 'Paid';
alter type public.payment_status add value if not exists 'Payment Rejected';
