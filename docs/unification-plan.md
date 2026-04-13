# Vase Unification Migration Map

Este documento convierte el análisis comparativo en un mapa de migración ejecutable.

Reglas de lectura:
- `destino_en_vase` apunta a la ruta exacta de destino planificada.
- Cuando la migración afecta modelo de datos, el destino natural es `prisma/schema.prisma`, aunque quede fuera de `src`.
- `copiar` significa que la pieza puede entrar con ajustes menores de compatibilidad.
- `refactor` significa que la lógica es valiosa pero debe separarse o adaptarse a la arquitectura actual.
- `rediseñar` significa que solo conviene migrar el concepto, no la implementación literal.

## 1. business-storefront

| legacy_path | destino_en_vase | tipo_de_migracion | prioridad | dependencia |
| --- | --- | --- | --- | --- |
| `legacy/business/web/src/components/blocks/HeroSlider.jsx` | `src/components/business/storefront/blocks/hero-slider.tsx` | refactor | alta | `src/lib/business/storefront-theme.ts` |
| `legacy/business/web/src/components/blocks/HeroCorporateSlider.jsx` | `src/components/business/storefront/blocks/hero-corporate-slider.tsx` | refactor | media | `src/components/business/storefront/blocks/hero-slider.tsx` |
| `legacy/business/web/src/components/blocks/HeroGamingSlider.jsx` | `src/components/business/storefront/blocks/hero-gaming-slider.tsx` | refactor | baja | `src/components/business/storefront/blocks/hero-slider.tsx` |
| `legacy/business/web/src/components/blocks/HeroSaleBurstSlider.jsx` | `src/components/business/storefront/blocks/hero-sale-burst-slider.tsx` | refactor | media | `src/components/business/storefront/blocks/hero-slider.tsx` |
| `legacy/business/web/src/components/blocks/FashionHeroSlider.jsx` | `src/components/business/storefront/blocks/fashion-hero-slider.tsx` | refactor | baja | `src/components/business/storefront/blocks/hero-slider.tsx` |
| `legacy/business/web/src/components/blocks/HomeDecorHeroSlider.jsx` | `src/components/business/storefront/blocks/home-decor-hero-slider.tsx` | refactor | baja | `src/components/business/storefront/blocks/hero-slider.tsx` |
| `legacy/business/web/src/components/blocks/SanitariosIndustrialHeroSlider.jsx` | `src/components/business/storefront/blocks/sanitarios-industrial-hero-slider.tsx` | refactor | baja | `src/components/business/storefront/blocks/hero-slider.tsx` |
| `legacy/business/web/src/components/blocks/FeaturedProducts*.jsx` | `src/components/business/storefront/blocks/featured-products/` | refactor | alta | `src/server/queries/storefront.ts` |
| `legacy/business/web/src/components/blocks/BrandMarquee*.jsx` | `src/components/business/storefront/blocks/brand-marquee/` | copiar | media | ninguna |
| `legacy/business/web/src/components/blocks/About*.jsx` | `src/components/business/storefront/blocks/about/` | copiar | baja | `src/lib/business/storefront-theme.ts` |
| `legacy/business/web/src/components/blocks/Services.jsx` | `src/components/business/storefront/blocks/services.tsx` | refactor | media | `src/lib/business/storefront-content.ts` |
| `legacy/business/web/src/components/PageBuilder.jsx` | `src/components/business/builder-editor.tsx` | refactor | alta | `src/lib/business/builder.ts`, `src/server/queries/builder.ts` |
| `legacy/business/web/src/components/admin/evolution/PageSectionsEditor.jsx` | `src/components/business/storefront/page-sections-editor.tsx` | refactor | alta | `src/components/business/builder-editor.tsx` |
| `legacy/business/web/src/components/admin/evolution/BlockPropertiesEditor.jsx` | `src/components/business/storefront/block-properties-editor.tsx` | refactor | alta | `src/components/business/builder-editor.tsx` |
| `legacy/business/web/src/components/admin/evolution/AppearanceEditor.jsx` | `src/components/business/storefront/appearance-editor.tsx` | refactor | alta | `src/lib/business/storefront-theme.ts` |
| `legacy/business/web/src/components/admin/evolution/DesignEditor.jsx` | `src/components/business/storefront/design-editor.tsx` | rediseñar | media | `src/components/business/storefront/appearance-editor.tsx` |
| `legacy/business/web/src/components/admin/evolution/EvolutionCanvas.jsx` | `src/components/business/storefront/evolution-canvas.tsx` | refactor | media | `src/components/business/builder-editor.tsx` |
| `legacy/business/web/src/components/admin/evolution/EvolutionInspector.jsx` | `src/components/business/storefront/evolution-inspector.tsx` | refactor | media | `src/components/business/storefront/block-properties-editor.tsx` |
| `legacy/business/web/src/components/admin/evolution/SortableSection.jsx` | `src/components/business/storefront/sortable-section.tsx` | copiar | media | `src/components/business/builder-editor.tsx` |
| `legacy/business/web/src/components/admin/evolution/MediaLibrary.jsx` | `src/components/business/storefront/media-library.tsx` | refactor | media | storage unificado de assets |
| `legacy/business/web/src/components/admin/evolution/MediaPropertiesEditor.jsx` | `src/components/business/storefront/media-properties-editor.tsx` | refactor | baja | `src/components/business/storefront/media-library.tsx` |
| `legacy/business/web/src/pages/admin/evolution/EvolutionAdmin.jsx` | `src/app/(platform)/app/owner/customizations/page.tsx` | rediseñar | alta | `page-sections-editor`, `appearance-editor`, `builder queries` |
| `legacy/business/web/src/pages/admin/evolution/PreviewPage.jsx` | `src/components/business/storefront-preview.tsx` | refactor | alta | `src/server/queries/builder.ts` |
| `legacy/business/web/src/pages/admin/EditorPage.jsx` | `src/app/(platform)/app/owner/pages/[pageId]/page.tsx` | rediseñar | alta | `src/components/business/builder-editor.tsx` |
| `legacy/business/web/src/utils/storefrontTheme.js` | `src/lib/business/storefront-theme.ts` | copiar | alta | ninguna |
| `legacy/business/web/src/utils/navigation.js` | `src/lib/business/storefront-navigation.ts` | refactor | media | `src/server/queries/storefront.ts` |
| `legacy/business/web/src/context/TenantContext.jsx` | `src/lib/business/storefront-context.ts` | rediseñar | media | tenancy actual y queries de storefront |
| `legacy/business/server/src/routes/public.js` | `src/server/queries/storefront.ts` | refactor | alta | `schema de catálogo`, `DomainConnection`, `StorefrontPage` |
| `legacy/business/server/src/routes/tenant.js` | `src/server/queries/storefront-admin.ts` | refactor | media | `src/server/queries/storefront.ts` |
| `legacy/business/server/src/routes/settings.js` | `src/server/services/storefront-settings.ts` | refactor | media | `src/lib/business/storefront-theme.ts` |
| `legacy/business/db/schema.sql` (`pages`, `page_sections`, `tenant_domains`, `tenant_settings`) | `prisma/schema.prisma` | refactor | alta | definición final de `StorefrontPage`, `StorefrontPageVersion`, `DomainConnection`, settings por tenant |

