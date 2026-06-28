import { pool } from '../db.js';

let schemaPromise = null;

export async function ensureUserProfileSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await pool.query("alter table users add column if not exists display_name text");
    await pool.query("alter table users add column if not exists phone text");
    await pool.query("alter table users add column if not exists address text");
    await pool.query("alter table users add column if not exists address_extra text");
    await pool.query("alter table users add column if not exists country_code text");
    await pool.query("alter table users add column if not exists country_label text");
    await pool.query("alter table users add column if not exists province text");
    await pool.query("alter table users add column if not exists city text");
    await pool.query("alter table users add column if not exists postal_code text");
    await pool.query("alter table users add column if not exists photo_url text");
    await pool.query("alter table users add column if not exists billing_info jsonb not null default '{}'::jsonb");
    await pool.query("alter table users add column if not exists business_name text");
    await pool.query("alter table users add column if not exists business_activity text");
    await pool.query("alter table users add column if not exists cuil text");
  })();
  return schemaPromise;
}

const trim = (v) => (v == null ? null : String(v).trim() || null);
const trimMax = (v, max) => {
  const t = trim(v);
  return t == null ? null : t.slice(0, max);
};

export function normalizeProfileFields(input = {}) {
  return {
    phone: trimMax(input.phone, 60),
    address: trimMax(input.address, 240),
    address_extra: trimMax(input.address_extra ?? input.addressExtra, 120),
    country_code: trimMax(input.country_code ?? input.countryCode, 8),
    country_label: trimMax(input.country_label ?? input.countryLabel, 80),
    province: trimMax(input.province, 120),
    city: trimMax(input.city, 120),
    postal_code: trimMax(input.postal_code ?? input.postalCode, 20),
    business_name: trimMax(input.business_name ?? input.businessName ?? input.company, 180),
    business_activity: trimMax(input.business_activity ?? input.businessActivity, 180),
    cuil: trimMax(input.cuil ?? input.cuit, 40),
  };
}

export function normalizeBillingInfo(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value;
}

export function profileColumnsToSelect() {
  return [
    'phone',
    'address',
    'address_extra',
    'country_code',
    'country_label',
    'province',
    'city',
    'postal_code',
    'photo_url',
    'billing_info',
    'business_name',
    'business_activity',
    'cuil',
  ].join(', ');
}
