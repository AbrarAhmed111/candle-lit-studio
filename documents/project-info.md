# MASTER PROMPT: Complete E-Commerce Platform — Software Requirements Specification (SRS) & Product Requirements Document (PRD)

## Your Role

Act as a Senior Product Manager, Principal Business Analyst, Software Architect, UX/UI Design Strategist and Technical Documentation Specialist.

Your task is to create a comprehensive, professional, implementation-ready Software Requirements Specification (SRS) and Product Requirements Document (PRD) for a complete e-commerce platform for a Pakistani small business specializing in selling candles.

The documentation must be detailed enough to serve as the primary reference for:
- Product planning.
- UI/UX design.
- Frontend development.
- Backend development.
- Database architecture.
- API development.
- Business logic implementation.
- Third-party integrations.
- Quality assurance.
- Deployment.
- Maintenance.

Do not produce a generic e-commerce feature checklist. Think through the actual business operations, customer journeys, administrative workflows, edge cases, dependencies and system behaviour.

The final document must represent a complete, professionally engineered e-commerce product.

**IMPORTANT: This is a complete product specification. Do not divide features into MVP, Phase 1, Phase 2, Phase 3 or future implementation releases. Do not exclude functionality to simplify the initial development scope. All requested functionality belongs to the project scope.**

---

# 1. PROJECT BACKGROUND

The project is being developed under **Uraan by DevAbby**, an initiative that helps deserving small businesses establish their digital presence.

The business owner sells candles and wants a professional online store where customers can discover products, place orders and receive order updates.

The owner also needs a comprehensive administrative dashboard to independently manage the entire business's online operations.

The system must consist of two interconnected applications:

1. **Customer-facing e-commerce storefront:** The public website where customers browse products, place orders, track order information and interact with the brand.
2. **Administrative dashboard:** A secure business management interface where the owner manages products, inventory, orders, customers, promotions, discounts, notifications, email campaigns, analytics and store settings.

This is not merely a website or product catalogue. It is a complete e-commerce and business management platform.

## Core Business Conditions

- Business operates in Pakistan.
- Default currency is Pakistani Rupee (PKR).
- Initial payment method is Cash on Delivery (COD).
- Customers primarily access the website through mobile devices.
- The business owner independently manages products, orders and promotions.
- The owner may use different courier companies depending on business needs.
- Courier booking and shipment tracking are initially handled externally.
- The website must provide automated email and WhatsApp notifications where configured.
- The platform must have a sophisticated, premium and visually memorable design.
- AI features are explicitly excluded.

---

# 2. PROJECT OBJECTIVES

The platform must achieve the following objectives:

1. Establish a professional online presence for the candle brand.
2. Allow customers to browse and purchase candles easily.
3. Provide a smooth, trustworthy COD checkout experience.
4. Automate order confirmations and customer communication.
5. Centralize order management.
6. Simplify product and inventory management.
7. Provide flexible discount and promotional campaign management.
8. Automate customer emails and WhatsApp notifications.
9. Allow the owner to understand business performance through analytics.
10. Reduce repetitive manual administrative work.
11. Improve customer retention through reviews, newsletters and promotional campaigns.
12. Allow the business owner to operate the entire platform without technical assistance.
13. Maintain an architecture that can eventually be reused for other small-business e-commerce projects.

---

# 3. USER ROLES AND ACCESS CONTROL

Define the complete permission system.

## 3.1 Store Administrator

Full access to:
- Dashboard.
- Products.
- Categories.
- Product variants.
- Inventory.
- Orders.
- Customers.
- Discounts.
- Coupons.
- Promotional campaigns.
- Reviews.
- Email templates.
- Email campaigns.
- WhatsApp notifications.
- Newsletter subscribers.
- Analytics.
- Reports.
- Shipping configuration.
- Courier configuration.
- Store settings.
- User management.
- Activity logs.

## 3.2 Store Manager

Provide an optional secondary role with configurable permissions.

The administrator should be able to grant or restrict access to individual modules.

## 3.3 Customer

Customers can:
- Browse products.
- Search and filter products.
- Add products to cart.
- Save products to wishlist.
- Place guest orders.
- Register an account.
- View their own orders.
- Access shipment information.
- Submit eligible reviews.
- Manage profile information.
- Manage addresses.
- Subscribe or unsubscribe from marketing communications.

Define authentication, authorization and access restrictions for every role.

---

# 4. CUSTOMER-FACING E-COMMERCE STOREFRONT

The storefront is a major part of the product and must receive exceptional design attention.

## 4.1 Homepage

Include:

- Brand logo.
- Main navigation.
- Announcement bar.
- Hero section.
- Promotional banners.
- Featured collections.
- New arrivals.
- Best-selling products.
- Popular candles.
- Product categories.
- Seasonal collections.
- Special offers.
- Active promotional campaigns.
- Brand introduction.
- Brand story.
- Why choose our candles section.
- Customer testimonials.
- Customer reviews.
- Newsletter subscription.
- Instagram/social media integration or links.
- WhatsApp contact button.
- Contact information.
- Footer with useful navigation and policy links.

The administrator must be able to manage homepage content, banners, promotional messages and featured products without changing application code.

## 4.2 Navigation and Categories

Support:
- Main navigation.
- Dropdown navigation.
- Product categories.
- Subcategories.
- Collection pages.
- Featured categories.
- Breadcrumb navigation.

Category examples may include:
- Scented Candles.
- Decorative Candles.
- Jar Candles.
- Floral Fragrances.
- Gift Sets.
- Seasonal Collections.

Categories must be manageable through the admin dashboard.

