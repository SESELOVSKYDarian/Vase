import Link from "next/link";
import { SearchBox } from "./_components/ui";

export default function NotFound() {
  return (
    <main className="wrap narrow">
      <header className="art-head" style={{ paddingTop: 56 }}>
        <h1>No encontramos esa página</h1>
        <p>Puede que la guía haya cambiado de nombre. Buscala acá o volvé al <Link href="/" style={{ textDecoration: "underline" }}>inicio de la ayuda</Link>.</p>
      </header>
      <SearchBox />
    </main>
  );
}
