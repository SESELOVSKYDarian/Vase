import React, { useState } from 'react';

// Buscador para sumar productos a una categoría o a una oferta.
export default function ProductSearch({ products, exclude, onPick, placeholder = '+ Sumar productos: buscá por nombre o SKU…' }) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const options = q.length < 2 ? [] : products.filter((product) => !exclude.has(product.id) && `${product.name} ${product.sku || ''}`.toLowerCase().includes(q)).slice(0, 8);
    return (
        <div className="vp-fld">
            <input className="vp-inp" placeholder={placeholder} value={query} onChange={(event) => setQuery(event.target.value)} aria-label={placeholder.replace(/^\+\s*/, '')} />
            {options.length ? (
                <div className="vp-lmenu">
                    {options.map((product) => <button key={product.id} type="button" className="vp-mi" onClick={() => { onPick(product); setQuery(''); }}>{product.name}<em>{product.sku}</em></button>)}
                </div>
            ) : null}
        </div>
    );
}
