import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { blockLabel, blockSummary, createBlock, editorPageKey, moveBlock, removeBlock, replaceBlock, toggleBlock } from '../src/panel/diseno/model.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('nombres de bloques en castellano, también los de Piquim', () => {
    assert.equal(editorPageKey('home', true), 'piquim-home');
    assert.equal(editorPageKey('about', false), 'about');
    assert.equal(blockLabel('piquim-home', 'PiquimHero'), 'Portada con video');
    assert.equal(blockLabel('home', 'FeaturedProducts'), 'Productos destacados');
    assert.equal(blockLabel('home', 'BloqueRaro'), 'Bloque Raro');
    assert.equal(blockSummary({ props: { title: '<b>Hola</b> mundo' } }), 'Hola mundo');
});

test('agregar, mover, ocultar, reemplazar y quitar bloques', () => {
    const template = { type: 'AboutHero', props: { title: 'Nosotros' } };
    const block = createBlock('AboutHero', [template]);
    assert.equal(block.props.title, 'Nosotros');
    assert.notEqual(block.props, template.props); // copia, no la plantilla
    assert.equal(block.enabled, true);
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    assert.deepEqual(moveBlock(list, 0, 2).map((item) => item.id), ['b', 'c', 'a']);
    assert.equal(moveBlock(list, 0, 5), list);
    assert.equal(toggleBlock(list, 'b')[1].enabled, false);
    assert.equal(replaceBlock(list, { id: 'b', x: 1 })[1].x, 1);
    assert.deepEqual(removeBlock(list, 'a').map((item) => item.id), ['b', 'c']);
});

