// Datos de facturación del cliente.

export function normalizeBillingInfo(customer = {}) {
  const source = customer?.billing && typeof customer.billing === 'object' ? customer.billing : customer;
  const businessName = String(
    source.business_name ||
    source.businessName ||
    source.razon_social ||
    customer?.billing_business_name ||
    customer?.billingBusinessName ||
    customer?.company ||
    ''
  ).trim();
  const address = String(
    source.address ||
    source.direccion ||
    customer?.billing_address ||
    customer?.billingAddress ||
    ''
  ).trim();
  const city = String(
    source.city ||
    source.localidad ||
    customer?.billing_city ||
    customer?.billingCity ||
    ''
  ).trim();
  const rawVatType = String(
    source.vat_type ||
    source.vatType ||
    customer?.billing_vat_type ||
    customer?.billingVatType ||
    ''
  ).trim().toLowerCase();
  const rawDocumentType = String(
    source.document_type ||
    source.documentType ||
    customer?.billing_document_type ||
    customer?.billingDocumentType ||
    'cuit'
  ).trim().toLowerCase();
  const documentNumber = String(
    source.document_number ||
    source.documentNumber ||
    customer?.billing_document_number ||
    customer?.billingDocumentNumber ||
    customer?.cuit ||
    ''
  ).trim();

  return {
    businessName,
    address,
    city,
    vatType: rawVatType,
    documentType: ['cuit', 'cuil', 'dni'].includes(rawDocumentType) ? rawDocumentType : 'cuit',
    documentNumber,
  };
}

export function hasBillingInfo(customer = {}) {
  const billing = normalizeBillingInfo(customer);
  return Boolean(
    billing.businessName ||
    billing.address ||
    billing.city ||
    billing.vatType ||
    billing.documentNumber
  );
}

export function formatBillingVatLabel(value = '') {
  if (value === 'responsable_inscripto' || value === 'inscripto') return 'Responsable inscripto';
  if (value === 'monotributista' || value === 'monotributo') return 'Monotributista';
  if (value === 'exento') return 'Exento';
  if (value === 'consumidor_final' || value === 'consumidor final') return 'Consumidor final';
  return value || '-';
}

export function formatBillingDocumentLabel(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'dni') return 'DNI';
  if (normalized === 'cuil') return 'CUIL';
  return 'CUIT';
}
