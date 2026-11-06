import React, { useEffect, useMemo, useState } from 'react';
import { pageWindow } from '../paging';
import Select from './Select';

export function Pager({ page, pageSize, total, onPage, onPageSize, sizes = [25, 50, 100] }) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const from = total ? (page - 1) * pageSize + 1 : 0;
    const to = Math.min(total, page * pageSize);
    return (
        <div className="vp-pager">
            <span className="vp-note">Mostrando {from}–{to} de {total}</span>
            <div className="vp-sp" />
            <button type="button" className="vp-pg" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Página anterior">‹</button>
            {pageWindow(page, pages).map((item, index) =>
                item === '…'
                    ? <span key={`gap-${index}`} className="vp-note">…</span>
                    : <button key={item} type="button" className={`vp-pg ${item === page ? 'on' : ''}`} onClick={() => onPage(item)} aria-current={item === page ? 'page' : undefined}>{item}</button>
            )}
            <button type="button" className="vp-pg" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Página siguiente">›</button>
            {onPageSize ? (
                <Select variant="fp" style={{ marginLeft: 8 }} value={pageSize} onChange={(next) => onPageSize(Number(next))} ariaLabel="Cantidad por página" options={sizes.map((size) => ({ value: size, label: `${size} por página` }))} />
            ) : null}
        </div>
    );
}

// Tabla con paginación, fila activa y selección múltiple (la barra de acciones flota abajo).
export default function DataTable({
    columns,
    rows,
    rowKey = (row) => row.id,
    activeKey,
    onRowClick,
    selectable = false,
    selected = [],
    onSelectedChange,
    bulkActions,
    pageSize: initialPageSize = 25,
    empty = 'No hay nada para mostrar.',
}) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > pages) setPage(pages);
    }, [page, pages]);

    const visible = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);
    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const toggle = (key) => {
        if (!onSelectedChange) return;
        onSelectedChange(selectedSet.has(key) ? selected.filter((item) => item !== key) : [...selected, key]);
    };

    return (
        <>
            <div className="vp-card" style={{ padding: '8px 10px' }}>
                <table className="vp-tbl dt">
                    <thead>
                        <tr>
                            {selectable ? <th style={{ width: 40 }}><span className="vp-note">Elegir</span></th> : null}
                            {columns.map((column) => (
                                <th key={column.key} className={column.align === 'right' ? 'r' : undefined} style={column.width ? { width: column.width } : undefined}>{column.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row) => {
                            const key = rowKey(row);
                            const isOn = activeKey !== undefined && activeKey === key;
                            return (
                                <tr
                                    key={key}
                                    className={`${onRowClick ? 'click' : ''} ${isOn ? 'on' : ''}`}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                >
                                    {selectable ? (
                                        <td className="sel" onClick={(event) => event.stopPropagation()}>
                                            <button
                                                type="button"
                                                className={`vp-check ${selectedSet.has(key) ? 'on' : ''}`}
                                                role="checkbox"
                                                aria-checked={selectedSet.has(key)}
                                                aria-label="Seleccionar"
                                                onClick={() => toggle(key)}
                                            >✓</button>
                                        </td>
                                    ) : null}
                                    {columns.map((column, index) => (
                                        <td key={column.key} data-label={column.label} className={[column.align === 'right' ? 'r' : '', index === 0 ? 'main' : ''].filter(Boolean).join(' ') || undefined}>
                                            {column.render ? column.render(row) : row[column.key]}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {!total ? <div className="vp-empty">{empty}</div> : null}
                {total > pageSize || total > 25 ? (
                    <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
                ) : null}
            </div>
            {selectable && selected.length ? (
                <div className="vp-bulk" role="toolbar" aria-label="Acciones para los seleccionados">
                    {selected.length} {selected.length === 1 ? 'seleccionado' : 'seleccionados'}
                    {bulkActions}
                    <button type="button" className="x" onClick={() => onSelectedChange?.([])} aria-label="Quitar selección">×</button>
                </div>
            ) : null}
        </>
    );
}
