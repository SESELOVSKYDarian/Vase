import assert from 'node:assert/strict';
import test from 'node:test';
import { createRateLimiter } from './rateLimit.js';

function run(limiter, req) {
  let status = 200;
  let passed = false;
  const res = { setHeader() {}, status(code) { status = code; return { json() {} }; } };
  limiter(req, res, () => { passed = true; });
  return { status, passed };
}

test('deja pasar hasta el máximo y después frena hasta que pasa el tiempo', () => {
  let time = 1_000;
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3, keyOf: (req) => req.body.email, now: () => time });
  const req = { ip: '1.1.1.1', body: { email: 'A@x.com' } };
  for (let i = 0; i < 3; i += 1) assert.equal(run(limiter, req).passed, true);
  assert.equal(run(limiter, req).status, 429);
  // otro correo o otra IP no quedan frenados
  assert.equal(run(limiter, { ip: '1.1.1.1', body: { email: 'b@x.com' } }).passed, true);
  assert.equal(run(limiter, { ip: '2.2.2.2', body: { email: 'a@x.com' } }).passed, true);
  time += 61_000;
  assert.equal(run(limiter, req).passed, true);
});
