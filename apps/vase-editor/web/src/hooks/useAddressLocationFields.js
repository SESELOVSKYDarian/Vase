import { useEffect, useMemo, useState } from 'react';
import {
    FALLBACK_COUNTRY_OPTIONS,
    findOptionByText,
    loadArgentinaAddresses,
    loadArgentinaCities,
    loadArgentinaProvinces,
    loadCountries,
} from '../utils/locations';

const readLabel = (value = '') => String(value || '').trim();
const readCode = (value = '') => String(value || '').trim().toUpperCase();
const normalizeText = (value = '') =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const resolveCountryOption = (options = [], countryCode = '', countryLabel = '') => {
    const normalizedCode = readCode(countryCode);
    if (normalizedCode) {
        return options.find((option) => option.value === normalizedCode) || null;
    }
    return findOptionByText(options, countryLabel);
};

export function useAddressLocationFields({
    value,
    setValue,
    fields,
}) {
    const countryCodeField = fields.countryCode;
    const countryLabelField = fields.countryLabel || null;
    const provinceField = fields.province;
    const provinceIdField = fields.provinceId || null;
    const cityField = fields.city;
    const cityIdField = fields.cityId || null;
    const addressField = fields.address || null;

    const countryCode = readCode(value?.[countryCodeField]);
    const countryLabel = countryLabelField ? readLabel(value?.[countryLabelField]) : '';
    const province = readLabel(value?.[provinceField]);
    const provinceId = provinceIdField ? readLabel(value?.[provinceIdField]) : '';
    const city = readLabel(value?.[cityField]);
    const cityId = cityIdField ? readLabel(value?.[cityIdField]) : '';
    const address = addressField ? readLabel(value?.[addressField]) : '';

    const [countryOptions, setCountryOptions] = useState(FALLBACK_COUNTRY_OPTIONS);
    const [countryInput, setCountryInput] = useState(countryLabel);
    const [countryInputDirty, setCountryInputDirty] = useState(false);
    const [countriesLoading, setCountriesLoading] = useState(false);
    const [provinceOptions, setProvinceOptions] = useState([]);
    const [provinceLoading, setProvinceLoading] = useState(false);
    const [cityOptions, setCityOptions] = useState([]);
    const [citiesLoading, setCitiesLoading] = useState(false);
    const [addressOptions, setAddressOptions] = useState([]);
    const [addressLoading, setAddressLoading] = useState(false);

    const selectedCountryOption = useMemo(
        () => resolveCountryOption(countryOptions, countryCode, countryLabel),
        [countryOptions, countryCode, countryLabel],
    );
    const resolvedCountryCode = selectedCountryOption?.value || countryCode;
    const isArgentinaCountry = resolvedCountryCode === 'AR';
    const provinceSuggestionsEnabled = isArgentinaCountry && provinceOptions.length > 0;
    const citySuggestionsEnabled = isArgentinaCountry && Boolean(provinceId) && cityOptions.length > 0;

    useEffect(() => {
        let active = true;
        setCountriesLoading(true);
        loadCountries()
            .then((options) => {
                if (!active || !Array.isArray(options) || !options.length) return;
                setCountryOptions(options);
            })
            .finally(() => {
                if (active) {
                    setCountriesLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!countryLabelField && countryInputDirty) {
            return;
        }

        if (selectedCountryOption?.label) {
            if (selectedCountryOption.label !== countryInput) {
                setCountryInput(selectedCountryOption.label);
            }
            return;
        }

        // When caller does not persist country label, keep free-typed input intact.
        if (!countryLabelField) {
            return;
        }

        const nextInput = countryLabel ?? '';
        if (nextInput !== countryInput) {
            setCountryInput(nextInput);
        }
    }, [selectedCountryOption, countryLabel, countryInput, countryLabelField, countryInputDirty]);

    useEffect(() => {
        if (!selectedCountryOption) return;
        setValue((prev) => {
            const next = { ...prev };
            let changed = false;
            if (readCode(prev?.[countryCodeField]) !== selectedCountryOption.value) {
                next[countryCodeField] = selectedCountryOption.value;
                changed = true;
            }
            if (countryLabelField && readLabel(prev?.[countryLabelField]) !== selectedCountryOption.label) {
                next[countryLabelField] = selectedCountryOption.label;
                changed = true;
            }
            return changed ? next : prev;
        });
    }, [selectedCountryOption, countryCodeField, countryLabelField, setValue]);

    useEffect(() => {
        if (!isArgentinaCountry) {
            setProvinceOptions([]);
            setProvinceLoading(false);
            return;
        }

        let active = true;
        setProvinceLoading(true);
        loadArgentinaProvinces()
            .then((options) => {
                if (active) {
                    setProvinceOptions(options);
                }
            })
            .catch(() => {
                if (active) {
                    setProvinceOptions([]);
                }
            })
            .finally(() => {
                if (active) {
                    setProvinceLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [isArgentinaCountry]);

    useEffect(() => {
        if (!isArgentinaCountry || !provinceId) {
            setCityOptions([]);
            setCitiesLoading(false);
            return;
        }

        let active = true;
        setCitiesLoading(true);
        loadArgentinaCities(provinceId)
            .then((options) => {
                if (active) {
                    setCityOptions(options);
                }
            })
            .finally(() => {
                if (active) {
                    setCitiesLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [isArgentinaCountry, provinceId]);

    useEffect(() => {
        if (!isArgentinaCountry || !provinceOptions.length || !provinceIdField) return;
        const matchedProvince = findOptionByText(provinceOptions, province);
        if (!matchedProvince) return;

        setValue((prev) => {
            const next = { ...prev };
            let changed = false;
            if (readLabel(prev?.[provinceField]) !== matchedProvince.label) {
                next[provinceField] = matchedProvince.label;
                changed = true;
            }
            if (readLabel(prev?.[provinceIdField]) !== matchedProvince.value) {
                next[provinceIdField] = matchedProvince.value;
                changed = true;
            }
            return changed ? next : prev;
        });
    }, [isArgentinaCountry, provinceOptions, province, provinceField, provinceIdField, setValue]);

    useEffect(() => {
        if (!isArgentinaCountry || !cityOptions.length || !cityIdField) return;
        const matchedCity = findOptionByText(cityOptions, city);
        if (!matchedCity) return;

        setValue((prev) => {
            const next = { ...prev };
            let changed = false;
            if (readLabel(prev?.[cityField]) !== matchedCity.label) {
                next[cityField] = matchedCity.label;
                changed = true;
            }
            if (readLabel(prev?.[cityIdField]) !== matchedCity.value) {
                next[cityIdField] = matchedCity.value;
                changed = true;
            }
            return changed ? next : prev;
        });
    }, [isArgentinaCountry, cityOptions, city, cityField, cityIdField, setValue]);

    useEffect(() => {
        if (!addressField || !isArgentinaCountry) {
            setAddressOptions([]);
            setAddressLoading(false);
            return;
        }

        const query = readLabel(address);
        if (query.length < 3) {
            setAddressOptions([]);
            setAddressLoading(false);
            return;
        }

        let active = true;
        setAddressLoading(true);
        const timer = setTimeout(() => {
            loadArgentinaAddresses({
                query,
                province: readLabel(province),
                city: readLabel(city),
                limit: 8,
            })
                .then((options) => {
                    if (!active) return;
                    setAddressOptions(Array.isArray(options) ? options : []);
                })
                .finally(() => {
                    if (active) {
                        setAddressLoading(false);
                    }
                });
        }, 220);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [addressField, address, isArgentinaCountry, province, city]);

    const clearProvinceAndCity = (next) => {
        next[provinceField] = '';
        next[cityField] = '';
        if (provinceIdField) {
            next[provinceIdField] = '';
        }
        if (cityIdField) {
            next[cityIdField] = '';
        }
    };

    const handleCountryInputChange = (nextValue) => {
        setCountryInput(nextValue);
        setCountryInputDirty(true);
        const trimmedValue = readLabel(nextValue);
        const normalizedInput = normalizeText(trimmedValue);
        const match = countryOptions.find(
            (option) => normalizeText(option?.label) === normalizedInput,
        ) || null;

        setValue((prev) => {
            if (!trimmedValue) {
                const next = { ...prev };
                next[countryCodeField] = '';
                if (countryLabelField) {
                    next[countryLabelField] = '';
                }
                clearProvinceAndCity(next);
                return next;
            }

            if (!match) {
                const next = { ...prev };
                next[countryCodeField] = '';
                if (countryLabelField) {
                    next[countryLabelField] = trimmedValue;
                }
                clearProvinceAndCity(next);
                return next;
            }

            const previousCode = readCode(prev?.[countryCodeField]);
            const next = { ...prev };
            next[countryCodeField] = match.value;
            setCountryInputDirty(false);
            if (countryLabelField) {
                next[countryLabelField] = match.label;
            }
            if (previousCode && previousCode !== match.value) {
                clearProvinceAndCity(next);
            }
            return next;
        });
    };

    const handleProvinceInputChange = (nextValue) => {
        if (!isArgentinaCountry) {
            setValue((prev) => {
                const next = { ...prev, [provinceField]: nextValue };
                if (provinceIdField) {
                    next[provinceIdField] = '';
                }
                return next;
            });
            return;
        }

        const trimmedValue = readLabel(nextValue);
        const match = findOptionByText(provinceOptions, trimmedValue);

        setValue((prev) => {
            const next = { ...prev };

            if (!trimmedValue) {
                next[provinceField] = '';
                if (provinceIdField) {
                    next[provinceIdField] = '';
                }
                next[cityField] = '';
                if (cityIdField) {
                    next[cityIdField] = '';
                }
                return next;
            }

            if (!match) {
                next[provinceField] = nextValue;
                if (provinceIdField) {
                    next[provinceIdField] = '';
                }
                next[cityField] = '';
                if (cityIdField) {
                    next[cityIdField] = '';
                }
                return next;
            }

            const previousProvinceId = provinceIdField ? readLabel(prev?.[provinceIdField]) : '';
            next[provinceField] = match.label;
            if (provinceIdField) {
                next[provinceIdField] = match.value;
            }
            if (previousProvinceId && previousProvinceId !== match.value) {
                next[cityField] = '';
                if (cityIdField) {
                    next[cityIdField] = '';
                }
            }
            return next;
        });
    };

    const handleCityInputChange = (nextValue) => {
        if (!isArgentinaCountry) {
            setValue((prev) => {
                const next = { ...prev, [cityField]: nextValue };
                if (cityIdField) {
                    next[cityIdField] = '';
                }
                return next;
            });
            return;
        }

        const trimmedValue = readLabel(nextValue);
        const match = findOptionByText(cityOptions, trimmedValue);

        setValue((prev) => {
            const next = { ...prev };

            if (!trimmedValue) {
                next[cityField] = '';
                if (cityIdField) {
                    next[cityIdField] = '';
                }
                return next;
            }

            if (!match) {
                next[cityField] = nextValue;
                if (cityIdField) {
                    next[cityIdField] = '';
                }
                return next;
            }

            next[cityField] = match.label;
            if (cityIdField) {
                next[cityIdField] = match.value;
            }
            return next;
        });
    };

    const handleAddressInputChange = (nextValue) => {
        if (!addressField) return;
        setValue((prev) => ({
            ...prev,
            [addressField]: nextValue,
        }));
    };

    const handleAddressOptionSelect = (option) => {
        if (!addressField || !option) return;
        const provinceLabel = readLabel(option.provinceLabel);
        const cityLabel = readLabel(option.cityLabel);
        const postalCode = readLabel(option.postalCode);
        const countryCodeFromOption = readCode(option.countryCode) || 'AR';
        const countryLabelFromOption = readLabel(option.countryLabel) || 'Argentina';

        setValue((prev) => {
            const next = {
                ...prev,
                [addressField]: readLabel(option.label),
                [countryCodeField]: countryCodeFromOption,
                [provinceField]: provinceLabel || prev?.[provinceField] || '',
                [cityField]: cityLabel || prev?.[cityField] || '',
            };

            if (countryLabelField) {
                next[countryLabelField] = countryLabelFromOption;
            }

            if (provinceIdField) {
                const provinceMatch = findOptionByText(provinceOptions, provinceLabel);
                next[provinceIdField] = provinceMatch?.value || '';
            }
            if (cityIdField) {
                const cityMatch = findOptionByText(cityOptions, cityLabel);
                next[cityIdField] = cityMatch?.value || '';
            }

            if (postalCode && String(prev?.postalCode || '').trim() !== postalCode) {
                next.postalCode = postalCode;
            }

            return next;
        });
    };

    return {
        countryInput,
        countryOptions,
        countriesLoading,
        provinceOptions,
        provinceLoading,
        cityOptions,
        citiesLoading,
        isArgentinaCountry,
        provinceSuggestionsEnabled,
        citySuggestionsEnabled,
        addressOptions,
        addressLoading,
        handleCountryInputChange,
        handleProvinceInputChange,
        handleCityInputChange,
        handleAddressInputChange,
        handleAddressOptionSelect,
    };
}
