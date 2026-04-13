import express from 'express';
import { pool } from '../db.js';

export const webhooksRouter = express.Router();

webhooksRouter.post('/payments', async (req, res, next) => {
  try {
    const eventType = String(req.query.type || req.body.type || 'payment');
    await pool.query(
      'insert into webhook_events (event_type, payload) values ($1, $2::jsonb)',
      [eventType, req.body || {}]
    );
    return res.sendStatus(200);
  } catch (err) {
    return next(err);
  }
});
