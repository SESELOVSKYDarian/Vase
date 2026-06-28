import { pool } from '../db.js';
import { buildProductSyncCompatibilitySecret } from '../services/integrationManifest.js';

const readApiKeyFromRequest = (req) => {
    const headerKey = String(req.get('x-api-key') || req.query.api_key || '').trim();
    if (headerKey) return headerKey;

    const authHeader = String(req.get('authorization') || '').trim();
    if (/^bearer\s+/i.test(authHeader)) {
        return authHeader.replace(/^bearer\s+/i, '').trim();
    }

    return '';
};

const readBasicAuthCredentials = (req) => {
    const authHeader = String(req.get('authorization') || '').trim();
    if (!/^basic\s+/i.test(authHeader)) {
        return { username: '', password: '' };
    }

    try {
        const encoded = authHeader.replace(/^basic\s+/i, '').trim();
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const separatorIndex = decoded.indexOf(':');
        if (separatorIndex < 0) {
            return { username: '', password: '' };
        }

        return {
            username: decoded.slice(0, separatorIndex).trim(),
            password: decoded.slice(separatorIndex + 1).trim(),
        };
    } catch (err) {
        return { username: '', password: '' };
    }
};

const readConsumerCredentialsFromRequest = (req) => {
    const basic = readBasicAuthCredentials(req);
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    const consumerKey = String(
        req.get('x-consumer-key') ||
        req.query.consumer_key ||
        req.query.consumerKey ||
        body.consumer_key ||
        body.consumerKey ||
        basic.username ||
        ''
    ).trim();

    const consumerSecret = String(
        req.get('x-consumer-secret') ||
        req.query.consumer_secret ||
        req.query.consumerSecret ||
        body.consumer_secret ||
        body.consumerSecret ||
        basic.password ||
        ''
    ).trim();

    return { consumerKey, consumerSecret };
};

const findApiTokenByValue = async (apiKey) => {
    const result = await pool.query(
        'select id, tenant_id, name, scope, token_hash from api_tokens where token_hash = $1',
        [apiKey]
    );

    return result.rows[0] || null;
};

const parseScopeTokens = (scopeValue) =>
    String(scopeValue || '')
        .split(/[,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);

export const validateApiKey = async (req, res, next) => {
    const apiKey = readApiKeyFromRequest(req);

    if (!apiKey) {
        return res.status(401).json({ error: 'api_key_required' });
    }

    try {
        const tokenRecord = await findApiTokenByValue(apiKey);

        if (!tokenRecord) {
            return res.status(403).json({ error: 'invalid_api_key' });
        }

        req.apiKey = tokenRecord;
        req.tenantId = req.apiKey.tenant_id;
        next();
    } catch (err) {
        next(err);
    }
};

export const validateCompatibilityConsumerCredentials = async (req, res, next) => {
    const { consumerKey, consumerSecret } = readConsumerCredentialsFromRequest(req);

    if (!consumerKey) {
        return res.status(401).json({ error: 'consumer_key_required' });
    }

    if (!consumerSecret) {
        return res.status(401).json({ error: 'consumer_secret_required' });
    }

    try {
        const tokenRecord = await findApiTokenByValue(consumerKey);
        if (!tokenRecord) {
            return res.status(403).json({ error: 'invalid_consumer_key' });
        }

        const expectedSecret = buildProductSyncCompatibilitySecret({
            tenantId: tokenRecord.tenant_id,
            tokenValue: tokenRecord.token_hash,
        });

        if (!expectedSecret || expectedSecret !== consumerSecret) {
            return res.status(403).json({ error: 'invalid_consumer_secret' });
        }

        req.apiKey = tokenRecord;
        req.tenantId = tokenRecord.tenant_id;
        req.integrationAuthMode = 'consumer_key_secret';
        return next();
    } catch (err) {
        return next(err);
    }
};

export const requireApiScope = (expectedScope) => (req, res, next) => {
    const currentScope = String(req.apiKey?.scope || '').trim();
    const currentScopes = parseScopeTokens(currentScope);

    if (!currentScopes.length) {
        return res.status(403).json({ error: 'api_scope_required' });
    }

    if (
        currentScopes.includes('*') ||
        currentScopes.includes(expectedScope)
    ) {
        return next();
    }

    return res.status(403).json({
        error: 'insufficient_api_scope',
        required_scope: expectedScope,
    });
};
