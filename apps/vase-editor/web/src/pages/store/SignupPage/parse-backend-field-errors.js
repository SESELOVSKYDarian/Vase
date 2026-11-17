// Parte de SignupPage: parseBackendFieldErrors.
/** Arma parseBackendFieldErrors con lo que necesita del componente. */
export function makeParseBackendFieldErrors({  }) {
    return (codes = []) => {
        const mapping = {
            email_invalid: ['email', 'Ingresa un email valido.'],
            password_invalid_length: ['password', 'La contrasena debe tener entre 8 y 72 caracteres.'],
            password_invalid_format: ['password', 'La contrasena debe incluir al menos una letra y un numero.'],
            name_invalid: ['name', 'Nombre invalido.'],
            phone_invalid: ['phone', 'Telefono invalido.'],
            business_name_invalid: ['company', 'Razon social/negocio invalido.'],
            business_activity_invalid: ['businessActivity', 'Actividad invalida.'],
            cuil_invalid: ['cuit', 'CUIL invalido.'],
            address_invalid: ['address', 'Domicilio invalido.'],
            city_invalid: ['city', 'Localidad invalida.'],
            province_invalid: ['province', 'Provincia invalida.'],
            country_invalid: ['country', 'Pais invalido.'],
            postal_code_invalid: ['postalCode', 'Codigo postal invalido.'],
        };
        const next = {};
        codes.forEach((code) => {
            const entry = mapping[code];
            if (!entry) return;
            const [field, message] = entry;
            if (!next[field]) next[field] = message;
        });
        return next;
    };
}
