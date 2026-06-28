import { pool } from '../db.js';

export async function resolveTaxDetails(tenantId, items, customer, shippingAmount = 0) {
    try {
        const settingsRes = await pool.query('select commerce from tenant_settings where tenant_id = $1', [tenantId]);
        const commerce = settingsRes.rows[0]?.commerce || {};

        // Default constraints for VAT and categorical taxes
        // Can be overridden via admin panel in settings.commerce.taxes_config
        const defaultTaxConfig = {
            base_rate: 0.19, // 19% IVA standard
            categories: {
                // In a real scenario, this matches uuid to additional rate.
                // e.g. "uuid-electronics": 0.05, "uuid-luxury": 0.08
            },
            country_rates: {
                // Differential tax behavior per country
                // e.g. "CL": 0.19, "UY": 0.22
            }
        };

        const taxConfig = { ...defaultTaxConfig, ...(commerce.taxes_config || {}) };

        // Regional adjustments
        const region = String(customer?.country || customer?.countryCode || 'AR').toUpperCase();
        let regionBaseRate = taxConfig.base_rate;
        if (taxConfig.country_rates && taxConfig.country_rates[region] !== undefined) {
            regionBaseRate = taxConfig.country_rates[region];
        }

        let totalTax = 0;
        const taxDetails = {
            base_tax: 0,
            base_rate_applied: regionBaseRate,
            additional_taxes: 0,
            shipping_tax: 0,
        };

        // If regional variations dictate zero tax, we bypass item calculations
        if (regionBaseRate < 0) {
            // Can be used for exception regions
            return { total_tax: 0, tax_details: taxDetails };
        }

        // Calculate item by item
        (items || []).forEach(item => {
            let additionalRate = 0;
            if (item.category_ids && Array.isArray(item.category_ids)) {
                item.category_ids.forEach(cid => {
                    const extra = taxConfig.categories[cid] || taxConfig.categories[String(cid).toLowerCase()];
                    if (extra !== undefined) {
                        additionalRate = Math.max(additionalRate, Number(extra));
                    }
                });
            }

            const itemBaseTax = item.total * regionBaseRate;
            const itemAdditionalTax = item.total * additionalRate;

            taxDetails.base_tax += itemBaseTax;
            taxDetails.additional_taxes += itemAdditionalTax;
            totalTax += (itemBaseTax + itemAdditionalTax);
        });

        // Shipping Tax
        if (shippingAmount > 0) {
            taxDetails.shipping_tax = shippingAmount * regionBaseRate;
            totalTax += taxDetails.shipping_tax;
        }

        return {
            total_tax: totalTax,
            tax_details: taxDetails
        };
    } catch (err) {
        console.error('Error in resolveTaxDetails:', err);
        return {
            total_tax: 0,
            tax_details: { base_tax: 0, additional_taxes: 0, shipping_tax: 0 }
        };
    }
}
