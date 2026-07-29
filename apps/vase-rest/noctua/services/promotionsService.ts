import type { Promotion } from "@/types/promotions";

const STORAGE_KEY = "noctua_promotions";

export async function fetchPromotions(): Promise<Promotion[]> {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return parsed.map((p: any) => ({
      ...p,
      startDate: new Date(p.startDate),
      expirationDate: new Date(p.expirationDate),
      createdAt: new Date(p.createdAt),
    }));
  } catch {
    return [];
  }
}

export async function savePromotions(promotions: Promotion[]): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(promotions));
}

export async function createPromotion(promo: Promotion): Promise<Promotion> {
  const promotions = await fetchPromotions();
  const newPromotions = [...promotions, promo];
  await savePromotions(newPromotions);
  return promo;
}

export async function updatePromotion(id: string, data: Partial<Promotion>): Promise<Promotion> {
  const promotions = await fetchPromotions();
  const updatedPromotions = promotions.map(p =>
    p.id === id ? { ...p, ...data } : p
  );
  await savePromotions(updatedPromotions);
  const updated = updatedPromotions.find(p => p.id === id);
  if (!updated) throw new Error("Promotion not found");
  return updated;
}

export async function deletePromotion(id: string): Promise<void> {
  const promotions = await fetchPromotions();
  const newPromotions = promotions.filter(p => p.id !== id);
  await savePromotions(newPromotions);
}
