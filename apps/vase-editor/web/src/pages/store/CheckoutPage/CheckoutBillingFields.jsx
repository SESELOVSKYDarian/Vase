// Checkout, paso 1: datos de facturación (razón social, documento e IVA).
import { BILLING_DOCUMENT_OPTIONS } from '../../../utils/billing';
import { BILLING_VAT_OPTIONS } from '../../../utils/billing';
import { checkoutFieldClass } from './map-distance-quote-error.js';

export default function CheckoutBillingFields({ billingInfo, setBillingInfo }) {
    return (
        <div className="col-span-2 mt-2 border-t border-gray-200 pt-5">
            <div className="mb-4">
                <p className="text-sm font-semibold text-gray-900">
                    Datos de facturacion
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                    Completa estos datos si necesitas factura.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                        Razon social
                    </label>
                    <input
                        className={checkoutFieldClass}
                        placeholder="Ej: Mi Empresa SRL"
                        type="text"
                        value={billingInfo.businessName}
                        onChange={(e) =>
                            setBillingInfo((prev) => ({
                                ...prev,
                                businessName: e.target.value,
                            }))
                        }
                    />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                        Direccion de facturacion
                    </label>
                    <input
                        className={checkoutFieldClass}
                        placeholder="Calle y numero"
                        type="text"
                        value={billingInfo.address}
                        onChange={(e) =>
                            setBillingInfo((prev) => ({
                                ...prev,
                                address: e.target.value,
                            }))
                        }
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Localidad
                    </label>
                    <input
                        className={checkoutFieldClass}
                        placeholder="Mar del Plata"
                        type="text"
                        value={billingInfo.city}
                        onChange={(e) =>
                            setBillingInfo((prev) => ({
                                ...prev,
                                city: e.target.value,
                            }))
                        }
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Tipo de IVA
                    </label>
                    <select
                        className={checkoutFieldClass}
                        value={billingInfo.vatType}
                        onChange={(e) =>
                            setBillingInfo((prev) => ({
                                ...prev,
                                vatType: e.target.value,
                            }))
                        }
                    >
                        <option value="">Seleccionar</option>
                        {BILLING_VAT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Tipo de documento
                    </label>
                    <select
                        className={checkoutFieldClass}
                        value={billingInfo.documentType}
                        onChange={(e) =>
                            setBillingInfo((prev) => ({
                                ...prev,
                                documentType: e.target.value,
                            }))
                        }
                    >
                        {BILLING_DOCUMENT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Numero
                    </label>
                    <input
                        className={checkoutFieldClass}
                        placeholder="20-12345678-9 / 12345678"
                        type="text"
                        value={billingInfo.documentNumber}
                        onChange={(e) =>
                            setBillingInfo((prev) => ({
                                ...prev,
                                documentNumber: e.target.value,
                            }))
                        }
                    />
                </div>
            </div>
        </div>
    );
}
