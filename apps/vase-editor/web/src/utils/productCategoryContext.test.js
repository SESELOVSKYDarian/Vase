import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProductCategoryContext } from './productCategoryContext.js';

const categories = [
    { id: 'root', name: 'Heladeria' },
    { id: 'pastas', name: 'Pastas puras', parent_id: 'root' },
];

test('prefers persisted category ids over legacy paths and navigation context', () => {
    const result = resolveProductCategoryContext({
        category_ids: ['pastas'],
        source_category_path: ['Panaderia', 'Premezclas'],
        data: { category: 'Confiteria' },
    }, categories);

    assert.deepEqual(result.breadcrumb, ['Heladeria', 'Pastas puras']);
    assert.equal(result.kicker, 'Pastas puras + Heladeria');
});

test('uses legacy paths only when no persisted category data exists', () => {
    const result = resolveProductCategoryContext({ source_category_path: ['Heladeria', 'Bases'] }, categories);
    assert.deepEqual(result.breadcrumb, ['Heladeria', 'Bases']);
    assert.equal(result.kicker, 'Bases + Heladeria');
});