## 4.3 Product Catalogue

Customers must be able to:

- View all available products.
- Browse categories.
- Search by product name.
- Search by fragrance.
- Filter by price.
- Filter by category.
- Filter by availability.
- Filter by fragrance.
- Sort by newest.
- Sort by price.
- Sort by popularity.
- Sort by best sellers.
- View featured products.
- View discounted products.
- Navigate through pagination or efficient product loading.

Product cards must display:
- Product image.
- Product name.
- Fragrance information where relevant.
- Original price.
- Discounted price.
- Discount percentage.
- Stock availability.
- Wishlist option.
- Quick add-to-cart functionality.

## 4.4 Product Details

Each product must support:

### Basic Information
- Product name.
- SKU.
- Short description.
- Full description.
- Product category.
- Tags.
- Product images.
- Multiple product images.
- Image gallery.

### Candle Attributes
- Fragrance.
- Fragrance family.
- Top, middle and base scent notes where applicable.
- Candle weight.
- Candle dimensions.
- Size.
- Colour.
- Wax type.
- Burn duration.
- Ingredients or materials where provided.
- Care instructions.
- Safety instructions.

These attributes should be configurable because different candle products may have different characteristics.

### Commercial Information
- Regular price.
- Discounted price.
- Active discount percentage.
- Product variants.
- Stock availability.
- SKU per variant where necessary.

### Customer Actions
- Select variants.
- Select quantity.
- Add to cart.
- Buy now.
- Add to wishlist.
- Share product.
- View customer reviews.
- View related products.

Do not display unsupported product attributes as mandatory fields.

## 4.5 Shopping Cart

Provide a complete shopping cart system.

Features:
- Add products.
- Remove products.
- Update quantities.
- Select product variants.
- Display product images.
- Display individual prices.
- Display original and discounted prices.
- Calculate subtotal.
- Apply coupon codes.
- Remove coupon codes.
- Calculate applicable discounts.
- Calculate shipping charges.
- Display final payable amount.
- Display savings.
- Validate inventory.
- Persist cart between visits where technically appropriate.
- Handle cart expiration.
- Prevent ordering unavailable quantities.

All pricing and discount calculations must be validated on the server.

## 4.6 Checkout System

Support both guest checkout and registered customer checkout.

### Customer Information

Required:
- Full name.
- Pakistani mobile phone number.
- City.
- Area.
- Complete delivery address.

Optional or configurable:
- Email address.
- Landmark.
- Postal code.
- Order notes.
- Additional delivery instructions.

### Payment

Cash on Delivery is the initial payment method.

Display:
- Payment method.
- COD amount.
- Product subtotal.
- Discounts.
- Coupon discount.
- Delivery charges.
- Final payable amount.

### Checkout Behaviour

- Validate all required fields.
- Validate Pakistani mobile numbers.
- Validate delivery information.
- Validate cart items.
- Validate current product prices.
- Validate coupon eligibility.
- Validate stock availability.
- Prevent duplicate order submission.
- Create a unique order number.
- Save order details.
- Show a successful order confirmation page.
- Send customer confirmation email when an email is available.
- Notify the owner by email.
- Notify the owner through WhatsApp when configured.

The checkout should be optimized for minimum friction, particularly on mobile devices.

## 4.7 Customer Accounts

Support optional registration.

Features:
- Register.
- Login.
- Logout.
- Email verification.
- Password reset.
- Profile management.
- Saved addresses.
- Order history.
- Order details.
- Wishlist.
- Reorder previous purchases.
- Newsletter preferences.

Guest checkout must always remain available.

## 4.8 Customer Order Information and Shipment Access

The website must display the business-side order information.

Customers should be able to view:
- Order number.
- Order date.
- Order products.
- Quantities.
- Total amount.
- Payment method.
- Payment collection status where appropriate.
- Order status.
- Courier name.
- Courier tracking ID.
- Courier tracking URL.
- Dispatch date.

### Important Pakistan-Specific Courier Behaviour

Do not implement an internal live shipment tracking system.

In Pakistan, customers commonly use the tracking ID provided by the seller on the courier company's official website.

The website must therefore:

- Display the courier company after dispatch.
- Display the tracking ID.
- Provide a copy tracking number button.
- Provide a link to the courier's official tracking website.
- Open the courier tracking page where possible.
- Display the shipment information in the customer's order details.

Do not display fictional live tracking information or pretend to know the parcel's current location.

The owner manually updates business-side order statuses.

Customers should be able to access their own order details securely.

## 4.9 Wishlist

- Add products to wishlist.
- Remove products.
- View saved products.
- Move products to cart.
- Preserve wishlist for registered users.
- Use local/session persistence for guests where appropriate.

## 4.10 Customer Reviews

- Star ratings from 1 to 5.
- Written reviews.
- Optional review images.
- Verified purchase status.
- Review moderation.
- Review approval/rejection.
- Review reporting.
- Product average rating.
- Review submission confirmation.
- Review request email links.

Only customers with eligible completed purchases should receive a verified purchase indicator.

---

# 5. ADMINISTRATIVE DASHBOARD

Create a comprehensive administration system.

The owner must be able to manage the business without accessing code or a database management interface.

## 5.1 Dashboard Overview

Display KPI cards for:

- Total orders.
- New orders.
- Pending orders.
- Confirmed orders.
- Processing orders.
- Packed orders.
- Dispatched orders.
- Delivered orders.
- Cancelled orders.
- Failed deliveries.
- Total customers.
- New customers.
- Total products.
- Active products.
- Low-stock products.
- Out-of-stock products.
- Gross order value.
- Delivered sales.
- COD collected.
- Outstanding COD settlement.
- Average order value.

