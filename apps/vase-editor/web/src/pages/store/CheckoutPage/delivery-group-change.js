// Checkout: cambio entre envío y retiro.
import { DISTANCE_DELIVERY_KEY } from '../../../utils/shipping';

/** Arma handleDeliveryGroupChange con lo que necesita del componente. */
export function makeHandleDeliveryGroupChange({ pickupDeliveryOptions, setDeliveryMethod, shippingDeliveryOptions }) {
    return (nextGroup) => {
        if (nextGroup === "pickup") {
            const nextPickup = pickupDeliveryOptions[0];
            if (nextPickup) {
                setDeliveryMethod(nextPickup.key);
            }
            return;
        }
        const nextShipping =
            shippingDeliveryOptions.find((option) => option.key === DISTANCE_DELIVERY_KEY) ||
            shippingDeliveryOptions[0];
        if (nextShipping) {
            setDeliveryMethod(nextShipping.key);
        }
    };
}
