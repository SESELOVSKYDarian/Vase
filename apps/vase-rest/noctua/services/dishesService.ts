import type { Dish } from "@/types/dishes";

const STORAGE_KEY = "noctua_dishes";

export async function fetchDishes(): Promise<Dish[]> {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return parsed.map((d: any) => ({
      ...d,
      createdAt: new Date(d.createdAt),
      updatedAt: new Date(d.updatedAt),
    }));
  } catch {
    return [];
  }
}

export async function saveDishes(dishes: Dish[]): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
}

export async function createDish(dish: Dish): Promise<Dish> {
  const dishes = await fetchDishes();
  const newDishes = [...dishes, dish];
  await saveDishes(newDishes);
  return dish;
}

export async function updateDish(id: string, data: Partial<Dish>): Promise<Dish> {
  const dishes = await fetchDishes();
  const updatedDishes = dishes.map(d =>
    d.id === id ? { ...d, ...data } : d
  );
  await saveDishes(updatedDishes);
  const updated = updatedDishes.find(d => d.id === id);
  if (!updated) throw new Error("Dish not found");
  return updated;
}

export async function deleteDish(id: string): Promise<void> {
  const dishes = await fetchDishes();
  const newDishes = dishes.filter(d => d.id !== id);
  await saveDishes(newDishes);
}