## 2. business-commerce

| legacy_path | destino_en_vase | tipo_de_migracion | prioridad | dependencia |
| --- | --- | --- | --- | --- |
| `legacy/business/web/src/components/admin/evolution/CatalogEditor.jsx` | `src/components/business/catalog/catalog-editor.tsx` | refactor | alta | `src/server/services/catalog.ts`, `prisma/schema.prisma` |
| `legacy/business/web/src/components/admin/evolution/CategoriesEditor.jsx` | `src/components/business/catalog/categories-editor.tsx` | refactor | alta | `src/server/services/catalog.ts` |
| `legacy/business/web/src/components/admin/evolution/ProductPropertiesEditor.jsx` | `src/components/business/catalog/product-properties-editor.tsx` | refactor | media | `src/components/business/catalog/catalog-editor.tsx` |
| `legacy/business/web/src/components/admin/evolution/CatalogInspectorPanel.jsx` | `src/components/business/catalog/catalog-inspector-panel.tsx` | rediseñar | media | `catalog-editor` |
| `legacy/business/web/src/components/admin/evolution/PricingEditor.jsx` | `src/components/business/catalog/pricing-editor.tsx` | refactor | alta | `src/lib/business/pricing.ts`, `PriceList` |
| `legacy/business/web/src/components/admin/evolution/CheckoutEditor.jsx` | `src/components/business/checkout/checkout-editor.tsx` | refactor | alta | `src/server/services/checkout.ts` |
| `legacy/business/web/src/components/admin/evolution/ShippingEditor.jsx` | `src/components/business/checkout/shipping-editor.tsx` | refactor | alta | `src/lib/business/shipping.ts` |
| `legacy/business/web/src/components/admin/evolution/ShippingZoneAreaPicker.jsx` | `src/components/business/checkout/shipping-zone-area-picker.tsx` | rediseñar | media | `shipping-editor` |
| `legacy/business/web/src/components/admin/evolution/ShippingZonesMapPreview.jsx` | `src/components/business/checkout/shipping-zones-map-preview.tsx` | rediseñar | baja | `shipping-editor` |
| `legacy/business/web/src/components/admin/evolution/IntegrationsEditor.jsx` | `src/components/business/integrations/business-integrations-editor.tsx` | refactor | media | `src/lib/integrations/*`, `src/server/queries/integrations.ts` |
| `legacy/business/web/src/components/admin/evolution/DomainConnectModal.jsx` | `src/components/business/domain-request-form.tsx` | refactor | media | `DomainConnection` consistente |
| `legacy/business/web/src/components/admin/evolution/NotificationsEditor.jsx` | `src/components/business/notifications/notifications-editor.tsx` | rediseñar | baja | sistema unificado de notificaciones |
| `legacy/business/web/src/components/admin/evolution/NotificationsPopover.jsx` | `src/components/business/notifications/notifications-popover.tsx` | rediseñar | baja | `notifications-editor` |
| `legacy/business/web/src/components/admin/evolution/UsersEditor.jsx` | `src/app/(platform)/app/admin/users/page.tsx` | rediseñar | media | `Membership`, `roles` |
| `legacy/business/web/src/components/admin/evolution/UsersInspectorPanel.jsx` | `src/components/business/admin/users-inspector-panel.tsx` | rediseñar | baja | `admin/users/page.tsx` |
| `legacy/business/web/src/components/admin/evolution/TenantsEditor.jsx` | `src/app/(platform)/app/admin/page.tsx` | rediseñar | media | `Tenant`, `Membership`, métricas admin |
| `legacy/business/web/src/hooks/admin/useCatalogManager.js` | `src/server/services/catalog.ts` | refactor | alta | `Product`, `Category`, assets y pricing |
| `legacy/business/web/src/utils/stock.js` | `src/lib/business/stock.ts` | copiar | alta | `Product` |
| `legacy/business/web/src/utils/priceVisibility.js` | `src/lib/business/price-visibility.ts` | copiar | media | `PriceList`, `UserPriceProfile` |
| `legacy/business/web/src/utils/productImage.js` | `src/lib/business/product-image.ts` | copiar | media | storage de assets |
| `legacy/business/web/src/utils/shipping.js` | `src/lib/business/shipping.ts` | refactor | alta | `ShippingZone` o equivalente en schema |
| `legacy/business/web/src/utils/billing.js` | `src/lib/business/billing.ts` | rediseñar | media | `Payment`, `TenantSubscription` |
| `legacy/business/server/src/services/pricing.js` | `src/lib/business/pricing.ts` | copiar | alta | `PriceList`, `Offer` |
| `legacy/business/server/src/services/offers.js` | `src/lib/business/offers.ts` | copiar | alta | `Offer`, `ProductOverride` |
| `legacy/business/server/src/services/shipping.js` | `src/server/services/shipping.ts` | refactor | alta | `src/lib/business/shipping.ts` |
| `legacy/business/server/src/services/userPricing.js` | `src/server/services/user-pricing.ts` | refactor | media | `PriceList`, `UserPriceProfile` |
| `legacy/business/server/src/services/user-pricing.js` | `src/server/services/user-pricing.ts` | rediseñar | baja | consolidar duplicado con `userPricing.js` |
| `legacy/business/server/src/services/mailer.js` | `src/server/services/contact-email.ts` | refactor | media | plantillas de email unificadas |
| `legacy/business/server/src/routes/orders.js` | `src/server/services/orders.ts` | refactor | alta | `Order`, `OrderItem`, `Payment`, `shipping`, `pricing` |
| `legacy/business/server/src/routes/checkout.js` | `src/server/services/checkout.ts` | refactor | alta | `orders.ts`, `pricing.ts` |
| `legacy/business/server/src/routes/integrations.js` | `src/server/services/business-integrations.ts` | refactor | media | `src/lib/integrations/*`, `ErpConnection`, `SyncJob` |
| `legacy/business/server/src/routes/admin.js` | `src/server/queries/admin-commerce.ts` | refactor | media | `schema de catálogo`, `Tenant` |
| `legacy/business/server/src/middleware/apiKey.js` | `src/lib/integrations/api-auth.ts` | refactor | media | `ApiToken` en schema |
| `legacy/business/db/schema.sql` (`product_cache`, `categories`, `product_categories`, `product_collections`, `collection_items`, `product_overrides`, `product_reviews`) | `prisma/schema.prisma` | refactor | alta | paquete `business-storefront` y modelo catálogo |
| `legacy/business/db/schema.sql` (`orders`, `order_items`, `payments`, `price_lists`, `user_price_list`, `tenant_offers`) | `prisma/schema.prisma` | refactor | alta | `pricing.ts`, `orders.ts`, `checkout.ts` |
| `legacy/business/db/schema.sql` (`erp_connections`, `sync_jobs`, `webhook_events`, `api_tokens`) | `prisma/schema.prisma` | refactor | media | `src/lib/integrations/*`, auditoría de integraciones |

