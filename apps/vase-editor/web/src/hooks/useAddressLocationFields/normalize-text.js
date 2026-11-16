// Parte de useAddressLocationFields.js: readLabel, readCode, normalizeText, resolveCountryOption.
import { findOptionByText } from '../../utils/locations';

export const readLabel = (value = '') => String(value || '').trim();
export const readCode = (value = '') => String(value || '').trim().toUpperCase();
export const normalizeText = (value = '') =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

export const resolveCountryOption = (options = [], countryCode = '', countryLabel = '') => {
    const normalizedCode = readCode(countryCode);
    if (normalizedCode) {
        return options.find((option) => option.value === normalizedCode) || null;
    }
    return findOptionByText(options, countryLabel);
};
