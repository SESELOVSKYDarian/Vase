// El código está repartido por tema en la carpeta auth/. Este archivo solo lo junta.
// partes: ./auth/validate-signup-payload.js, ./auth/issue-email-login-code.js, ./auth/handle-signup.js, ./auth/routes-post-login.js, ./auth/routes-post-verify-email.js
import './auth/routes-post-login.js';
import './auth/routes-post-verify-email.js';

export { authRouter } from './auth/validate-signup-payload.js';
export { getMeHandler } from './auth/handle-signup.js';
