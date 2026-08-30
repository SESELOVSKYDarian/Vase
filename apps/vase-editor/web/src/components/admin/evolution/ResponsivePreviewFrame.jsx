import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../utils/cn';

const viewportWidths = {
    desktop: '100%',
    tablet: '834px',
    mobile: '390px',
};

const previewDocument = `<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <base href="/" />
    </head>
    <body>
        <div id="preview-root"></div>
    </body>
</html>`;

const copyThemeAttributes = (targetDocument) => {
    const attributeNames = ['class', 'style', 'data-theme', 'data-color-scheme', 'dir', 'lang'];

    attributeNames.forEach((attribute) => {
        const value = document.documentElement.getAttribute(attribute);
        if (value === null) targetDocument.documentElement.removeAttribute(attribute);
        else targetDocument.documentElement.setAttribute(attribute, value);
    });

    targetDocument.body.className = document.body.className;
};

const copyStylesheets = (targetDocument) => {
    targetDocument.head
        .querySelectorAll('[data-evolution-preview-source-style]')
        .forEach((node) => node.remove());

    document.head
        .querySelectorAll('style, link[rel="stylesheet"]')
        .forEach((node) => {
            const clone = node.cloneNode(true);
            clone.setAttribute('data-evolution-preview-source-style', 'true');
            targetDocument.head.appendChild(clone);
        });
};

const ResponsivePreviewFrame = ({ viewport = 'desktop', children }) => {
    const frameRef = useRef(null);
    const cleanupRef = useRef(() => {});
    const [mountNode, setMountNode] = useState(null);
    const [failed, setFailed] = useState(false);
    const width = viewportWidths[viewport] || viewportWidths.desktop;

    useEffect(() => () => cleanupRef.current(), []);

    const handleLoad = () => {
        cleanupRef.current();

        const frameDocument = frameRef.current?.contentDocument;
        const nextMountNode = frameDocument?.getElementById('preview-root');
        if (!frameDocument || !nextMountNode) {
            setFailed(true);
            return;
        }

        frameDocument.querySelector('base')?.setAttribute('href', document.baseURI);
        copyThemeAttributes(frameDocument);
        copyStylesheets(frameDocument);

        const previewBaseStyle = frameDocument.createElement('style');
        previewBaseStyle.setAttribute('data-evolution-preview-base-style', 'true');
        previewBaseStyle.textContent = `
            html, body, #preview-root { min-height: 100%; margin: 0; }
            body { overflow-x: hidden; }
            #preview-root { min-width: 0; }
        `;
        frameDocument.head.appendChild(previewBaseStyle);

        const stylesObserver = new MutationObserver(() => copyStylesheets(frameDocument));
        stylesObserver.observe(document.head, {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true,
        });

        const themeObserver = new MutationObserver(() => copyThemeAttributes(frameDocument));
        themeObserver.observe(document.documentElement, { attributes: true });
        themeObserver.observe(document.body, { attributes: true });

        cleanupRef.current = () => {
            stylesObserver.disconnect();
            themeObserver.disconnect();
        };

        setFailed(false);
        setMountNode(nextMountNode);
    };

    if (failed) {
        return (
            <div className="storefront-preview-root min-h-[520px] overflow-auto bg-white">
                {children}
            </div>
        );
    }

    return (
        <div className="relative flex min-h-[520px] w-full justify-center overflow-hidden bg-[var(--admin-hover)]">
            {!mountNode ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-xs admin-text-muted">
                    Preparando vista responsive...
                </div>
            ) : null}
            <iframe
                ref={frameRef}
                title="Vista responsive del sitio"
                srcDoc={previewDocument}
                onLoad={handleLoad}
                className={cn(
                    'block h-[calc(100dvh-9rem)] min-h-[520px] max-w-full border-0 bg-white transition-[width] duration-300',
                    viewport !== 'desktop' && 'shadow-2xl'
                )}
                style={{ width }}
            />
            {mountNode ? createPortal(children, mountNode) : null}
        </div>
    );
};

export default ResponsivePreviewFrame;
