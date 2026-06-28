import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { pool } from '../db.js';
import {
  ensureUserProfileSchema,
  normalizeBillingInfo,
  normalizeProfileFields,
  profileColumnsToSelect,
} from '../services/userProfile.js';

export const meRouter = express.Router();

meRouter.put('/profile', async (req, res, next) => {
  try {
    await ensureUserProfileSchema();
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const profile = normalizeProfileFields(req.body || {});
    const displayName = req.body?.name != null
      ? (String(req.body.name).trim().slice(0, 120) || null)
      : undefined;
    const billingInfo = req.body?.billing_info !== undefined
      ? normalizeBillingInfo(req.body.billing_info)
      : undefined;

    const setParts = [];
    const values = [userId];
    let idx = 2;

    const setFieldCoalesce = (column, value) => {
      setParts.push(`${column} = coalesce($${idx}, ${column})`);
      values.push(value);
      idx += 1;
    };
    const setFieldOverride = (column, value) => {
      setParts.push(`${column} = $${idx}`);
      values.push(value);
      idx += 1;
    };

    if (displayName !== undefined) setFieldOverride('display_name', displayName);
    setFieldCoalesce('phone', profile.phone);
    setFieldCoalesce('address', profile.address);
    setFieldCoalesce('address_extra', profile.address_extra);
    setFieldCoalesce('country_code', profile.country_code);
    setFieldCoalesce('country_label', profile.country_label);
    setFieldCoalesce('province', profile.province);
    setFieldCoalesce('city', profile.city);
    setFieldCoalesce('postal_code', profile.postal_code);
    setFieldCoalesce('business_name', profile.business_name);
    setFieldCoalesce('business_activity', profile.business_activity);
    setFieldCoalesce('cuil', profile.cuil);

    if (billingInfo !== undefined) {
      if (billingInfo === null && req.body?.billing_info !== null) {
        return res.status(400).json({ error: 'invalid_billing_info' });
      }
      setFieldOverride('billing_info', billingInfo || {});
    }

    if (!setParts.length) {
      return res.status(400).json({ error: 'no_fields' });
    }

    const updateRes = await pool.query(
      `update users set ${setParts.join(', ')}
       where id = $1
       returning id, email, role, status, display_name, ${profileColumnsToSelect()}`,
      values
    );

    if (!updateRes.rowCount) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    return res.json({ user: updateRes.rows[0] });
  } catch (err) {
    return next(err);
  }
});

const PROFILE_UPLOAD_DIR = 'uploads/profiles/';
fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PROFILE_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = /^\.(jpg|jpeg|png|webp)$/i.test(ext) ? ext : '.jpg';
    cb(null, `${req.user.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const okExt = allowed.test(path.extname(file.originalname || '').toLowerCase());
    const okMime = allowed.test(file.mimetype || '');
    if (okExt && okMime) {
      cb(null, true);
    } else {
      cb(new Error('invalid_photo_type'));
    }
  },
});

meRouter.post('/photo', photoUpload.single('photo'), async (req, res, next) => {
  try {
    await ensureUserProfileSchema();
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'photo_required' });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    const previousRes = await pool.query(
      'select photo_url from users where id = $1',
      [userId]
    );
    const previousPhoto = previousRes.rows[0]?.photo_url || null;

    await pool.query('update users set photo_url = $2 where id = $1', [userId, photoUrl]);

    if (previousPhoto && previousPhoto.startsWith('/uploads/profiles/')) {
      const prevPath = path.join(process.cwd(), previousPhoto.replace(/^\//, ''));
      fs.unlink(prevPath, () => {}); // best-effort cleanup
    }

    return res.json({ photo_url: photoUrl });
  } catch (err) {
    return next(err);
  }
});

meRouter.use((err, req, res, next) => {
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.message === 'invalid_photo_type')) {
    return res.status(400).json({
      error: 'invalid_photo',
      details: 'La foto debe ser JPG/PNG/WebP de hasta 5 MB',
    });
  }
  return next(err);
});
