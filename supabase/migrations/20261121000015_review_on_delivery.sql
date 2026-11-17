-- The "Order delivered" email now asks for a review, with a link to each
-- candle's review form ({{review_links}}). The separate review email a few
-- days later is switched off so customers are not asked twice. The owner can
-- switch it back on in Messages as a reminder.

update public.message_templates
  set body = replace(
        body,
        'Thank you for shopping with {{store_name}}.',
        E'How are your candles? A short review helps other customers choose, and it means a lot to us:\n\n{{review_links}}\n\nThank you for shopping with {{store_name}}.'
      ),
      name = 'Order delivered and review request',
      trigger = 'When you mark an order as delivered'
  where id = 'e-order-delivered' and body not like '%{{review_links}}%';

-- An edited email without the closing line still gets the review request
update public.message_templates
  set body = body || E'\n\nHow are your candles? A short review helps other customers choose:\n\n{{review_links}}'
  where id = 'e-order-delivered' and body not like '%{{review_links}}%';

-- Delivered emails go out even if an owner had switched them off: the review request lives there now
update public.message_templates set active = true where id = 'e-order-delivered';

update public.message_templates
  set active = false,
      name = 'Review reminder',
      trigger = 'Days after delivery (set in Settings), as a second reminder. Off by default.'
  where id = 'e-delivered';
