import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { PedidoListoAlerta } from "@/components/mesas/PedidoListoAlerta";
import styles from "./dashboard.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.dashboard}>
      <Sidebar />

      <main className={styles.main}>
        <Navbar />

        <div className={styles.content}>
          {children}
        </div>
      </main>

      {/* Notificación global — activa en todas las páginas del dashboard */}
      <PedidoListoAlerta />
    </div>
  );
}