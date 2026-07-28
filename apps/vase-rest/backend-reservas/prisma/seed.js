import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reserva.deleteMany();
  await prisma.mesa.deleteMany();

  await prisma.mesa.createMany({
    data: [
      { numero: 1, capacidad: 2, ubicacion: "Ventana" },
      { numero: 2, capacidad: 2, ubicacion: "Interior" },
      { numero: 3, capacidad: 4, ubicacion: "Interior" },
      { numero: 4, capacidad: 4, ubicacion: "Terraza" },
      { numero: 5, capacidad: 6, ubicacion: "Terraza" },
      { numero: 6, capacidad: 8, ubicacion: "Salón principal" }
    ]
  });

  console.log("Mesas de prueba cargadas correctamente");
}

main()
  .catch((error) => {
    console.error("Error al cargar datos:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });