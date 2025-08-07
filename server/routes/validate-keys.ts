import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

interface ValidationResult {
  valid: boolean;
  service: string;
  message: string;
}

/**
 * POST /api/validate-keys
 * Live validation against actual API endpoints
 * Validates keys against real services without making destructive calls
 */
router.post('/validate-keys', async (req, res) => {
  try {
    const { GOOGLE_PLACES_API_KEY, OPENAI_API_KEY } = req.body;
    
    if (!GOOGLE_PLACES_API_KEY && !OPENAI_API_KEY) {
      return res.status(400).json({ error: 'At least one API key must be provided for validation' });
    }
    
    const results: ValidationResult[] = [];
    
    // Validate Google Places API key
    if (GOOGLE_PLACES_API_KEY) {
      try {
        // Test search request to validate the key
        const googleResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=test&inputtype=textquery&key=${GOOGLE_PLACES_API_KEY}`
        );
        
        const googleData = await googleResponse.json() as any;
        
        if (googleData.error_message && googleData.error_message.includes('API key')) {
          results.push({
            valid: false,
            service: 'google',
            message: 'Invalid Google Places API key'
          });
        } else {
          results.push({
            valid: true,
            service: 'google',
            message: 'Google Places API key is valid'
          });
        }
      } catch (error) {
        results.push({
          valid: false,
          service: 'google',
          message: 'Failed to validate Google Places API key'
        });
      }
    }
    
    // Validate OpenAI API key
    if (OPENAI_API_KEY) {
      try {
        // List models endpoint to validate the key
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (openaiResponse.status === 401) {
          results.push({
            valid: false,
            service: 'openai',
            message: 'Invalid OpenAI API key'
          });
        } else if (openaiResponse.ok) {
          results.push({
            valid: true,
            service: 'openai',
            message: 'OpenAI API key is valid'
          });
        } else {
          results.push({
            valid: false,
            service: 'openai',
            message: 'Failed to validate OpenAI API key'
          });
        }
      } catch (error) {
        results.push({
          valid: false,
          service: 'openai',
          message: 'Failed to validate OpenAI API key'
        });
      }
    }
    
    const allValid = results.every(result => result.valid);
    
    res.json({
      success: true,
      allValid,
      results
    });
  } catch (error) {
    console.error('Error validating API keys:', error);
    res.status(500).json({ error: 'Failed to validate API keys' });
  }
});

export default router;