Include:
- Sales charts.
- Revenue trends.
- Recent orders.
- Recent activities.
- Top-selling products.
- Low-stock alerts.
- Recent customer registrations.
- Promotion performance.

### Date Filters

- Today.
- Yesterday.
- Last 7 days.
- Last 30 days.
- This month.
- Previous month.
- This year.
- Custom date range.

Ensure all analytics use clearly defined financial calculations.

Do not treat pending COD orders as collected revenue.

## 5.2 Product Management

Provide complete CRUD functionality.

The owner must be able to:

- Create products.
- Edit products.
- Archive products.
- Delete products where safe.
- Activate/deactivate products.
- Upload multiple images.
- Reorder images.
- Manage product descriptions.
- Manage product attributes.
- Assign categories.
- Assign tags.
- Manage variants.
- Manage SKUs.
- Set regular prices.
- Configure stock.
- Mark products as featured.
- Mark products as best sellers.
- Manage product visibility.
- Preview products before publishing.

## 5.3 Bulk Product Management

Support:

- CSV/Excel product import.
- Downloadable import template.
- Bulk product creation.
- Bulk product updates.
- Bulk price updates.
- Bulk stock updates.
- Bulk category assignment.
- Bulk status updates.
- Bulk archiving.
- Product export.
- Import preview.
- Row-level validation.
- Import error reports.
- Duplicate SKU detection.
- Safe handling of partial import failures.

Support bulk image management through a clearly defined workflow.

## 5.4 Category Management

- Create categories.
- Edit categories.
- Delete or archive categories.
- Add category descriptions.
- Upload category images.
- Set category banners.
- Manage category ordering.
- Manage subcategories.
- Set category SEO metadata.

## 5.5 Inventory Management

- Track stock by product and variant.
- Stock quantity management.
- Low-stock thresholds.
- Out-of-stock notifications.
- Stock adjustments.
- Stock adjustment reasons.
- Stock movement history.
- Inventory reports.
- Automatic stock deduction/reservation.
- Stock restoration on eligible cancellations.
- Prevent overselling.
- Handle simultaneous purchases safely.

Define inventory transaction rules and reservation behaviour.

## 5.6 Order Management

Provide a comprehensive order management interface.

### Order List

Display:
- Order number.
- Customer name.
- Phone number.
- Order date.
- Number of items.
- Order amount.
- Payment method.
- Payment status.
- Order status.
- Courier.
- Tracking ID.

### Filters and Search

- Order number.
- Customer.
- Phone number.
- Date range.
- Status.
- Payment status.
- City.
- Product.
- Courier.
- Order amount.

### Order Details

Display:
- Customer information.
- Delivery information.
- Product list.
- Variants.
- Quantities.
- Original prices.
- Discounted prices.
- Coupons.
- Subtotal.
- Shipping fee.
- Final total.
- COD amount.
- Payment collection status.
- Order timeline.
- Internal notes.
- Shipment information.
- Notification history.

### Administrative Actions

- Confirm order.
- Reject order.
- Edit order.
- Cancel order.
- Change order status.
- Add cancellation reason.
- Add internal notes.
- Add courier details.
- Enter tracking ID.
- Enter tracking URL.
- Edit shipment details.
- Resend customer emails.
- Contact customer through WhatsApp.
- Print invoice.
- Print packing slip.
- Export order.
- Create manual order.

All important order modifications must be recorded in order history.

## 5.7 COD Payment Management

Because the store operates using Cash on Delivery, implement a separate payment collection management module.

Support statuses such as:
- Pending Collection.
- Collected by Courier.
- Remitted/Settled to Business.
- Reconciliation Required.
- Disputed.
- Adjusted.

Allow the administrator to record:
- Expected COD amount.
- Amount collected.
- Courier.
- Settlement date.
- Settlement reference.
- Short payment.
- Additional charges.
- Adjustments.
- Notes.

Provide a report of delivered orders whose COD amounts have not yet been settled with the business.

Do not automatically mark COD as collected just because an order is delivered.

## 5.8 Customer Management

- Customer directory.
- Customer profiles.
- Contact details.
- Phone numbers.
- Email addresses.
- Addresses.
- Order history.
- Total purchases.
- Total spending.
- Last order.
- Customer notes.
- Customer status.
- Search.
- Filtering.
- Export.

---

# 6. DISCOUNTS, COUPONS AND PROMOTIONAL CAMPAIGNS

Build a flexible promotion engine.

## 6.1 Product Discounts

Support:
- Percentage discount.
- Fixed amount discount.
- Scheduled discount.
- Individual product discounts.
- Multiple selected product discounts.

Example:

Original price: Rs. 1,000.

Discount: 20%.

Discounted price: Rs. 800.

The product card must show:
- Original price with strikethrough.
- Discounted price.
- 20% OFF badge.
- Savings amount where appropriate.

## 6.2 Category Discounts

Allow discounts across entire categories.

## 6.3 Promotional Campaigns

Support campaigns such as:

- 11.11 Sale.
- Black Friday.
- Eid Sale.
- Ramadan Sale.
- Valentine's Day.
- Mother's Day.
- Christmas.
- New Year.
- Anniversary Sale.

Campaign fields:
- Campaign name.
- Description.
- Banner.
- Start date.
- End date.
- Start time.
- End time.
- Applicable products.
- Applicable categories.
- Discount type.
- Discount amount.
- Usage limitations.
- Campaign status.

Campaigns should activate and expire automatically.

## 6.4 Coupon Management

