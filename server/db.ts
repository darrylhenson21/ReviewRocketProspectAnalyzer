import Database from "@replit/database";

const db = new Database();

/**
 * Replit DB facade for persistent key storage
 * Handles Replit DB result format inconsistencies
 */

export async function save<T>(key: string, value: T): Promise<void> {
  try {
    await db.set(key, value);

  } catch (error) {
    throw error;
  }
}

export async function load<T>(key: string): Promise<T | null> {
  try {
    const result = await db.get(key);
    
    // Handle Replit DB format inconsistencies
    if (result === undefined || result === null) {
      return null;
    }
    
    // Check for wrapper format {ok: boolean, value: any}
    if (typeof result === 'object' && result !== null && 'ok' in result && 'value' in result) {
      const wrapper = result as { ok: boolean; value: any };
      return wrapper.ok ? wrapper.value : null;
    }
    
    // Direct value format
    return result as T;
  } catch (error) {
    return null;
  }
}

export async function deleteKey(key: string): Promise<void> {
  try {
    await db.delete(key);

  } catch (error) {
    throw error;
  }
}

export async function list(prefix: string): Promise<string[]> {
  try {
    const keys = await db.list(prefix);
    return Array.isArray(keys) ? keys : [];
  } catch (error) {
    console.error(`Error listing keys with prefix ${prefix}:`, error);
    return [];
  }
}