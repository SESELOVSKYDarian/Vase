-- Ensure the Admin commercial editor has the canonical Vase Labs catalog.
-- This is idempotent and repairs deployments where the application seed was
-- never executed or where the catalog rows were left inactive.

INSERT INTO `Module`
  (`id`, `name`, `description`, `product`, `route`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  (
    'vase_labs',
    'vase_labs',
    'IA, conocimiento, canales conversacionales, automatizacion y escalamiento a soporte humano.',
    'LABS',
    '/app/labs',
    TRUE,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  )
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `product` = VALUES(`product`),
  `route` = VALUES(`route`),
  `isActive` = TRUE,
  `updatedAt` = CURRENT_TIMESTAMP(3);

INSERT INTO `ModuleSubmodule`
  (`id`, `moduleId`, `key`, `name`, `description`, `route`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  (
    'vase-labs-starter',
    'vase_labs',
    'starter',
    'Starter',
    '1 canal de WhatsApp.',
    '/app/labs/starter',
    TRUE,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'vase-labs-pro',
    'vase_labs',
    'pro',
    'Pro',
    '1 canal de WhatsApp + 1 canal de Instagram.',
    '/app/labs/pro',
    TRUE,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'vase-labs-growth',
    'vase_labs',
    'growth',
    'Growth',
    '1 canal de WhatsApp + 1 canal de Instagram + 1 canal de Facebook Messenger.',
    '/app/labs/growth',
    TRUE,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  )
ON DUPLICATE KEY UPDATE
  `moduleId` = VALUES(`moduleId`),
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `route` = VALUES(`route`),
  `isActive` = TRUE,
  `updatedAt` = CURRENT_TIMESTAMP(3);
