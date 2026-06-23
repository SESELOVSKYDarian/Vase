const launcher = [
  { name: "Vase Business", href: "https://business.vase.ar" },
  { name: "Vase Management", href: "https://management.vase.ar" },
  { name: "Vase Labs", href: "https://labs.vase.ar" },
];

export default function Page() {
  return (
    <main>
      <h1>Vase App</h1>
      <p>Centro canonico de identidad, empresas, tenants, licencias, billing y marketplace.</p>
      <nav>
        {launcher.map((item) => (
          <a key={item.href} href={item.href}>
            {item.name}
          </a>
        ))}
      </nav>
    </main>
  );
}
