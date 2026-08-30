import assert from 'node:assert/strict';
import test from 'node:test';

const responseModule = await import('../src/utils/saveResponse.js').catch(() => null);

test('el guardado conserva details y el origen de un error JSON', async () => {
    assert.ok(responseModule, 'saveResponse.js debe existir');

    const result = await responseModule.readSaveFailure(
        new Response(JSON.stringify({ code: 'invalid_settings', details: 'Color invalido' }), {
            status: 422,
            headers: { 'content-type': 'application/json' },
        }),
        'configuracion'
    );

    assert.equal(result.code, 'invalid_settings');
    assert.equal(result.details, 'Color invalido');
    assert.equal(result.operation, 'configuracion');
});

test('el guardado usa error JSON cuando no hay details', async () => {
    assert.ok(responseModule, 'saveResponse.js debe existir');

    const result = await responseModule.readSaveFailure(
        new Response(JSON.stringify({ error: 'page_not_found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' },
        }),
        'pagina Inicio'
    );

    assert.match(result.details, /page_not_found/);
    assert.equal(result.operation, 'pagina Inicio');
});

test('el guardado conserva respuestas de texto', async () => {
    assert.ok(responseModule, 'saveResponse.js debe existir');

    const result = await responseModule.readSaveFailure(
        new Response('Servicio temporalmente no disponible', { status: 503 }),
        'publicacion'
    );

    assert.match(result.details, /Servicio temporalmente no disponible/);
    assert.equal(result.code, 'save_http_503');
});
