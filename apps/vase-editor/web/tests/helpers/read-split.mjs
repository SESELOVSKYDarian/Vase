import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Marca que deja el índice de un archivo que se repartió en una carpeta: lista sus partes en orden.
const PARTS = /^\/\/ partes: (.+)$/m;

/**
 * Lee un archivo de código como texto. Si el archivo es solo un índice (su código se repartió en
 * una carpeta), devuelve todas las partes juntas, para las pruebas que revisan el código como texto.
 * Si alguna parte también se repartió, baja un nivel más.
 */
export function readSplitSync(file) {
    const url = file instanceof URL ? file : pathToFileURL(resolve(String(file)));
    const source = readFileSync(url, 'utf8');
    const parts = source.match(PARTS);
    if (!parts) return source;
    // Una parte puede haberse borrado después por no usarse: se saltea.
    const pieces = parts[1]
        .split(',')
        .map((part) => new URL(part.trim(), url))
        .filter((part) => existsSync(part))
        .map((part) => readSplitSync(part));
    return [source, ...pieces].join('\n');
}

export async function readSplit(file) {
    return readSplitSync(file);
}
