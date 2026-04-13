export const HOME_PAGE_DATA = {
    "sections": [
        {
            "id": "hero-main",
            "type": "HeroSlider",
            "props": {}
        },
        {
            "id": "featured-main",
            "type": "FeaturedProducts",
            "props": {
                // We pass products here, normally this would be fetched from catalog based on a collection ID
                // For now, we rely on the component using its own data OR we pass it here.
                // The current FeaturedProducts component expects 'products' prop.
                // In a real CMS, we might pass "collectionId": "featured" and let the component fetch.
                // To keep it simple for now, we'll let HomePage resolve the data or pass empty and handle inside?
                // Wait, FeaturedProducts needs products.
                // Let's assume HomePage will inject the data for now, OR we mock it here.
            }
        },
        {
            "id": "services-main",
            "type": "Services",
            "props": {}
        }
    ]
};
