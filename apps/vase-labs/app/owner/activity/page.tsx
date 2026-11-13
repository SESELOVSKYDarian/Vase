import { redirect } from "next/navigation";

// "Quién quiere comprar" se sacó del Labs nuevo: el interés de cada cliente y los productos que le
// interesan se ven en Conversaciones › Del cliente.
export default function LabsActivityPage() {
  redirect("/owner/inbox");
}
