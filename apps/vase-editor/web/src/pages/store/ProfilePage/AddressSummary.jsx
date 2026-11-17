// Mi cuenta en la tienda: la dirección y la facturación guardadas (modo lectura).
import { Home } from './profile-helpers.jsx';
import { Phone } from './profile-helpers.jsx';
import { User } from './profile-helpers.jsx';
import { buildPhone } from './profile-helpers.jsx';
import { getBillingDocumentLabel } from '../../../utils/billing';
import { getBillingVatLabel } from '../../../utils/billing';

export default function AddressSummary({ address, billingDetails, hasProfileBillingInfo, profileName, roleLabel }) {
    return (
        <div className="space-y-3">
            <div className="flex items-start gap-3">
                <User className="text-primary w-5 h-5 mt-1" />
                <div>
                    <p className="font-bold text-sm">{profileName}</p>
                    <p className="text-xs text-[#8a7560]">Cuenta {roleLabel}</p>
                </div>
            </div>
            <div className="flex items-start gap-3">
                <Home className="text-primary w-5 h-5 mt-1" />
                <div>
                    {address.line1 ? (
                        <>
                            <p className="text-sm">{address.line1}</p>
                            {address.city || address.postal ? (
                                <p className="text-sm">
                                    {address.city}
                                    {address.postal ? `${address.city ? ', ' : ''}${address.postal}` : ''}
                                </p>
                            ) : null}
                            <p className="text-sm font-semibold">{[address.region, address.country].filter(Boolean).join(', ')}</p>
                        </>
                    ) : (
                        <p className="text-sm text-[#8a7560]">
                            Aca vas a ver la direccion que cargaste en el registro o la que edites despues.
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-start gap-3">
                <Phone className="text-primary w-5 h-5 mt-1" />
                <p className="text-sm">
                    {buildPhone(address.phoneCountry, address.phoneNumber) || 'Sin telefono cargado'}
                </p>
            </div>
            <div className="border-t border-[#e5e1de] pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a7560] mb-2">
                    Facturacion
                </p>
                {hasProfileBillingInfo ? (
                    <div className="space-y-1 text-sm">
                        <p className="font-semibold text-[#181411] dark:text-white">
                            {billingDetails.businessName}
                        </p>
                        <p className="text-[#181411] dark:text-white">
                            {billingDetails.address || '-'}
                        </p>
                        <p className="text-[#181411] dark:text-white">
                            {billingDetails.city || '-'}
                        </p>
                        <p className="text-[#181411] dark:text-white">
                            IVA: {getBillingVatLabel(billingDetails.vatType)}
                        </p>
                        <p className="text-[#181411] dark:text-white">
                            {getBillingDocumentLabel(billingDetails.documentType)}: {billingDetails.documentNumber || '-'}
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-[#8a7560]">
                        Agrega tus datos de facturacion para reutilizarlos al hacer pedidos.
                    </p>
                )}
            </div>
        </div>
    );
}
