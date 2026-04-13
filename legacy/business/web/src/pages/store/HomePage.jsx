import React, { useState, useEffect, useMemo } from "react";
import PageBuilder from "../../components/PageBuilder";
import StoreLayout from "../../components/layout/StoreLayout";
import { getApiBase, getAuthHeaders, getTenantHeaders } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { createPlaceholderImage } from "../../utils/productImage";

import HeroSlider from "../../components/blocks/HeroSlider";
import BrandMarquee from "../../components/blocks/BrandMarquee";
import FeaturedProducts from "../../components/blocks/FeaturedProducts";
import Services from "../../components/blocks/Services";

const buildFeaturedCard = (product, index, isWholesale = false) => {
    const data = product.data || {};
    const rawImages = Array.isArray(data.images) ? data.images : [];
    const rawFirst = rawImages[0];
    const image =
        data.image ||
        data.image_url ||
        (rawFirst && (rawFirst.url || rawFirst.src || rawFirst)) ||
        createPlaceholderImage({ label: "Producto", width: 400, height: 400 });

    const inStock = typeof product.stock === "number" ? product.stock > 0 : true;
    const badge = !inStock ? { text: "Sin stock", className: "bg-zinc-400" } : null;

    return {
        id: product.id,
        sku: product.sku || product.erp_id,
        name: product.name,
        shortDescription:
            product.short_description ||
            data.short_description ||
            data.shortDescription ||
            product.description ||
            "",
        longDescription:
            product.long_description ||
            data.long_description ||
            data.longDescription ||
            product.description ||
            "",
        price: isWholesale ? Number(product.price_wholesale || product.price) : Number(product.price || 0),
        originalPrice: isWholesale && !!product.price_wholesale ? Number(product.price || 0) : null,
        badge: isWholesale && !!product.price_wholesale ? { text: "Mayorista", className: "bg-primary" } : badge,
        image,
        alt: data.image_alt || product.name || "Producto",
        stock: product.stock,
    };
};

export default function HomePage() {
    const { isWholesale } = useAuth();
    const [sections, setSections] = useState(null);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [featuredLoaded, setFeaturedLoaded] = useState(false);

    useEffect(() => {
        async function loadHome() {
            try {
                const response = await fetch(`${getApiBase()}/public/pages/home`, {
                    headers: getTenantHeaders(),
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.sections && data.sections.length) {
                        setSections(data.sections);
                    }
                }

                const productsRes = await fetch(`${getApiBase()}/public/products?limit=4&featured=true`, {
                    headers: { ...getTenantHeaders(), ...getAuthHeaders() },
                });
                if (productsRes.ok) {
                    const pData = await productsRes.json();
                    if (pData.items?.length) {
                        setFeaturedProducts(pData.items.map((it, idx) => buildFeaturedCard(it, idx, isWholesale)));
                    }
                }
            } catch (err) {
                console.error('No se pudo cargar la pagina de inicio', err);
            } finally {
                setFeaturedLoaded(true);
            }
        }
        loadHome();
    }, [isWholesale]);

    const finalSections = useMemo(() => {
        if (!sections) return null;
        return sections
            .filter((section) => section.type !== 'FeaturedProducts' || (featuredLoaded && featuredProducts.length > 0))
            .map((section) => {
                if (section.type === 'FeaturedProducts') {
                    return { ...section, props: { ...section.props, products: featuredProducts } };
                }
                return section;
            });
    }, [sections, featuredLoaded, featuredProducts]);

    return (
        <StoreLayout>
            <div className="flex flex-col">
                {finalSections ? (
                    <PageBuilder sections={finalSections} />
                ) : (
                    <>
                        <HeroSlider />
                        <section id="marcas">
                            <BrandMarquee />
                        </section>
                        {featuredLoaded && featuredProducts.length > 0 ? (
                            <section id="ofertas">
                                <FeaturedProducts products={featuredProducts} />
                            </section>
                        ) : null}
                        <section id="sobre-nosotros">
                            <Services />
                        </section>
                    </>
                )}
            </div>
        </StoreLayout>
    );
}
