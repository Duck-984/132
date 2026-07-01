// Central re-export barrel — keeps all existing import paths working.
// Domain logic lives in: products.ts, orders.ts, catalog.ts, commerce.ts, activity.ts, users.ts

export type { Product, ProductFilters, ProductSort, Category, CategoryWithCount } from './products';
export { productQueries, inventoryQueries, categoryQueries, PAGE_SIZE } from './products';

export type { Order } from './orders';
export { orderQueries } from './orders';

export type { Review, Promotion, ProductCollection, ProductRelation } from './catalog';
export { reviewQueries, promotionQueries, productCollectionQueries, productRelationQueries } from './catalog';

export type { Banner, DeliveryZone, Coupon, CouponUsage } from './commerce';
export { bannerQueries, deliveryZoneQueries, couponQueries } from './commerce';

export type { Return, Notification, AuditLogEntry } from './activity';
export { returnQueries, notificationQueries, auditLogQueries } from './activity';

export type { User, Referral } from './users';
export { userQueries, referralQueries, favoriteQueries, paymentQueries } from './users';