## 3. labs-automation-ai

| legacy_path | destino_en_vase | tipo_de_migracion | prioridad | dependencia |
| --- | --- | --- | --- | --- |
| `legacy/labs/app/admin/training/page.tsx` | `src/app/(platform)/app/owner/labs/training/page.tsx` | refactor | alta | `src/components/labs/training-job-form.tsx`, `TenantAiWorkspace` |
| `legacy/labs/app/admin/services/page.tsx` | `src/app/(platform)/app/owner/labs/services/page.tsx` | refactor | alta | `ServiceOffering` en schema |
| `legacy/labs/app/admin/appointments/page.tsx` | `src/app/(platform)/app/owner/labs/appointments/page.tsx` | refactor | alta | `Appointment`, `ClientContact`, `AvailabilityRule` |
| `legacy/labs/app/admin/availability/page.tsx` | `src/app/(platform)/app/owner/labs/availability/page.tsx` | refactor | alta | `AvailabilityRule`, `TrainerAgentProfile` |
| `legacy/labs/app/admin/blocks/page.tsx` | `src/app/(platform)/app/owner/labs/blocks/page.tsx` | refactor | media | `ScheduleBlock` |
| `legacy/labs/app/admin/history/page.tsx` | `src/app/(platform)/app/owner/labs/history/page.tsx` | rediseñar | media | `AiConversation`, auditoría de eventos |
| `legacy/labs/app/admin/connection/page.tsx` | `src/app/(platform)/app/owner/labs/channels/page.tsx` | refactor | alta | `src/components/labs/channel-connection-form.tsx`, `src/lib/integrations/whatsapp.ts` |
| `legacy/labs/app/admin/components/assistant-panel.tsx` | `src/components/labs/assistant-panel.tsx` | copiar | media | `src/server/services/labs-ai.ts` |
| `legacy/labs/lib/openai.ts` | `src/server/services/labs-ai.ts` | refactor | alta | secretos IA y `TenantAiWorkspace` |
| `legacy/labs/lib/bot-logic.ts` | `src/server/services/labs-bot.ts` | refactor | alta | `labs-ai.ts`, `whatsapp.ts`, queries de agenda |
| `legacy/labs/lib/bot-loader.ts` | `src/lib/integrations/whatsapp-bot-loader.ts` | refactor | media | `src/lib/integrations/whatsapp.ts` |
| `legacy/labs/lib/whatsapp.ts` | `src/lib/integrations/whatsapp.ts` | copiar | alta | ninguna |
| `legacy/labs/lib/qr-store.ts` | `src/lib/integrations/whatsapp-qr-store.ts` | refactor | baja | estrategia final de conexión por canal |
| `legacy/labs/lib/onboarding-utils.ts` | `src/lib/labs/onboarding-utils.ts` | refactor | media | onboarding actual de auth |
| `legacy/labs/app/api/whatsapp/webhook/route.ts` | `src/app/api/v1/channels/whatsapp/webhook/route.ts` | refactor | alta | `src/lib/integrations/whatsapp.ts`, `src/server/services/labs-bot.ts` |
| `legacy/labs/app/api/ai/chat/route.ts` | `src/app/api/v1/labs/assistant/chat/route.ts` | refactor | alta | `src/server/services/labs-ai.ts` |
| `legacy/labs/app/api/ai/scrape/route.ts` | `src/app/api/v1/labs/knowledge/scrape/route.ts` | refactor | media | `AiKnowledgeItem`, crawler o fetch seguro |
| `legacy/labs/app/api/admin/knowledge/route.ts` | `src/app/api/v1/labs/knowledge/upload/route.ts` | refactor | alta | storage + `AiTrainingJob` |
| `legacy/labs/app/api/admin/rules/route.ts` | `src/app/api/v1/labs/availability/rules/route.ts` | refactor | alta | `AvailabilityRule` |
| `legacy/labs/app/api/admin/blocks/route.ts` | `src/app/api/v1/labs/availability/blocks/route.ts` | refactor | media | `ScheduleBlock` |
| `legacy/labs/app/api/admin/create-staff-user/route.ts` | `src/app/api/v1/labs/staff/create/route.ts` | rediseñar | baja | auth multi-tenant y `Membership` |
| `legacy/labs/app/api/auth/login/route.ts` | `src/app/(auth)/actions.ts` | rediseñar | baja | auth actual ya existente |
| `legacy/labs/app/api/auth/complete-signup/route.ts` | `src/app/(auth)/actions.ts` | rediseñar | baja | onboarding actual ya existente |
| `legacy/labs/app/api/verification/send-otp/route.ts` | `src/app/api/v1/auth/verification/send-otp/route.ts` | rediseñar | baja | estrategia real de verificación |
| `legacy/labs/app/api/verification/verify-otp/route.ts` | `src/app/api/v1/auth/verification/verify-otp/route.ts` | rediseñar | baja | `send-otp` |
| `legacy/labs/lib/types.ts` (`trainers`, `availability_rules`, `blocks`, `clients`, `appointments`, `conversations`, `ai_settings`, `class_records`) | `prisma/schema.prisma` | refactor | alta | modelo final de agenda, canales e IA |
| `legacy/labs/app/admin/login/page.tsx` | `src/app/(auth)/login/page.tsx` | rediseñar | baja | auth actual ya existente |

