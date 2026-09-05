import assert from 'node:assert/strict';
import test from 'node:test';

const mailConfig = await import('./mailConfig.js').catch(() => null);

test('prioriza SMTP generico del tenant sobre Gmail heredado', () => {
  assert.ok(mailConfig, 'mailConfig.js debe existir');
  const config = mailConfig.resolveMailConfig({
    smtp_host: 'mail.example.com', smtp_port: 465, smtp_secure: true,
    smtp_user: 'ops@example.com', smtp_password: 'secret', smtp_from: 'ops@example.com',
    gmail_sender_email: 'legacy@gmail.com', gmail_app_password: 'legacy-secret',
  }, {});
  assert.equal(config.host, 'mail.example.com');
  assert.equal(config.user, 'ops@example.com');
  assert.equal(config.pass, 'secret');
});

test('usa Gmail heredado cuando faltan credenciales SMTP genericas', () => {
  assert.ok(mailConfig, 'mailConfig.js debe existir');
  const config = mailConfig.resolveMailConfig({ gmail_sender_email: 'legacy@gmail.com', gmail_app_password: 'secret' }, {});
  assert.equal(config.host, 'smtp.gmail.com');
  assert.equal(config.port, 465);
  assert.equal(config.secure, true);
});

test('usa variables globales solo como ultimo fallback', () => {
  assert.ok(mailConfig, 'mailConfig.js debe existir');
  const config = mailConfig.resolveMailConfig({}, { SMTP_HOST: 'smtp.global.test', SMTP_PORT: '587', SMTP_SECURE: 'false', SMTP_USER: 'global@test.com', SMTP_PASS: 'secret', SMTP_FROM: 'global@test.com' });
  assert.equal(config.host, 'smtp.global.test');
  assert.equal(config.secure, false);
});
