import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";

type SignInPageProps = {
  searchParams: Promise<{ reset?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect("/app");
  }

  const params = await searchParams;

  return (
    <section className="relative flex min-h-[calc(100svh-12rem)] items-center justify-center overflow-hidden py-8 text-[#191c1b]">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2.5rem]">
        <div className="absolute right-[-10%] top-[-12%] h-[34rem] w-[34rem] rounded-full bg-[#18c37e]/8 blur-[120px]" />
        <div className="absolute bottom-[-8%] left-[-8%] h-[24rem] w-[24rem] rounded-full bg-[#b5ecc8]/35 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBOvu7fZYMEwJLcyafuWAWmGMAEweGoBX2vT6zP2AMwFFiOQJF1hIVL_vXFO7vFeMdSsGU952gZONhj6rL3KV2qV5H-tKFVtd8UgVqML6C6GYyxi4a96yJqqNw_U-gPvwDSGBXNUQ5J4Pga44Y86v2dWXRWUEqm9S9BvrBkDuBnSC1jSaakwCikZiZwu1yBCx8w17AEy2MJi8fNkkDUDQRptJdoCiGf3BarPAg16A4szzv8so5BXHG55GaTBuuLxsDrQxp_P4RL0f4')",
          }}
        />
      </div>

      <div className="flex w-full flex-col items-center justify-center">
        <div className="mb-12 text-center">
          <span className="font-[family-name:var(--font-newsreader)] text-3xl font-bold tracking-tight text-[#191c1b]">
            Vase
          </span>
          <p className="mt-2 text-sm uppercase tracking-[0.22em] text-[#6c7b70]/80">Digital Atrium</p>
        </div>

        <div className="w-full max-w-md rounded-[1.7rem] bg-white p-10 shadow-[0_24px_48px_rgba(25,28,27,0.04)]">
          <header className="mb-10">
            <h1 className="mb-2 font-[family-name:var(--font-newsreader)] text-4xl italic font-medium tracking-[-0.04em] text-[#191c1b]">
              Bienvenido de nuevo
            </h1>
            <p className="text-base leading-7 text-[#3c4a40]">
              {"Ingres\u00E1 tus datos para acceder a tu espacio de trabajo en Vase."}
            </p>
          </header>

          <SignInForm resetSuccess={params.reset === "success"} />
        </div>

        <p className="mt-10 text-sm text-[#3c4a40]">
          {"\u00BFTodav\u00EDa no ten\u00E9s cuenta? "}
          <Link href="/register" className="font-bold text-[#006d43] underline-offset-4 hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </section>
  );
}
