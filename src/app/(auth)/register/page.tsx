import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/app");
  }

  return (
    <section className="flex min-h-[calc(100svh-12rem)] items-center justify-center py-8 text-[#191c1b]">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_48px_rgba(25,28,27,0.04)] md:grid-cols-2">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#f2f4f2] p-12 md:flex">
          <div className="relative z-10">
            <h1 className="mb-6 max-w-lg font-[family-name:var(--font-newsreader)] text-5xl font-medium leading-tight tracking-[-0.05em] text-[#191c1b]">
              {"Cultiv\u00E1 tu "}
              <span className="italic">{"jard\u00EDn digital"}</span>
              {" con Vase."}
            </h1>
            <p className="max-w-sm text-lg leading-relaxed text-[#3c4a40]">
              {"Sumate a equipos que cambiaron la complejidad innecesaria por una operaci\u00F3n m\u00E1s clara, conectada y sostenible."}
            </p>
          </div>

          <div className="relative mt-8 h-64">
            <div className="absolute right-0 top-0 z-10 w-64 translate-x-12 translate-y-8 rotate-3 rounded-[1.4rem] border border-white/20 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,#006d43_0%,#18c37e_100%)] text-white">
                  <span className="text-lg">+</span>
                </div>
                <div className="h-4 w-24 rounded-full bg-[#e6e9e7]" />
              </div>
              <div className="space-y-3">
                <div className="h-2 w-full rounded-full bg-[#e6e9e7]" />
                <div className="h-2 w-5/6 rounded-full bg-[#e6e9e7]" />
                <div className="h-2 w-4/6 rounded-full bg-[#e6e9e7]" />
              </div>
            </div>

            <img
              alt=""
              className="absolute inset-0 h-full w-full rounded-[1.4rem] object-cover opacity-20 mix-blend-multiply"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBmkGzLuRflimhoS4l_5wR3hfg2vuIUN6y7jVSBL_EQqjXrhrAbGSe1UUrOe-OQPBdGzML1lroXVwN4h87xPSHdhq8hVO9ujmo5jtxZzgJLSRxhRI1gC3A8DxHSs90tj02NRgnuydlK_qUzTzyVanRHcmH-uOpc6uvRqzqU5spmCd9FZkrTSbP5ZBXUVQpLu3QcqpSNj0c0JYlgF2SXnXPBBPdo9fL4jkg1ie37mXkaqdF4gcqb8qxyeQZEdKs-7a_2aYVvpLf6yU"
            />
          </div>

          <div className="relative z-10 pt-8">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-[#6c7b70]">
              <span className="h-px w-8 bg-[#bbcabe]" />
              Premium SaaS Experience
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center p-8 md:p-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 text-center md:text-left">
              <h2 className="mb-2 font-[family-name:var(--font-newsreader)] text-3xl font-semibold tracking-[-0.04em] text-[#191c1b]">
                Crear cuenta
              </h2>
              <p className="text-[#3c4a40]">{"Empez\u00E1 tu prueba inicial y configur\u00E1 tu espacio en Vase."}</p>
            </div>

            <RegisterForm />

            <p className="mt-10 text-center text-sm text-[#3c4a40]">
              {"\u00BFYa ten\u00E9s una cuenta? "}
              <Link href="/signin" className="font-bold text-[#006d43] hover:underline">
                {"Iniciar sesi\u00F3n"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
