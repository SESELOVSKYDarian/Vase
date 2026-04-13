export const BILLING_VAT_OPTIONS = [
    { value: "responsable_inscripto", label: "Responsable inscripto" },
    { value: "monotributista", label: "Monotributista" },
    { value: "exento", label: "Exento" },
    { value: "consumidor_final", label: "Consumidor final" },
];

export const BILLING_DOCUMENT_OPTIONS = [
    { value: "cuit", label: "CUIT" },
    { value: "cuil", label: "CUIL" },
    { value: "dni", label: "DNI" },
];

export const EMPTY_BILLING_INFO = {
    businessName: "",
    address: "",
    city: "",
    vatType: "",
    documentType: "cuit",
    documentNumber: "",
};

const normalizeVatType = (value = "") => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    if (["inscripto", "responsable inscripto", "responsable_inscripto"].includes(raw)) {
        return "responsable_inscripto";
    }
    if (["mono", "monotributo", "monotributista"].includes(raw)) {
        return "monotributista";
    }
    if (["exento"].includes(raw)) {
        return "exento";
    }
    if (["consumidor final", "consumidor_final", "final"].includes(raw)) {
        return "consumidor_final";
    }
    return raw;
};

const normalizeDocumentType = (value = "") => {
    const raw = String(value || "").trim().toLowerCase();
    if (["dni", "cuit", "cuil"].includes(raw)) return raw;
    return "cuit";
};

export const normalizeBillingInfo = (source = {}) => {
    const billingSource =
        source?.billing && typeof source.billing === "object"
            ? source.billing
            : source;

    const businessName = String(
        billingSource.business_name ||
        billingSource.businessName ||
        billingSource.razon_social ||
        source.billing_business_name ||
        source.billingBusinessName ||
        source.company ||
        ""
    ).trim();

    const address = String(
        billingSource.address ||
        billingSource.direccion ||
        source.billing_address ||
        source.billingAddress ||
        ""
    ).trim();

    const city = String(
        billingSource.city ||
        billingSource.localidad ||
        source.billing_city ||
        source.billingCity ||
        ""
    ).trim();

    const vatType = normalizeVatType(
        billingSource.vat_type ||
        billingSource.vatType ||
        billingSource.iva_type ||
        billingSource.ivaType ||
        source.billing_vat_type ||
        source.billingVatType ||
        ""
    );

    const documentType = normalizeDocumentType(
        billingSource.document_type ||
        billingSource.documentType ||
        source.billing_document_type ||
        source.billingDocumentType ||
        ""
    );

    const documentNumber = String(
        billingSource.document_number ||
        billingSource.documentNumber ||
        source.billing_document_number ||
        source.billingDocumentNumber ||
        source.cuit ||
        ""
    ).trim();

    return {
        businessName,
        address,
        city,
        vatType,
        documentType,
        documentNumber,
    };
};

export const hasBillingInfo = (source = {}) => {
    const info = normalizeBillingInfo(source);
    return Boolean(
        info.businessName ||
        info.address ||
        info.city ||
        info.vatType ||
        info.documentNumber
    );
};

export const getBillingVatLabel = (value = "") => {
    const normalized = normalizeVatType(value);
    return BILLING_VAT_OPTIONS.find((option) => option.value === normalized)?.label || value || "-";
};

export const getBillingDocumentLabel = (value = "") => {
    const normalized = normalizeDocumentType(value);
    return BILLING_DOCUMENT_OPTIONS.find((option) => option.value === normalized)?.label || normalized.toUpperCase();
};