Support:
- Percentage coupons.
- Fixed amount coupons.
- Free shipping coupons.
- Minimum cart value.
- Maximum discount cap.
- Expiration dates.
- Maximum usage.
- Per-customer limits.
- Product restrictions.
- Category restrictions.
- First-order restrictions.
- Active/inactive status.

Example codes:
- WELCOME10.
- FIRSTORDER.
- EID20.
- FREESHIPPING.

Track coupon usage and effectiveness.

## 6.5 Promotion Priority and Validation

Clearly define:
- Whether product discounts can coexist with campaign discounts.
- Whether coupons can be combined with discounts.
- Discount calculation order.
- Maximum discount limits.
- Rounding rules.
- Expired campaign handling.
- Concurrent promotion handling.

Prevent unintended discount stacking.

---

# 7. EMAIL AUTOMATION SYSTEM

Integrate a transactional email service such as Resend.

The platform must automatically send relevant customer and owner emails.

## 7.1 Customer Transactional Emails

Support:

1. Order received.
2. Order confirmation.
3. Order processing.
4. Order packed.
5. Order dispatched.
6. Shipment tracking information.
7. Order delivered.
8. Order cancelled.
9. Review request.
10. Account verification.
11. Password reset.
12. Newsletter subscription confirmation.
13. Promotional campaign emails.
14. Abandoned cart recovery.
15. Other configurable transactional notifications.

Avoid sending duplicate or unnecessary emails.

## 7.2 Owner Notifications

Send owner emails for:
- New order.
- Order cancellation.
- Customer inquiry.
- Low stock.
- Out-of-stock product.
- Important system events.

## 7.3 Email Template Management

The administrator should be able to:

- View templates.
- Edit subject lines.
- Edit email content.
- Customize branding.
- Insert logo.
- Customize colours.
- Preview emails.
- Send test emails.
- Enable/disable optional notification types.

Support dynamic placeholders:
- Customer name.
- Order number.
- Order details.
- Product names.
- Quantities.
- Order amount.
- Discount.
- Courier name.
- Tracking ID.
- Tracking URL.
- Delivery address.

Templates must have a consistent brand identity.

## 7.4 Email Delivery Logs

Maintain:
- Recipient.
- Email type.
- Related order.
- Sending timestamp.
- Delivery status.
- Failure reason where available.
- Retry information.

Email failure must not invalidate an order.

## 7.5 Promotional Email Campaigns

Allow the owner to:

- Create email campaigns.
- Design content.
- Customize subject.
- Select subscribers.
- Segment customers.
- Schedule sending.
- Preview.
- Test-send.
- View delivery reports.

Include unsubscribe functionality and consent management.

---

# 8. WHATSAPP INTEGRATION

Use the official WhatsApp Business Cloud API or an appropriate supported provider.

## 8.1 Owner WhatsApp Notifications

Notify the owner about:
- New orders.
- Order cancellations.
- Low stock.
- Important business events.

Example:

"New Order #CND-1024 received. Customer: Sarah. Total: Rs. 2,500. Payment: COD."

## 8.2 Customer WhatsApp Notifications

Support configured notifications for:
- Order confirmation.
- Order processing.
- Dispatch.
- Tracking information.
- Delivery.
- Cancellation where appropriate.

## 8.3 Integration Requirements

- Official API integration.
- Message templates where required.
- Customer opt-in.
- Configurable triggers.
- Message logs.
- Delivery status where available.
- Error handling.
- Retry mechanisms.
- Secure credential management.

Provide a click-to-chat WhatsApp link separately from automated WhatsApp messaging.

Do not assume that WhatsApp automation can be achieved merely by opening a WhatsApp URL.

---

# 9. CUSTOMER COMMUNICATION AND MARKETING

## 9.1 Newsletter

- Subscription form.
- Subscriber database.
- Email verification.
- Unsubscribe.
- Subscriber management.
- Export.
- Subscription history.

## 9.2 Customer Segmentation

Allow customer grouping based on:
- New customers.
- Returning customers.
- Customers who have not purchased recently.
- High-spending customers.
- Customers who purchased specific products.
- Customers with abandoned carts.

## 9.3 Promotional Campaigns

- Custom campaign creation.
- Campaign subject.
- Email content.
- Audience selection.
- Scheduling.
- Preview.
- Test sending.
- Delivery reporting.

Only send promotional emails to appropriately consented recipients.

## 9.4 Abandoned Cart Recovery

- Detect abandoned carts.
- Configurable abandonment period.
- Recovery emails.
- Product details in recovery email.
- Return-to-cart link.
- Avoid duplicate recovery emails.
- Exclude customers who completed checkout.
- Track recovery outcomes.

---

# 10. COURIER AND SHIPPING MANAGEMENT — PAKISTAN-SPECIFIC

This module must reflect the actual courier workflow commonly used by Pakistani small businesses.

**Do not build a live courier tracking system.**

The business owner will book shipments independently using whichever courier service they prefer.

Potential courier providers include:
- TCS.
- Leopards Courier.
- M&P.
- Trax.
- PostEx.
- Call Courier.
- BlueEX.
- Other providers.

These are examples only. The business has not yet selected its courier provider.

## 10.1 Courier Configuration

Allow the administrator to:
- Add courier companies.
- Edit courier companies.
- Activate/deactivate courier companies.
- Save official tracking website URLs.
- Configure tracking URL templates if supported.
- Enter courier contact information.

Allow manual courier-name entry when a courier is not already configured.

## 10.2 Shipping Configuration

