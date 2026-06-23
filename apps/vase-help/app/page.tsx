const sections = ["platform", "business", "management", "labs"];

export default function Page() {
  return (
    <main>
      <h1>Vase Help</h1>
      <p>Documentacion oficial, FAQs, changelog, status y knowledge base para IA.</p>
      <ul>{sections.map((section) => <li key={section}>/{section}</li>)}</ul>
    </main>
  );
}
