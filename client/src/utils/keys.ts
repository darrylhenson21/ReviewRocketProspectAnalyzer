export interface KeyStatus {
  google: boolean;
  openai: boolean;
}

/**
 * Client-side key status fetching utility
 * Graceful error handling with safe defaults
 */
export const getKeyStatus = async (): Promise<KeyStatus> => {
  try {
    const response = await fetch('/api/has-keys');
    
    if (!response.ok) {
      console.error('Failed to fetch key status:', response.statusText);
      return { google: false, openai: false };
    }
    
    const status = await response.json();
    return {
      google: !!status.google,
      openai: !!status.openai
    };
  } catch (error) {
    console.error('Error fetching key status:', error);
    // Return safe defaults on failure
    return { google: false, openai: false };
  }
};

/**
 * Save API keys to the backend
 */
export const saveKeys = async (keys: Partial<{ GOOGLE_PLACES_API_KEY: string; OPENAI_API_KEY: string }>) => {
  const response = await fetch('/api/save-keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(keys),
  });
  
  if (!response.ok) {
    throw new Error('Failed to save keys');
  }
  
  return response.json();
};

/**
 * Remove a specific API key
 */
export const removeKey = async (keyType: 'google' | 'openai') => {
  const response = await fetch('/api/remove-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ keyType }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to remove key');
  }
  
  return response.json();
};

/**
 * Clear all API keys
 */
export const clearAllKeys = async () => {
  const response = await fetch('/api/clear-all-keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to clear keys');
  }
  
  return response.json();
};

/**
 * Validate API keys
 */
export const validateKeys = async (keys: Partial<{ GOOGLE_PLACES_API_KEY: string; OPENAI_API_KEY: string }>) => {
  const response = await fetch('/api/validate-keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(keys),
  });
  
  if (!response.ok) {
    throw new Error('Failed to validate keys');
  }
  
  return response.json();
};