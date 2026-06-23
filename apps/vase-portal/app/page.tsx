const products = ["Vase App", "Vase Business", "Vase Management", "Vase Labs"];

export default function Page() {
  return (
    <main>
      <h1>Vase Platform</h1>
      <p>Portal publico de captacion, marketing, precios, blog, registro y login inicial.</p>
      <a href="https://app.vase.ar/register">Crear cuenta</a>
      <ul>
        {products.map((product) => (
          <li key={product}>{product}</li>
        ))}
      </ul>
    </main>
  );
}
