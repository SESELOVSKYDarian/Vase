import React from 'react';

export function renderResponsiveCardTitle(title) {
    const value = String(title || '');
    const slashIndex = value.indexOf('/');
    if (slashIndex < 0) return value;

    const beforeSlash = value.slice(0, slashIndex).trimEnd();
    const afterSlash = value.slice(slashIndex + 1).trimStart();

    return (
        <>
            <span>{`${beforeSlash} /`}</span>
            <span className="block sm:inline">{` ${afterSlash}`}</span>
        </>
    );
}
