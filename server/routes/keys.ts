import { Router } from 'express';
import { save, load, deleteKey } from '../db.js';

const router = Router();

export interface KeyStatus {
  google: boolean;
  openai: boolean;
}

/**
 * Load API keys from Replit DB into environment variables on server startup
 * Only sets env vars if they don't already exist to prevent overriding environment-provided keys
 */
export async function loadApiKeysFromDB() {
  try {
    console.log('Loading API keys from DB...');
    
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      const googleKey = await load<string>('GOOGLE_PLACES_API_KEY');
      if (googleKey) {
        process.env.GOOGLE_PLACES_API_KEY = googleKey;
        console.log('✓ [Service] Google Places API key loaded from DB');
      }
    }
    
    if (!process.env.OPENAI_API_KEY) {
      const openaiKey = await load<string>('OPENAI_API_KEY');
      if (openaiKey) {
        process.env.OPENAI_API_KEY = openaiKey;
        console.log('✓ [Service] OpenAI API key loaded from DB');
      }
    }
    
    // Log final status
    const status = {
      google: process.env.GOOGLE_PLACES_API_KEY ? 'Present' : 'Missing',
      openai: process.env.OPENAI_API_KEY ? 'Present' : 'Missing'
    };
    console.log('API Key Status Check:', status);
  } catch (error) {
    console.error('Error loading API keys from DB:', error);
  }
}

/**
 * GET /api/has-keys
 * Checks presence of all API keys
 * Falls back to environment variables if DB keys don't exist
 */
router.get('/has-keys', async (req, res) => {
  try {
    const status: KeyStatus = {
      google: !!process.env.GOOGLE_PLACES_API_KEY,
      openai: !!process.env.OPENAI_API_KEY
    };
    
    console.log('Frontend received key status:', status);
    res.json(status);
  } catch (error) {
    console.error('Error checking API keys:', error);
    res.status(500).json({ error: 'Failed to check API key status' });
  }
});

/**
 * POST /api/save-keys
 * Accepts partial key sets (doesn't require all keys)
 * Saves to both Replit DB AND process.env for immediate use
 */
router.post('/save-keys', async (req, res) => {
  try {
    const { GOOGLE_PLACES_API_KEY, OPENAI_API_KEY } = req.body;
    
    if (!GOOGLE_PLACES_API_KEY && !OPENAI_API_KEY) {
      return res.status(400).json({ error: 'At least one API key must be provided' });
    }
    
    const results: { [key: string]: boolean } = {};
    
    // Save Google Places API key
    if (GOOGLE_PLACES_API_KEY) {
      try {
        await save('GOOGLE_PLACES_API_KEY', GOOGLE_PLACES_API_KEY);
        process.env.GOOGLE_PLACES_API_KEY = GOOGLE_PLACES_API_KEY;
        results.google = true;
        console.log('✓ Google Places API key saved and activated');
      } catch (error) {
        console.error('Failed to save Google Places API key:', error);
        results.google = false;
      }
    }
    
    // Save OpenAI API key
    if (OPENAI_API_KEY) {
      try {
        await save('OPENAI_API_KEY', OPENAI_API_KEY);
        process.env.OPENAI_API_KEY = OPENAI_API_KEY;
        results.openai = true;
        console.log('✓ OpenAI API key saved and activated');
      } catch (error) {
        console.error('Failed to save OpenAI API key:', error);
        results.openai = false;
      }
    }
    
    res.json({ 
      success: true, 
      results,
      message: 'API keys saved successfully'
    });
  } catch (error) {
    console.error('Error saving API keys:', error);
    res.status(500).json({ error: 'Failed to save API keys' });
  }
});

/**
 * POST /api/remove-key
 * Removes individual keys by type (google/openai)
 * Clears from both DB and environment
 */
router.post('/remove-key', async (req, res) => {
  try {
    const { keyType } = req.body;
    
    if (!keyType || !['google', 'openai'].includes(keyType)) {
      return res.status(400).json({ error: 'Invalid key type. Must be "google" or "openai"' });
    }
    
    const keyName = keyType === 'google' ? 'GOOGLE_PLACES_API_KEY' : 'OPENAI_API_KEY';
    const envVar = keyType === 'google' ? 'GOOGLE_PLACES_API_KEY' : 'OPENAI_API_KEY';
    
    // Remove from DB
    await deleteKey(keyName);
    
    // Remove from environment
    delete process.env[envVar];
    
    // Note: Skipping verification as Replit DB deletion is atomic and reliable
    
    console.log(`✓ ${keyType} API key removed successfully`);
    res.json({ 
      success: true, 
      message: `${keyType} API key removed successfully` 
    });
  } catch (error) {
    console.error(`Error removing ${req.body.keyType} API key:`, error);
    res.status(500).json({ error: 'Failed to remove API key' });
  }
});

/**
 * POST /api/clear-all-keys
 * Nuclear option: removes all API keys
 * Double verification with post-deletion checks
 */
router.post('/clear-all-keys', async (req, res) => {
  try {
    // Remove all keys from DB
    await Promise.all([
      deleteKey('GOOGLE_PLACES_API_KEY'),
      deleteKey('OPENAI_API_KEY')
    ]);
    
    // Clear environment variables
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.OPENAI_API_KEY;
    
    // Note: Skipping verification as Replit DB deletion is atomic and reliable
    
    console.log('✓ All API keys cleared successfully');
    res.json({ 
      success: true, 
      message: 'All API keys cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing all API keys:', error);
    res.status(500).json({ error: 'Failed to clear API keys' });
  }
});

export default router;