Support:
- Flat delivery fee.
- City-based shipping charges.
- Area-based shipping charges.
- Free delivery above a configurable cart value.
- Special shipping charges.
- Configurable delivery estimates.
- Active/inactive shipping rules.

## 10.3 Shipment Management

When an order is packed, the owner independently books the shipment.

The owner then enters:

- Courier company.
- Tracking ID.
- Tracking URL.
- Dispatch date.
- Shipment notes.

Allow editing shipment details.

## 10.4 Customer Tracking Information

Once shipment information is entered:

- Customer receives a dispatch email.
- Email includes courier company.
- Email includes tracking ID.
- Email includes official tracking URL.
- Email provides a convenient tracking link.
- Customer can copy the tracking number.
- Customer can visit the courier's official tracking website.
- Optional WhatsApp notification is sent.

If the courier supports tracking links with tracking numbers in the URL, support configurable URL templates.

Otherwise, provide the official tracking website and the tracking number separately.

## 10.5 Explicitly Excluded Courier Behaviour

Do not implement:
- Live parcel location.
- Internal delivery maps.
- Automatic courier tracking.
- Courier API integrations.
- Automatic delivery-status synchronization.
- Artificially generated delivery updates.

The e-commerce website manages its own order status. The courier website manages actual shipment tracking.

## 10.6 Order and Shipment Statuses

Define business-side order statuses separately from courier shipment information.

Suggested order statuses:
- Pending Confirmation.
- Confirmed.
- Processing.
- Packed.
- Dispatched.
- Delivered.
- Cancellation Requested.
- Cancelled.
- Failed Delivery.
- Returned.

The administrator manually updates statuses based on actual business information.

---

# 11. REVIEWS AND CUSTOMER FEEDBACK

- Review submission.
- Star rating.
- Written review.
- Optional images.
- Verified purchase.
- Moderation.
- Approval/rejection.
- Review visibility.
- Product rating calculations.
- Review request emails.
- Review analytics.

## Review Automation

After an order is marked delivered:
- Wait a configurable number of days.
- Send a review request email.
- Include direct review links.
- Avoid repeated requests.
- Do not request reviews for cancelled orders.

---

# 12. INVOICES AND ORDER DOCUMENTS

Support:
- Automatic invoice numbers.
- PDF invoice generation.
- Business information.
- Customer information.
- Order details.
- Itemized product pricing.
- Discounts.
- Coupons.
- Shipping charges.
- Final payable amount.
- COD information.
- Invoice download.
- Invoice printing.
- Packing slips.

Invoices should be accessible through the admin order details.

---

# 13. ANALYTICS AND BUSINESS REPORTING

## 13.1 Sales Analytics

- Total order value.
- Gross sales.
- Net sales.
- Delivered sales.
- COD collected.
- COD outstanding.
- Average order value.
- Daily sales.
- Weekly sales.
- Monthly sales.
- Yearly sales.
- Revenue trends.

## 13.2 Product Analytics

- Best-selling products.
- Least-selling products.
- Product revenue.
- Product quantities sold.
- Product popularity.
- Inventory performance.
- Low-stock products.
- Out-of-stock products.

## 13.3 Customer Analytics

- Total customers.
- New customers.
- Returning customers.
- Repeat purchase rate.
- Customer lifetime spending.
- Top customers.
- Customer order frequency.

## 13.4 Order Analytics

- Orders by status.
- Orders by city.
- Orders by product.
- Cancellation rate.
- Failed delivery rate.
- Average processing time.
- COD performance.

## 13.5 Marketing Analytics

- Coupon usage.
- Campaign performance.
- Discount totals.
- Promotional revenue.
- Newsletter subscribers.
- Email delivery statistics.
- Abandoned cart recovery.

## 13.6 Reporting

Provide:
- Date filtering.
- Custom date ranges.
- CSV export.
- Excel-compatible exports.
- Printable reports.

Document the calculation formulas for all financial metrics.

---

# 14. STORE SETTINGS AND CONTENT MANAGEMENT

The administrator should be able to configure:

## Business Information
- Brand name.
- Logo.
- Favicon.
- Contact email.
- Phone.
- WhatsApp.
- Business address.
- Social links.

## Store Configuration
- Currency.
- Timezone.
- Default shipping charges.
- COD configuration.
- Order number format.
- Invoice numbering.
- Inventory thresholds.
- Notification settings.

## Website Content
- Homepage banners.
- Promotional banners.
- About page.
- Contact page.
- FAQ page.
- Terms and conditions.
- Privacy policy.
- Return policy.
- Refund policy.
- Shipping policy.
- Candle care instructions.

## SEO
- Default SEO title.
- Meta description.
- Social sharing images.
- Sitemap settings.

All configurable content must be manageable without code changes.

---

# 15. SEARCH ENGINE OPTIMIZATION

Implement:
- SEO-friendly URLs.
- Product-specific meta titles.
- Meta descriptions.
- Open Graph metadata.
- Product structured data.
- Breadcrumb structured data.
- XML sitemap.
- Robots.txt.
- Canonical URLs.
- Image alt attributes.
- Optimized images.
- Indexing controls.
- Proper category and product page metadata.

---

# 16. VISUAL DESIGN AND UI/UX — CRITICAL REQUIREMENT

This is one of the most important aspects of the project.

**The final website must be exceptionally beautiful, sophisticated, visually fascinating and professionally designed.**

Do not create an ordinary e-commerce template.

Do not use a generic storefront design with a basic navbar, generic hero section, ordinary product grid and standard footer.

The platform should look like a premium, professionally designed candle and fragrance brand.

The design must create an emotional connection with the products and communicate quality, elegance and trust.

## 16.1 Overall Design Direction

