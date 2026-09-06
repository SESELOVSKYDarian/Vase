import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('el shell evolution conserva acciones y usa dock contextual', async () => {
    const [canvas, dock, sections, layout] = await Promise.all([
        read('../src/components/admin/evolution/EvolutionCanvas.jsx'),
        read('../src/components/admin/evolution/EvolutionCommandDock.jsx'),
        read('../src/components/admin/evolution/PageSectionsEditor.jsx'),
        read('../src/components/admin/evolution/EvolutionLayout.jsx'),
    ]);

    for (const action of ['onSave', 'onUndo', 'onRedo', 'openPreview', 'openDomainCenter']) {
        assert.match(canvas, new RegExp(action));
    }
    for (const label of ['Páginas', 'Bloques', 'Agregar']) {
        assert.match(dock, new RegExp(label));
    }
    for (const handler of ['handleAddSection', 'handleDeleteSection', 'handleToggleEnabled', 'handleDrop']) {
        assert.match(sections, new RegExp(handler));
    }
    assert.match(sections, /PageBuilder sections=\{previewSections\}/);
    assert.match(layout, /CommandPalette/);
});

test('la identidad del editor es multiempresa', async () => {
    const identity = await read('../src/components/admin/evolution/EvolutionTenantIdentity.jsx');
    assert.match(identity, /branding/);
    assert.doesNotMatch(identity, /Piquim|piquim/);
});

test('el editor general de apariencia no expone controles exclusivos de Piquim', async () => {
    const appearance = await read('../src/components/admin/evolution/AppearanceEditor.jsx');
    assert.doesNotMatch(appearance, /Catalogo Piquim|catalogImageUploading|handleCatalogCardImageUpload/);
});

test('el rail conserva todos los modulos administrativos', async () => {
    const sidebar = await read('../src/components/admin/evolution/EvolutionSidebar.jsx');
    for (const moduleId of [
        'home', 'about', 'appearance', 'catalog', 'categories', 'pricing',
        'checkout', 'shipping', 'notifications', 'integrations', 'users', 'seo',
    ]) {
        assert.match(sidebar, new RegExp(`id: '${moduleId}'`));
    }
});

test('el store limita sus cambios nuevos a estado visual', async () => {
    const store = await read('../src/store/useEvolutionStore.js');
    for (const token of [
        'activeDockPanel', 'previewViewport', 'setActiveDockPanel',
        'closeDockPanel', 'setPreviewViewport',
    ]) {
        assert.match(store, new RegExp(token));
    }
});

test('el selector responsive usa un viewport real y conserva las acciones avanzadas', async () => {
    const [canvas, sections, frame, actions] = await Promise.all([
        read('../src/components/admin/evolution/EvolutionCanvas.jsx'),
        read('../src/components/admin/evolution/PageSectionsEditor.jsx'),
        read('../src/components/admin/evolution/ResponsivePreviewFrame.jsx').catch(() => ''),
        read('../src/components/admin/evolution/EvolutionActionsMenu.jsx'),
    ]);

    assert.match(sections, /<ResponsivePreviewFrame viewport=\{previewViewport\}>/);
    assert.match(frame, /createPortal/);
    assert.match(frame, /390px/);
    assert.match(frame, /834px/);
    assert.match(frame, /100%/);
    assert.match(frame, /Vista responsive del sitio/);

    assert.doesNotMatch(canvas, />\s*Previsualizar\s*</);
    assert.doesNotMatch(canvas, />\s*Publicar\s*</);
    assert.match(canvas, /onPreview=\{openPreview\}/);
    assert.match(canvas, /onPublish=\{\(\) => openDomainCenter\('publish'\)\}/);
    assert.match(actions, /Previsualizar/);
    assert.match(actions, /Publicar/);
});

test('la barra superior deja busqueda, mas y perfil y concentra las acciones', async () => {
    const [canvas, actions] = await Promise.all([
        read('../src/components/admin/evolution/EvolutionCanvas.jsx'),
        read('../src/components/admin/evolution/EvolutionActionsMenu.jsx'),
    ]);

    assert.doesNotMatch(canvas, /<EvolutionTenantIdentity/);
    assert.doesNotMatch(canvas, /<CheckCircle/);
    assert.doesNotMatch(canvas, /onClick=\{onSave\}/);
    assert.match(canvas, /aria-label="Mas acciones"/);
    assert.match(canvas, /onUndo=\{onUndo\}/);
    assert.match(canvas, /onNotifications=/);

    for (const label of [
        'Guardar', 'Deshacer', 'Rehacer', 'Inspector', 'Notificaciones',
        'Ver cliente', 'Previsualizar', 'Publicar', 'Dominios',
    ]) {
        assert.match(actions, new RegExp(label));
    }
});

test('el panel de bloques se puede mover en escritorio y permanece centrado en celular', async () => {
    const [sections, floatingPanel] = await Promise.all([
        read('../src/components/admin/evolution/PageSectionsEditor.jsx'),
        read('../src/components/admin/evolution/DraggableFloatingPanel.jsx').catch(() => ''),
    ]);

    assert.match(sections, /<DraggableFloatingPanel/);
    assert.match(sections, /ariaLabel="Panel de bloques"/);
    assert.match(floatingPanel, /onPointerDown/);
    assert.match(floatingPanel, /setPointerCapture/);
    assert.match(floatingPanel, /Math\.min/);
    assert.match(floatingPanel, /Math\.max/);
    assert.match(floatingPanel, /matchMedia/);
    assert.match(floatingPanel, /md:/);
});

test('el catalogo evolution es compacto y el inspector no se superpone en escritorio', async () => {
    const [catalog, inspector, catalogInspector] = await Promise.all([
        read('../src/components/admin/evolution/CatalogEditor.jsx'),
        read('../src/components/admin/evolution/EvolutionInspector.jsx'),
        read('../src/components/admin/evolution/CatalogInspectorPanel.jsx'),
    ]);

    assert.match(catalog, /repeat\(auto-fill,minmax\(190px,1fr\)\)/);
    assert.match(catalog, /h-\[148px\]/);
    assert.match(catalog, /object-contain/);
    assert.match(inspector, /useState\(true\)/);
    assert.match(inspector, /2xl:relative/);
    assert.match(catalogInspector, /space-y-3/);
});
