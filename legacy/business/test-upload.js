/**
 * SCRIPT DE PRUEBA: CARGA DE PRODUCTO
 * Ejecucion: node test-upload.js
 */
const http = require('http');

// CONFIGURACION (Cambia el token si ya tienes uno)
const TENANT_ID = '044e2dea-8a67-40b1-b2d6-728b9c6f7a6c';
const TOKEN = 'TU_TOKEN_AQUI'; // <--- PEGA TU TOKEN AQUI

const productData = {
    sku: "PROD-POWERSHELL-001",
    name: "Producto desde Script",
    price: 15500.00,
    price_wholesale: 12000.00,
    stock: 100,
    brand: "Teflon Pro",
    description: "Este producto fue cargado usando el script de prueba para evitar errores de PowerShell.",
    is_featured: true,
    images: ["/C:/Users/10/.gemini/antigravity/brain/452e78b2-5c52-4daa-ae21-b20685583085/test_product_image_png_1774892800695.png"]
};

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/tenant/products',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
        'Authorization': `Bearer ${TOKEN}`
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('--- RESULTADO ---');
        console.log(`Estado: ${res.statusCode}`);
        console.log('Respuesta:', JSON.parse(data));
    });
});

req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
});

req.write(JSON.stringify(productData));
req.end();