Visual characteristics:
- Premium.
- Elegant.
- Sophisticated.
- Warm.
- Minimal but visually rich.
- Modern.
- Memorable.
- Immersive.
- Editorial.
- Refined.

Consider:
- Warm ivory.
- Cream.
- Beige.
- Caramel.
- Muted browns.
- Earthy colours.
- Carefully selected accent colours.

The final palette should be adaptable to the actual brand identity.

## 16.2 Typography

Use a deliberate typographic system:
- Elegant serif typography for major headings.
- Clean sans-serif typography for body content.
- Carefully balanced font weights.
- Refined line heights.
- Excellent readability.

Avoid generic typography choices without considering the candle brand's identity.

## 16.3 Homepage Design

The homepage must make an excellent first impression.

Design:
- An impressive hero section.
- Large, beautiful candle photography.
- Strong editorial typography.
- Elegant promotional messaging.
- Beautifully composed product collections.
- Premium product cards.
- Refined campaign banners.
- Attractive brand storytelling.
- Carefully designed testimonials.
- Visually polished footer.

Use photography and whitespace effectively.

Avoid unnecessary clutter.

## 16.4 Product Card Design

Product cards should be attractive and distinctive.

Include:
- Beautiful image presentation.
- Product title.
- Fragrance information.
- Regular price.
- Discounted price.
- Discount badge.
- Wishlist control.
- Quick add-to-cart.
- Hover interactions.

Discount presentation should feel premium rather than cheap or overly aggressive.

## 16.5 Product Detail Design

Prioritize:
- Large product imagery.
- Elegant gallery.
- Beautiful typography.
- Well-organized descriptions.
- Clear pricing.
- Refined variant selectors.
- Prominent purchase actions.
- Fragrance storytelling.
- Customer reviews.
- Related products.

## 16.6 Cart and Checkout Design

Make checkout:
- Beautiful.
- Clear.
- Trustworthy.
- Fast.
- Simple.
- Mobile-friendly.

Use a clear visual hierarchy for prices, discounts, shipping charges and COD total.

## 16.7 Admin Dashboard Design

The admin interface must also look like a polished commercial SaaS application.

Include:
- Modern sidebar.
- Clean navigation.
- Attractive KPI cards.
- Beautiful charts.
- Well-designed tables.
- Consistent status badges.
- Advanced filters.
- Organized forms.
- Clear modal dialogs.
- Empty states.
- Loading states.
- Error states.
- Confirmation states.
- Responsive layouts.

The interface should feel intuitive to a non-technical business owner.

## 16.8 Microinteractions

Use subtle, purposeful interactions:
- Hover effects.
- Smooth transitions.
- Cart feedback.
- Wishlist feedback.
- Button loading states.
- Success notifications.
- Elegant menus.
- Image transitions.
- Modal animations.

Avoid excessive animation or effects that reduce performance.

## 16.9 Responsive Design

Design carefully for:
- Mobile.
- Tablet.
- Desktop.

Mobile usability is especially important because Pakistani customers often arrive from Instagram, Facebook and WhatsApp.

## 16.10 Design Quality Standards

The final design must:
1. Feel like a real premium candle brand.
2. Avoid generic template aesthetics.
3. Maintain consistent visual language.
4. Give product photography proper prominence.
5. Use excellent spacing and typography.
6. Have beautifully designed product cards.
7. Make checkout frictionless.
8. Make the admin dashboard intuitive.
9. Have polished loading, error and empty states.
10. Be visually complete on every page, not just the homepage.

Do not sacrifice visual quality for development convenience.

---

# 17. TECHNICAL ARCHITECTURE

Use this proposed technology stack unless a strong technical reason justifies an alternative.

## Frontend
- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.

## Backend
- Next.js server-side functionality.
- API routes.
- Server Actions where appropriate.
- Server-side business logic.

## Database
- Supabase PostgreSQL.

## Authentication
- Supabase Auth.

## Storage
- Supabase Storage or Cloudinary.

## Email
- Resend.

## WhatsApp
- WhatsApp Business Cloud API or appropriate supported provider.

## Hosting
- Vercel.

## Architecture Requirements

- Modular architecture.
- Clear separation of concerns.
- Reusable components.
- Type-safe implementation.
- Consistent validation.
- Secure API design.
- Server-side pricing calculations.
- Centralized notification handling.
- Reliable background processing for scheduled tasks.
- Reusable e-commerce foundations.

Avoid unnecessary microservices or overengineering.

---

# 18. DATABASE ARCHITECTURE

Design a complete relational database schema.

Consider these entities:

- profiles.
- roles.
- role_permissions.
- products.
- product_variants.
- product_images.
- categories.
- product_categories.
- product_tags.
- inventory.
- inventory_movements.
- customers.
- customer_addresses.
- carts.
- cart_items.
- orders.
- order_items.
- order_status_history.
- shipments.
- courier_companies.
- coupons.
- coupon_usage.
- campaigns.
- campaign_products.
- reviews.
- email_templates.
- email_logs.
- email_campaigns.
- email_campaign_recipients.
- notifications.
- whatsapp_logs.
- newsletter_subscribers.
- abandoned_carts.
- shipping_zones.
- shipping_rates.
- cod_settlements.
- cod_settlement_items.
- store_settings.
- admin_activity_logs.

Do not blindly follow this list. Add, remove or merge entities when technically justified.

For every table define:
- Purpose.
- Column name.
- Data type.
- Primary key.
- Foreign keys.
- Required fields.
- Optional fields.
- Default values.
- Constraints.
- Indexes.
- Relationships.