test('Diseño de la tienda ya es del panel nuevo y adapta los formularios anteriores al tema', async () => {
    const app = await read('../src/panel/PanelApp.jsx');
    assert.match(app, /section === 'diseno' && !editor\.loading\) \{\s*fullScreen = \(\s*<Diseno/);
    assert.match(app, /section === 'diseno' \? null : \(\s*<Topbar/);
    const screen = await read('../src/panel/diseno/Diseno.jsx');
    assert.match(screen, /<BlockInspector/);
    const inspector = await read('../src/panel/diseno/BlockInspector.jsx');
    assert.match(inspector, /<BlockPropertiesEditor/);
    assert.match(inspector, /INSPECTOR_TABS/);
    assert.match(screen, /<StorePreview settings=\{settings\} sections=\{previewSections\}/);
    assert.match(screen, /aria-label="Cerrar el editor"/);
    assert.match(screen, /aria-label="Cerrar los bloques"/);
    const preview = await read('../src/panel/diseno/StorePreview.jsx');
    assert.match(preview, /addEventListener\(\'click\', pick, true\)/);
    assert.match(preview, /<Header /);
    assert.match(preview, /<Footer \/>/);
    const css = await read('../src/panel/diseno/diseno.css');
    assert.match(css, /\.vp \.vp-legacy \.text-white/);
    assert.match(css, /\.vp \.vp-legacy \.border-white\\\/10/);
});

test('menú de arriba y pie: links y valores de la plantilla', async () => {
    const { navLinksFromSettings, footerValues, linksSummary } = await import('../src/panel/diseno/chrome.js');
    assert.deepEqual(navLinksFromSettings({}).map((link) => link.href), ['/', '/catalog', '/about']);
    assert.deepEqual(navLinksFromSettings({ branding: { navbar: { links: [{ label: 'Ofertas', href: '/catalog?ofertas=1' }] } } }).map((link) => link.label), ['Ofertas']);
    const generic = footerValues({}, false);
    assert.equal(generic.newsletter.enabled, false);
    assert.equal(generic.whatsapp_enabled, true);
    const own = footerValues({ branding: { footer: { description: 'Hola', shopLinks: [{ label: 'A', href: '/' }], whatsapp_enabled: false } } }, false);
    assert.equal(own.description, 'Hola');
    assert.equal(linksSummary(own.shopLinks), 'A');
    assert.equal(own.whatsapp_enabled, false);
    assert.equal(linksSummary([]), 'Sin links');
});

test('estilo y celular del bloque: se guarda en props y la tienda lo aplica', async () => {
    const { deviceClass, spacingStyle, sectionStyleOf, withSectionStyle, hiddenOn, headingTab } = await import('../src/utils/sectionStyle.js');
    assert.equal(deviceClass({}), undefined);
    assert.equal(spacingStyle({}), undefined);
    const props = withSectionStyle({ title: 'Hola' }, { spaceTop: 'lg', hideMobile: true });
    assert.deepEqual(props, { title: 'Hola', section_style: { spaceTop: 'lg', hideMobile: true } });
    assert.equal(deviceClass(props), 'hidden md:block');
    assert.deepEqual(spacingStyle(props), { marginTop: 88 });
    assert.equal(hiddenOn(props, 'mobile'), true);
    assert.equal(hiddenOn(props, 'desktop'), false);
    assert.equal(deviceClass(withSectionStyle({}, { hideDesktop: true })), 'md:hidden');
    // Volver todo a lo de siempre borra section_style.
    assert.deepEqual(withSectionStyle(props, { spaceTop: 'none', hideMobile: false }), { title: 'Hola' });
    assert.deepEqual(sectionStyleOf({ section_style: { spaceTop: 'xx' } }).spaceTop, 'none');
    assert.equal(headingTab('Colores del hero'), 'estilo');
    assert.equal(headingTab('Plantilla'), 'estilo');
    assert.equal(headingTab('Tamano de la portada'), 'estilo');
    assert.equal(headingTab('Botones'), 'contenido');
    const builder = await read('../src/components/PageBuilder.jsx');
    assert.match(builder, /className=\{ignoreDevice \? undefined : deviceClass\(section\.props\)\}/);
});

test('otras tiendas (Teflón) usan los bloques generales y no ven el Catálogo de Piquim', async () => {
    const { editorPageKey, BLOCK_TYPES } = await import('../src/panel/diseno/model.js');
    assert.equal(editorPageKey('home', false), 'home');
    assert.deepEqual(BLOCK_TYPES.home.map(([type]) => type), ['HeroSlider', 'BrandMarquee', 'FeaturedProducts', 'Services']);
    const screen = await read('../src/panel/diseno/Diseno.jsx');
    assert.match(screen, /\{PAGES\.map\(/);
    assert.match(screen, /page === 'catalogo' && isPiquim \? <CatalogPageEditor/);
    assert.match(screen, /page === 'catalogo' && !isPiquim \? <CatalogTextsEditor/);
});

test('tiendas sin plantilla propia: menú, pie y textos editables', async () => {
    const { footerColumns, footerSocials, footerValues, headerExtraLinks, withHeaderExtraLinks } = await import('../src/panel/diseno/chrome.js');
    const { isExtraNavLink, storeText } = await import('../src/utils/storeTexts.js');

    assert.equal(storeText('footer', 'contact_title', {}), 'Contacto');
    assert.equal(storeText('footer', 'contact_title', { contact_title: 'Hablemos' }), 'Hablemos');
    assert.equal(storeText('catalog', 'title', { title: '  ' }), 'Todos los productos');

    // "Ofertas" se oculta si viene de antes, pero se ve si se agregó desde el editor.
    assert.equal(isExtraNavLink({ label: 'Ofertas' }), false);
    assert.equal(isExtraNavLink({ label: 'Ofertas', custom: true }), true);
    const settings = { branding: { navbar: { links: [{ label: 'Inicio', href: '/' }, { label: 'Obras', href: '/obras' }] } } };
    assert.deepEqual(headerExtraLinks(settings).map((link) => link.label), ['Obras']);
    assert.deepEqual(withHeaderExtraLinks(settings, [{ label: 'Ofertas', href: '/catalog' }]).map((link) => [link.label, Boolean(link.custom)]), [['Inicio', false], ['Ofertas', true]]);

    // El pie genérico muestra quickLinks antes que shopLinks: el editor tiene que ver lo mismo.
    const footer = { quickLinks: [{ label: 'Rapido', href: '/' }], shopLinks: [{ label: 'Tienda', href: '/' }] };
    assert.equal(footerValues({ branding: { footer } }, false).shopLinks[0].label, 'Rapido');
    assert.equal(footerValues({ branding: { footer } }, true).shopLinks[0].label, 'Tienda');
    assert.deepEqual(footerColumns(false).map(([key]) => key), ['shopLinks', 'legalLinks']);

    assert.deepEqual(footerSocials({ socialLinks: [{ href: 'https://instagram.com/x' }], socials: { whatsapp: '54' } }), { instagram: 'https://instagram.com/x', whatsapp: '54' });

    const chrome = await read('../src/panel/diseno/ChromeEditors.jsx');
    assert.match(chrome, /shopLinks: links, quickLinks: links/);
    assert.match(chrome, /socialLinks: \[\]/);
});

test('portada Industrial: lo que se borra deja de verse', async () => {
    const hero = await read('../src/components/blocks/SanitariosIndustrialHeroSlider.jsx');
    assert.doesNotMatch(hero.slice(hero.indexOf('const slide = normalizedSlides')), /'PREMIUM'|Chrome_04|'SHOP NOW'/);
    assert.doesNotMatch(hero.slice(hero.indexOf('const cleanSlides')), /\|\| 'SHOP NOW'/);
    const editor = await read('../src/components/admin/evolution/BlockPropertiesEditor.jsx');
    assert.match(editor, /variant === 'sanitarios_industrial'/);
    assert.match(editor, /<MediaField\r?\n\s+label="Imagen"/);
});

test('términos y privacidad: editables en cualquier tienda', async () => {
    const { LEGAL_DEFAULTS, fillCompany, legalBlocks, legalInline, legalPage, withPrivacyLink } = await import('../src/data/legalPages.js');
    assert.equal(LEGAL_DEFAULTS.terms.sections.length, 13);
    assert.ok(LEGAL_DEFAULTS.privacy.sections.length >= 10);

    assert.equal(legalPage('terms', {}).customized, false);
    assert.equal(legalPage('terms', {}).title, 'Terminos y Condiciones de Uso');
    const own = { branding: { legal_pages: { privacy: { title: 'Datos', sections: [{ title: 'A', body: 'B' }], updated_at: '2026-11-01T00:00:00Z' } } } };
    assert.equal(legalPage('privacy', own).title, 'Datos');
    assert.equal(legalPage('privacy', own).sections.length, 1);
    assert.equal(legalPage('terms', own).customized, false);
    // Quitar todas las secciones se respeta: no vuelve el texto original.
    assert.equal(legalPage('terms', { branding: { legal_pages: { terms: { sections: [] } } } }).sections.length, 0);

    assert.equal(fillCompany('Hola {empresa} y {EMPRESA}', 'Teflon'), 'Hola Teflon y Teflon');
    assert.deepEqual(legalBlocks(['Uno', 'dos', '', '- a', '- b'].join('\n')), [{ type: 'text', text: 'Uno dos' }, { type: 'list', items: ['a', 'b'] }]);
    assert.deepEqual(legalInline('x **y** z').map((part) => part.bold), [false, true, false]);

    assert.equal(withPrivacyLink([], {}).at(-1).href, '/privacy');
    assert.equal(withPrivacyLink([{ label: 'P', href: '/privacy' }], {}).length, 1);
    assert.equal(withPrivacyLink([], { branding: { legal_pages: { privacy: { hide_footer_link: true } } } }).length, 0);

    const screen = await read('../src/panel/diseno/Diseno.jsx');
    assert.match(screen, /\['legales', 'Términos y políticas'\]/);
    const app = await read('../src/App.jsx');
    assert.match(app, /route === '\/privacy'/);
});

test('editor de Piquim: sin los campos de las otras tiendas', async () => {
    const chrome = await read('../src/panel/diseno/ChromeEditors.jsx');
    assert.equal((chrome.match(/\{searchField\}/g) || []).length, 1);
    assert.match(chrome, /isPiquim \? footer\.socials \|\| \{\} : footerSocials\(footer\)/);
    assert.match(chrome, /\.\.\.\(isPiquim \? \{\} : \{ socialLinks: \[\] \}\)/);
});

test('la cláusula de Vase va siempre y en cualquier tienda', async () => {
    const { LEGAL_DEFAULTS, legalDisplaySections, legalPage } = await import('../src/data/legalPages.js');
    const titles = (settings) => legalDisplaySections(legalPage('terms', settings)).map((section) => section.title);
    assert.equal(titles({}).length, 14);
    assert.equal(titles({})[1], 'Plataforma tecnologica');

    // Ni borrando todo, ni guardando otra versión con el mismo nombre.
    assert.ok(titles({ branding: { legal_pages: { terms: { sections: [] } } } }).includes('Plataforma tecnologica'));
    const tampered = { branding: { design_preset: 'otra', legal_pages: { terms: { sections: [{ title: 'A', body: 'x' }, { title: 'PLATAFORMA TECNOLOGICA', body: 'cambiada' }] } } } };
    const shown = legalDisplaySections(legalPage('terms', tampered));
    assert.deepEqual(shown.slice(0, 2).map((section) => section.title), ['A', 'Plataforma tecnologica']);
    assert.equal(shown[1].body, LEGAL_DEFAULTS.terms.fixed.body);
    assert.match(shown[1].body, /no procesa pagos/);

    // Privacidad no lleva cláusula fija.
    assert.equal(legalPage('privacy', {}).fixed, null);
});

test('términos y políticas no dependen de la tienda', async () => {
    const screen = await read('../src/panel/diseno/Diseno.jsx');
    assert.match(screen, /\{PAGES\.map\(/);
    assert.doesNotMatch(screen, /page === 'legales' &&/);
    const app = await read('../src/App.jsx');
    assert.match(app, /else if \(route === '\/terms'\) Component = TermsPage;/);
    assert.match(app, /else if \(route === '\/privacy'/);
    const legal = await read('../src/data/legalPages.js');
    assert.doesNotMatch(legal, /isPiquim|design_preset/);
});

test('las otras menciones a Vase también quedan fijas', async () => {
    const { LEGAL_DEFAULTS, legalDisplaySections, legalPage } = await import('../src/data/legalPages.js');
    const text = (kind, settings) => legalDisplaySections(legalPage(kind, settings)).map((section) => [section.title, section.body, section.note].join(' ')).join(' ');

    // Ninguna sección editable de partida nombra a Vase.
    Object.values(LEGAL_DEFAULTS).forEach((page) => page.sections.forEach((section) => assert.doesNotMatch(section.body, /Vase/)));

    const terms = text('terms', {});
    assert.match(terms, /actua unicamente como encargado/);
    assert.match(terms, /no asume responsabilidad/);
    assert.match(text('privacy', {}), /encargada del tratamiento/);

    // Sin ninguna sección, igual salen.
    const empty = { branding: { legal_pages: { terms: { sections: [] }, privacy: { sections: [] } } } };
    assert.match(text('terms', empty), /no asume responsabilidad/);
    assert.match(text('privacy', empty), /encargada del tratamiento/);

    // Renombrar la sección no la separa de su texto fijo, y una copia guardada no lo duplica.
    const note = LEGAL_DEFAULTS.terms.notes[1];
    const renamed = { branding: { legal_pages: { terms: { sections: [{ key: 'responsabilidad', title: 'Otro nombre', body: `Mio. ${note.body}` }] } } } };
    const shown = legalDisplaySections(legalPage('terms', renamed)).find((section) => section.title === 'Otro nombre');
    assert.equal(shown.body, 'Mio.');
    assert.equal(shown.note, note.body);
});
