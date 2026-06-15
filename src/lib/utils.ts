import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .trim()
    .replace(/s$/, ""); // remove trailing 's'
}

export function findMatchingCategory(rawName: string, existingCategories: string[]): string {
  const normRaw = normalizeCategoryName(rawName);
  if (!normRaw) return "Autres";

  const match = existingCategories.find((existing) => {
    return normalizeCategoryName(existing) === normRaw;
  });

  if (match) return match;

  const trimmed = rawName.trim();
  if (trimmed.length > 0) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return "Autres";
}