Ensure proper normalization and data integrity.

Design for:
- Guest customers.
- Registered customers.
- Multiple products per order.
- Product variants.
- Multiple discounts.
- Scheduled campaigns.
- Coupon restrictions.
- Inventory transactions.
- Order history.
- Shipment records.
- COD reconciliation.
- Notification history.
- Marketing consent.

Preserve historical order information even when products are later edited or archived.

---

# 19. BUSINESS RULES AND EDGE CASES

Define precise behaviour for:

## Orders
- Duplicate order submissions.
- Invalid customer information.
- Order cancellation.
- Admin order editing.
- Customer cancellation requests.
- Failed delivery.
- Returned shipments.
- Duplicate notifications.

## Inventory
- Product becoming unavailable during checkout.
- Two customers purchasing the last unit simultaneously.
- Stock reservation.
- Stock deduction.
- Stock restoration.
- Manual stock adjustments.
- Bulk stock updates.

## Discounts
- Invalid coupon.
- Expired coupon.
- Coupon usage limits.
- Product discounts and coupon combinations.
- Multiple active campaigns.
- Campaign start and expiration.
- Product price changing during checkout.
- Discount rounding.

## Notifications
- Email delivery failures.
- WhatsApp delivery failures.
- Duplicate events.
- Retry behaviour.
- Missing email addresses.
- Customer notification preferences.

## Shipping
- Missing tracking number.
- Incorrect tracking number.
- Courier not configured.
- Courier URL unavailable.
- Shipment details edited after dispatch.

## COD
- Delivered order but payment not settled.
- Partial COD settlement.
- Courier deductions.
- Settlement discrepancy.
- Reconciliation adjustments.

## Data
- Customer deletion requests.
- Historical order preservation.
- Product archival.
- Admin permission changes.
- Invalid bulk import rows.
- Unauthorized order access.

Document the expected system response and data changes for every scenario.

---

# 20. AUTOMATED BUSINESS WORKFLOWS

Document complete workflows with triggers, conditions, actions, database changes, notifications and error handling.

## New Order

Customer submits order
→ Validate checkout
→ Validate product prices and stock
→ Create order
→ Generate unique order number
→ Reserve/deduct inventory according to defined policy
→ Send customer confirmation email
→ Send owner email notification
→ Send owner WhatsApp notification
→ Display order in dashboard.

## Order Confirmation

Admin reviews order
→ Confirms order
→ Status changes
→ Customer receives appropriate notification
→ Order history updated.

## Processing and Packing

Admin starts processing
→ Updates status
→ Packs products
→ Marks order as packed.

## Dispatch

Owner books shipment independently
→ Courier provides tracking ID
→ Owner enters courier details
→ Owner enters tracking ID and official tracking URL
→ Marks order dispatched
→ Customer receives email and configured WhatsApp notification.

## Delivery

Owner confirms delivery based on courier information
→ Marks order delivered
→ Customer receives delivery notification
→ Review request scheduled.

## COD Settlement

Courier remits COD
→ Owner records settlement
→ System reconciles expected and received amounts
→ Differences are flagged
→ Reports are updated.

## Cancellation

Customer requests cancellation or admin cancels
→ Validate cancellation eligibility
→ Update order status
→ Record reason
→ Restore inventory where appropriate
→ Notify customer and owner.

## Promotional Campaign

Admin creates campaign
→ Configures discounts and dates
→ Campaign activates automatically
→ Product prices update
→ Promotional display appears
→ Campaign expires
→ Original pricing is restored.

## Low Stock

Inventory reaches configured threshold
→ System creates alert
→ Owner receives notification
→ Dashboard highlights affected product.

## Review Request

Order becomes delivered
→ Wait configured number of days
→ Check whether customer already reviewed
→ Send review request
→ Record delivery status of email.

## Abandoned Cart

Cart remains inactive beyond configured threshold
→ Verify cart is still abandoned
→ Check customer marketing eligibility
→ Send recovery email
→ Track recovery.

---

# 21. FUNCTIONAL REQUIREMENTS CATALOGUE

Create a comprehensive, numbered functional requirements catalogue.

Use identifiers such as:

- FR-AUTH-001.
- FR-HOME-001.
- FR-PROD-001.
- FR-CART-001.
- FR-CHECKOUT-001.
- FR-ORD-001.
- FR-INV-001.
- FR-COD-001.
- FR-DISC-001.
- FR-EMAIL-001.
- FR-WA-001.
- FR-SHIP-001.
- FR-REV-001.
- FR-ANALYTICS-001.
- FR-ADMIN-001.

For every requirement include:

1. Requirement ID.
2. Requirement name.
3. Detailed description.
4. Responsible user role.
5. Preconditions.
6. Expected workflow.
7. Expected result.
8. Acceptance criteria.
9. Dependencies.

Requirements must be unambiguous and testable.

Do not write vague statements such as "the system should be user-friendly" without measurable acceptance criteria.

---

# 22. NON-FUNCTIONAL REQUIREMENTS

Create a separate catalogue for:

- Performance.
- Security.
- Reliability.
- Availability.
- Accessibility.
- Responsiveness.
- Maintainability.
- Scalability.
- Usability.
- Data privacy.
- Backup and recovery.
- SEO.
- Error handling.

Use identifiers such as:

- NFR-PERF-001.
- NFR-SEC-001.
- NFR-AVAIL-001.
- NFR-UX-001.
- NFR-SCALE-001.

Include measurable targets where appropriate and explain the assumptions behind them.

---

# 23. SECURITY AND DATA PROTECTION

Specify:

