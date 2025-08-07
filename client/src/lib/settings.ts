import { BrandSettings, brandSettingsSchema } from "@shared/schema";

const STORAGE_KEY = 'brandSettings';

export function getBrandSettings(): BrandSettings {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return brandSettingsSchema.parse(parsed);
    }
  } catch (error) {
    // Silently handle storage errors with fallback to defaults
  }
  
  // Return defaults
  return brandSettingsSchema.parse({});
}

export function saveBrandSettings(settings: BrandSettings): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    // Silently handle storage errors
  }
}

export function resetBrandSettings(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Silently handle storage errors
  }
}
