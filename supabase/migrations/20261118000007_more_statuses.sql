-- New order and COD payment statuses. Kept in their own migration: Postgres
-- only lets a new enum value be used after the transaction that adds it.

alter type public.order_status add value if not exists 'Cancellation Requested' after 'Packed';
alter type public.order_status add value if not exists 'Failed Delivery' after 'Delivered';
alter type public.order_status add value if not exists 'Returned' after 'Failed Delivery';

alter type public.payment_status add value if not exists 'Reconciliation Required';
alter type public.payment_status add value if not exists 'Disputed';
alter type public.payment_status add value if not exists 'Adjusted';