- Secure authentication.
- Role-based access control.
- Database Row Level Security.
- Server-side authorization.
- Secure session management.
- Password reset security.
- Input validation.
- Protection against SQL injection.
- XSS protection.
- CSRF protection where applicable.
- API rate limiting.
- Secure file uploads.
- Secure API credentials.
- No exposed service-role keys.
- Customer order access restrictions.
- Admin activity logs.
- Audit trails.
- Data backup.
- Error monitoring.
- Privacy and consent management.

Do not expose sensitive customer data to unauthorized users.

---

# 24. TESTING AND QUALITY ASSURANCE

Define a complete testing strategy.

Include:

## Unit Testing
- Pricing calculations.
- Discounts.
- Coupon validation.
- Inventory calculations.
- COD calculations.
- Order status rules.

## Integration Testing
- Database operations.
- Email delivery.
- WhatsApp notifications.
- Storage uploads.
- Scheduled campaigns.
- Background jobs.

## End-to-End Testing
- Complete customer purchase.
- Guest checkout.
- Registered checkout.
- Product management.
- Bulk import.
- Order cancellation.
- Shipment creation.
- Tracking notification.
- COD settlement.
- Review submission.
- Promotional campaign.

## Security Testing
- Authentication.
- Authorization.
- Customer data isolation.
- Admin permissions.
- API protection.

## UI Testing
- Mobile responsiveness.
- Desktop layouts.
- Checkout usability.
- Dashboard usability.
- Form validation.
- Loading states.
- Error states.

Provide detailed test scenarios and expected outcomes.

---

# 25. DEPLOYMENT AND MAINTENANCE

Document:

- Environment configuration.
- Development environment.
- Staging environment.
- Production environment.
- Environment variables.
- Database migrations.
- Storage configuration.
- Email domain configuration.
- WhatsApp API setup.
- Deployment procedures.
- Backup strategy.
- Logging.
- Monitoring.
- Error reporting.
- Scheduled job execution.
- Database maintenance.
- Recovery procedures.

Identify which third-party services require account registration, verification, configuration or paid plans.

Do not assume that integrations are already configured.

---

# 26. FINAL DOCUMENT STRUCTURE

Organize the final documentation into the following chapters:

1. Executive Summary.
2. Project Background.
3. Business Objectives.
4. Scope of the Product.
5. Stakeholders.
6. User Roles and Permissions.
7. Customer Storefront Requirements.
8. Homepage and Content Management.
9. Product Catalogue.
10. Product Details and Variants.
11. Cart and Checkout.
12. Customer Accounts.
13. Customer Order Information.
14. Wishlist.
15. Reviews and Ratings.
16. Admin Dashboard.
17. Product Management.
18. Bulk Product Management.
19. Inventory Management.
20. Order Management.
21. COD and Settlement Management.
22. Customer Management.
23. Discounts and Coupons.
24. Promotional Campaigns.
25. Email Automation.
26. WhatsApp Integration.
27. Marketing and Customer Communication.
28. Abandoned Cart Recovery.
29. Shipping Configuration.
30. Courier and Shipment Management.
31. Invoices and Documents.
32. Analytics and Reporting.
33. Store Configuration.
34. SEO.
35. Visual Design and UI/UX Specifications.
36. Technical Architecture.
37. Database Architecture.
38. API Requirements.
39. Business Rules.
40. Automated Workflows.
41. Functional Requirements Catalogue.
42. Non-Functional Requirements Catalogue.
43. Security Requirements.
44. Edge Cases and Error Handling.
45. Testing and Acceptance Criteria.
46. Deployment and Maintenance.
47. Risks and Dependencies.
48. Assumptions and Open Questions.
49. Final Scope Summary.

---

# 27. FINAL INSTRUCTIONS

Follow these instructions strictly:

1. Produce a complete SRS and PRD, not a short summary.
2. Do not include AI functionality.
3. Do not divide the product into MVP or development phases.
4. All specified functionality is part of the complete project scope.
5. Do not omit administrative functionality.
6. Do not omit customer-facing functionality.
7. Do not overlook Pakistan-specific business practices.
8. Use PKR and Asia/Karachi timezone.
9. Cash on Delivery is the initial payment method.
10. Do not introduce online payment gateways into the specified scope.
11. Do not implement internal live courier tracking.
12. Use manual courier selection and tracking ID entry.
13. Customers must receive official courier tracking links and tracking numbers.
14. Clearly separate order delivery status from COD settlement status.
15. Prioritize exceptional visual design and mobile responsiveness.
16. Avoid generic e-commerce template aesthetics.
17. Do not overengineer the technical architecture.
18. Make the database design comprehensive and logically normalized.
19. Make requirements testable.
20. Include detailed workflows and acceptance criteria.
21. Identify unknown business decisions explicitly.
22. Recommend sensible defaults without pretending they have been confirmed.
23. Distinguish required integrations from optional configuration.
24. Make the platform maintainable and extensible.
25. Ensure the documentation is internally consistent.

## Output Quality

The final output must resemble a professional specification prepared by an experienced product management and engineering team.

Use:
- Detailed explanations.
- Well-structured tables.
- Requirement IDs.
- Acceptance criteria.
- Workflow diagrams using Mermaid where helpful.
- Database relationship diagrams.
- API specifications where appropriate.
- Clear technical recommendations.
- Explicit assumptions and open questions.

Do not rush or compress the document to save space.

If the complete document is too large for one response, generate it in clearly numbered consecutive parts without omitting chapters. Maintain consistent terminology and cross-references between parts.

The final result should be a single coherent, comprehensive product specification that a development team can confidently use to build the complete platform.