## 4. support-operations

| legacy_path | destino_en_vase | tipo_de_migracion | prioridad | dependencia |
| --- | --- | --- | --- | --- |
| `legacy/labs/components/SupportWidget.tsx` | `src/components/support/support-widget.tsx` | refactor | alta | `src/app/api/v1/support/chat/route.ts` |
| `legacy/labs/components/modal-portal.tsx` | `src/components/ui/modal-portal.tsx` | copiar | baja | ninguna |
| `legacy/labs/app/support/page.tsx` | `src/app/(platform)/app/support/page.tsx` | refactor | alta | `src/server/queries/support.ts`, `SupportMessage` |
| `legacy/labs/app/support/kb/page.tsx` | `src/app/(platform)/app/support/kb/page.tsx` | refactor | media | `AiKnowledgeItem`, `support queries` |
| `legacy/labs/app/support/layout.tsx` | `src/app/(platform)/app/support/layout.tsx` | rediseñar | media | navegación actual del panel |
| `legacy/labs/app/super-admin/support-tickets/page.tsx` | `src/app/(platform)/app/support/queue/page.tsx` | refactor | alta | `src/server/queries/support.ts`, `SupportTicket`, `SupportMessage` |
| `legacy/labs/app/super-admin/users/page.tsx` | `src/app/(platform)/app/admin/users/page.tsx` | rediseñar | media | `User`, `Tenant`, `Membership` |
| `legacy/labs/app/super-admin/settings/page.tsx` | `src/app/(platform)/app/admin/settings/page.tsx` | rediseñar | baja | configuración central multi-tenant |
| `legacy/labs/app/super-admin/kb/page.tsx` | `src/app/(platform)/app/support/kb/page.tsx` | refactor | media | `AiKnowledgeItem`, permisos support/admin |
| `legacy/labs/app/super-admin/layout.tsx` | `src/app/(platform)/app/admin/layout.tsx` | rediseñar | baja | layout real del panel actual |
| `legacy/labs/app/api/support/chat/route.ts` | `src/app/api/v1/support/chat/route.ts` | refactor | alta | `src/server/services/support.ts`, `src/server/services/labs-ai.ts` |
| `legacy/labs/app/api/support/chatbot/route.ts` | `src/app/api/v1/support/chatbot/route.ts` | refactor | media | `src/server/services/support.ts` |
| `legacy/labs/app/api/ai/chat/route.ts` | `src/app/api/v1/support/internal-assistant/route.ts` | refactor | media | `support queries`, `labs-ai.ts` |
| `legacy/labs/app/support/page.tsx` (lectura de `support_tickets` y `support_messages`) | `src/server/queries/support.ts` | refactor | alta | `SupportTicket`, `SupportMessage` |
| `legacy/labs/app/super-admin/support-tickets/page.tsx` (merge de perfiles y cola) | `src/server/queries/support-admin.ts` | refactor | media | `User`, `Tenant`, `Membership`, `SupportTicket` |
| `legacy/labs/app/support/page.tsx` (respuestas humanas y resolución) | `src/server/services/support.ts` | refactor | alta | `src/server/queries/support.ts` |
| `legacy/labs/app/api/support/chat/route.ts` (prompt y KB de soporte) | `src/server/services/support-ai.ts` | refactor | media | `AiKnowledgeItem`, `labs-ai.ts` |
| `legacy/labs/app/super-admin/support-tickets/page.tsx` (métricas de cola) | `src/server/queries/operations.ts` | refactor | media | `SupportTicket`, eventos de soporte |
| `legacy/labs/lib/types.ts` (`support_tickets`, `support_messages`, `profiles`) | `prisma/schema.prisma` | refactor | alta | ampliación del modelo actual de soporte |

## Orden sugerido de ejecución

1. `business-storefront`
2. `business-commerce`
3. `labs-automation-ai`
4. `support-operations`

## Dependencias transversales críticas

| dependencia | impacto |
| --- | --- |
| `prisma/schema.prisma` | desbloquea catálogo, commerce, agenda, canales y soporte persistente |
| `src/server/queries/storefront.ts` | desbloquea bloques storefront, preview y personalización |
| `src/server/services/catalog.ts` | desbloquea catálogo, pricing, checkout y órdenes |
| `src/lib/integrations/whatsapp.ts` | desbloquea canales, bot y automatización Labs |
| `src/server/services/labs-ai.ts` | desbloquea entrenamiento IA, chat interno y soporte asistido |
| `src/server/queries/support.ts` | desbloquea widget, consola de soporte y cola operativa |
