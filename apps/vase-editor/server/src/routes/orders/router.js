// Los dos routers de pedidos: el de la tienda y el del panel. Ambos resuelven primero de qué tienda es el pedido.
import express from 'express';
import { resolveTenant } from '../../middleware/tenant.js';

export const ordersRouter = express.Router();
export const adminOrdersRouter = express.Router();

ordersRouter.use(resolveTenant);
adminOrdersRouter.use(resolveTenant);
