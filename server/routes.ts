import express from "express";
import { storage } from "./storage";
import { GooglePlacesService } from "./services/google-places";
import { ScoringService } from "./services/scoring";
import keyRoutes from "./routes/keys.js";
import validateRoutes from "./routes/validate-keys.js";

import { DocxReportService } from "./services/docx-report";
import { EmailTemplateService } from "./services/email-templates";
import { TenPackAnalysisService } from "./services/ten-pack-analysis";
import { 
  analyzeLeadsRequestSchema, 
  generatePdfRequestSchema,
  generateEmailRequestSchema,
  apiKeyValidationSchema,
  type AnalyzeLeadsResponse 
} from "@shared/schema";

// Initialize services
const googlePlaces = new GooglePlacesService();
const scoringService = new ScoringService();
const docxService = new DocxReportService();
const emailService = new EmailTemplateService();

// Sanitization helper for email templates - prevents test data from appearing in production emails
function getSanitizedAgencyName(agencyName?: string): string {
  // If no agency name provided, use default
  if (!agencyName) {
    return 'Review Rocket';
  }
  
  // Filter out common test/development agency names that shouldn't appear in production emails
  const testNames = [
    'coupa cafe',
    'colonnade', 
    'test',
    'demo',
    'example',
    'sample',
    'placeholder',
    'lorem ipsum'
  ];
  
  const lowerName = agencyName.toLowerCase();
  const isTestName = testNames.some(testName => lowerName.includes(testName));
  
  if (isTestName) {
    console.warn(`Sanitizing test agency name "${agencyName}" to default for email template`);
    return 'Review Rocket';
  }
  
  return agencyName;
}

export function registerRoutes(app: express.Application) {
  // Health check endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mount new key management routes
  app.use("/api", keyRoutes);
  app.use("/api", validateRoutes);

  // Legacy compatibility endpoint
  app.get("/api/has-key", async (req, res) => {
    try {
      const has = !!(process.env.OPENAI_API_KEY && process.env.GOOGLE_PLACES_API_KEY);
      res.json({ has });
    } catch (error) {
      res.json({ has: false });
    }
  });

  // Clean, streamlined analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const validated = analyzeLeadsRequestSchema.parse(req.body);
      const { leads: leadInputs, competitors: competitorsInput, manualBusinessData, businessCategory } = validated;

      const totalBusinesses = leadInputs.length + (manualBusinessData?.length || 0);

      
      // Clear existing data
      await storage.clearLeads();
      await storage.clearCompetitors();
      
      const leads = [];
      const competitorsMap: { [leadId: string]: any[] } = {};
      
      // Process each business
      for (const input of leadInputs) {
        try {

          
          // 1. Find business via Google Places API
          const placeDetails = await googlePlaces.findPlaceFromText(input.trim());
          
          if (!placeDetails || !placeDetails.geometry) {
            // If Google Places fails, try AI fallback to find basic business info
            try {
              console.log(`Google Places failed for "${input.trim()}", trying AI fallback...`);
              const aiBusinessInfo = await scoringService.findBusinessWithAI(input.trim());
              console.log('AI Business Info:', aiBusinessInfo);
              
              if (aiBusinessInfo && aiBusinessInfo.found) {
                console.log(`AI found business: ${aiBusinessInfo.name}, creating incomplete entry...`);
                
                // Create incomplete business entry that requires manual data correction
                const incompleteBusinessLead = await storage.createLead({
                  name: aiBusinessInfo.name || input.trim(),
                  address: aiBusinessInfo.address || 'Address found via AI - requires manual verification',
                  placeId: `ai_fallback_${Date.now()}`,
                  rating: 0, // Requires manual input
                  reviewCount: 0, // Requires manual input
                  score: 'C',
                  gapAnalysis: 'Business found via AI but requires manual rating and review count input for complete analysis.',
                  lat: 0,
                  lng: 0,
                });
                
                leads.push(incompleteBusinessLead);
                competitorsMap[incompleteBusinessLead.id] = [];
                console.log(`Created incomplete business lead: ${incompleteBusinessLead.id}`);
                continue;
              } else {
                console.log('AI could not find business either, skipping...');
              }
            } catch (aiError) {
              console.log('AI fallback error:', aiError);
            }
            
            // Skip invalid businesses instead of creating fake data
            continue;
          }

          const rating = placeDetails.rating || 0;
          const reviewCount = placeDetails.user_ratings_total || 0;
          

          
          // 2. Auto-detect business type from Google Places data
          const businessType = await googlePlaces.getBusinessTypeFromPlaceDetails(placeDetails);

          
          // 3. Run 10-pack analysis for competitors
          let competitors = [];
          
          if (competitorsInput && competitorsInput.length > 0) {
            // Use manual competitors if provided

            
            for (const competitorInput of competitorsInput) {
              try {
                const competitorDetails = await googlePlaces.findPlaceFromText(competitorInput.trim());
                if (competitorDetails && competitorDetails.rating && competitorDetails.user_ratings_total) {
                  const competitor = await storage.createCompetitor({
                    leadId: '', // Will be set after lead creation
                    name: competitorDetails.name,
                    rating: competitorDetails.rating,
                    reviewCount: competitorDetails.user_ratings_total,
                    distance: 0,
                    placeId: competitorDetails.place_id || '',
                  });
                  competitors.push(competitor);

                }
              } catch (error) {

              }
            }
          } else {
            // Automatic 10-pack analysis

            
            try {
              // Extract city and state from address
              const addressParts = placeDetails.formatted_address.split(',');
              const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2].trim() : 'local area';
              const state = addressParts.length >= 1 ? addressParts[addressParts.length - 1].trim().split(' ')[0] : '';
              
              // Map business type to search term - use business name if type is generic
              let searchCategory = businessType;
              
              const categoryMap: { [key: string]: string } = {
                'plumber': 'plumbers',
                'electrician': 'electricians', 
                'contractor': 'contractors',
                'roofing_contractor': 'roofing contractors',
                'restaurant': 'restaurants',
                'dentist': 'dentists',
                'doctor': 'doctors',
                'lawyer': 'lawyers',
                'establishment': 'businesses'
              };
              
              // If Google Places returns generic "establishment", extract from business name
              if (businessType === 'establishment') {
                const businessName = placeDetails.name.toLowerCase();
                if (businessName.includes('plumb')) searchCategory = 'plumbers';
                else if (businessName.includes('electric')) searchCategory = 'electricians';
                else if (businessName.includes('hvac') || businessName.includes('heating') || businessName.includes('cooling')) searchCategory = 'hvac contractors';
                else if (businessName.includes('roof')) searchCategory = 'roofing contractors';
                else if (businessName.includes('pest')) searchCategory = 'pest control';
                else if (businessName.includes('clean')) searchCategory = 'cleaning services';
                else if (businessName.includes('restaurant') || businessName.includes('cafe')) searchCategory = 'restaurants';
                else searchCategory = 'businesses';
              } else {
                searchCategory = categoryMap[businessType] || businessType;
              }
              

              const tenPackService = new TenPackAnalysisService(googlePlaces);
              const analysis = await tenPackService.analyzeTenPack(searchCategory, city, state);
              
              // Convert 10-pack results to competitors (exclude current business)
              for (const business of analysis.businesses) {
                if (business.name === placeDetails.name) continue;
                
                const competitor = await storage.createCompetitor({
                  leadId: '', // Will be set after lead creation
                  name: business.name,
                  rating: business.rating,
                  reviewCount: business.reviewCount,
                  distance: 0,
                  placeId: business.placeId,
                });
                competitors.push(competitor);
              }
              

              
              // Generate 10-pack insights
              const tenPackInsights = tenPackService.generateTenPackInsights(
                analysis, 
                placeDetails.name, 
                rating, 
                reviewCount
              );
              
            } catch (error) {
              // Silently handle 10-pack analysis failure and continue
            }
          }
          
          // 4. Score the business with AI insights
          const placeDetailsForLead = {
            id: '',
            name: placeDetails.name,
            address: placeDetails.formatted_address,
            placeId: placeDetails.place_id,
            rating,
            reviewCount,
            score: 'A' as const,
            gapAnalysis: '',
            lat: placeDetails.geometry?.location.lat || 0,
            lng: placeDetails.geometry?.location.lng || 0,
          };
          
          const insights = await scoringService.scoreLeadWithAI(placeDetailsForLead, competitors, {
            originalInput: input,
            searchAttempts: [`Google Places search for: ${input}`],
            searchSuccess: true
          });
          const { score, gapAnalysis } = insights;
          
          // 5. Create lead
          const lead = await storage.createLead({
            name: placeDetails.name,
            address: placeDetails.formatted_address,
            placeId: placeDetails.place_id,
            rating,
            reviewCount,
            score,
            gapAnalysis,
            lat: placeDetails.geometry?.location.lat || 0,
            lng: placeDetails.geometry?.location.lng || 0,
          });
          
          // Update competitor leadId references
          for (const competitor of competitors) {
            competitor.leadId = lead.id;
          }
          
          leads.push(lead);
          competitorsMap[lead.id] = competitors;
          

          
        } catch (error) {
          // Silently handle processing errors and continue
          continue;
        }
      }
      
      // Process manual business data if provided
      if (manualBusinessData && manualBusinessData.length > 0) {

        
        for (const manualBusiness of manualBusinessData) {
          try {

            
            // Create competitors using 10-pack analysis based on business category
            let competitors = [];
            
            if (businessCategory) {
              try {
                // Extract location info for 10-pack analysis
                const location = manualBusiness.address || 'United States';
                const locationParts = location.split(',').map(p => p.trim());
                const city = locationParts.length >= 2 ? locationParts[locationParts.length - 2] : locationParts[0] || 'local area';
                const state = locationParts.length >= 1 ? locationParts[locationParts.length - 1].split(' ')[0] : '';
                

                const tenPackService = new TenPackAnalysisService(googlePlaces);
                const analysis = await tenPackService.analyzeTenPack(businessCategory, city, state);
                
                // Convert 10-pack results to competitors
                for (const business of analysis.businesses) {
                  const competitor = await storage.createCompetitor({
                    leadId: '', // Will be set after lead creation
                    name: business.name,
                    rating: business.rating,
                    reviewCount: business.reviewCount,
                    distance: 0,
                    placeId: business.placeId,
                  });
                  competitors.push(competitor);
                }
                

                
                // Generate 10-pack insights for manual business
                const tenPackInsights = tenPackService.generateTenPackInsights(
                  analysis, 
                  manualBusiness.name, 
                  manualBusiness.rating, 
                  manualBusiness.reviewCount
                );
                
              } catch (error) {
                // Silently handle manual business 10-pack analysis failure
              }
            }
            
            // Score the manual business with AI insights
            const manualBusinessForLead = {
              id: '',
              name: manualBusiness.name,
              address: manualBusiness.address || 'Manual Entry',
              placeId: `manual_${Date.now()}`,
              rating: manualBusiness.rating,
              reviewCount: manualBusiness.reviewCount,
              score: 'A' as const,
              gapAnalysis: '',
              lat: 0,
              lng: 0,
            };
            
            const insights = await scoringService.scoreLeadWithAI(manualBusinessForLead, competitors, {
              originalInput: `${manualBusiness.name} (Manual Entry)`,
              searchAttempts: ['Manual business data entry'],
              searchSuccess: true
            });
            const { score, gapAnalysis } = insights;
            
            // Create lead for manual business
            const lead = await storage.createLead({
              name: manualBusiness.name,
              address: manualBusiness.address || 'Manual Entry',
              placeId: `manual_${Date.now()}`,
              rating: manualBusiness.rating,
              reviewCount: manualBusiness.reviewCount,
              score,
              gapAnalysis,
              lat: 0,
              lng: 0,
            });
            
            // Update competitors with lead ID
            for (const competitor of competitors) {
              competitor.leadId = lead.id;
            }
            
            leads.push(lead);
            competitorsMap[lead.id] = competitors;
            

            
          } catch (error) {
            // Silently handle manual business processing errors
          }
        }
      }
      
      const response: AnalyzeLeadsResponse = {
        leads,
        competitors: competitorsMap,
      };
      
      res.json(response);
      
    } catch (error) {
      res.status(500).json({ 
        message: "Analysis failed. Please check your input and try again." 
      });
    }
  });

  // Get all leads endpoint
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json({ leads });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // DOCX report generation endpoint  
  // DOCX download endpoint for fallback download method
  app.get('/api/docx-download/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const filename = req.query.filename as string || 'report.docx';
      

      
      // Get lead and competitors
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      const competitors = await storage.getCompetitorsByLeadId(leadId);
      
      // Get brand settings from request or use defaults
      const brandSettings = {
        agencyName: 'Review Rocket',
        primaryColor: '#0ea5e9'
      };
      
      // Generate DOCX using the existing docxService variable
      const insights = await scoringService.scoreLeadWithAI(lead, competitors);
      const docxBuffer = await docxService.generateMarketingReport(lead, competitors, insights, brandSettings);
      
      // Set headers for download
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': docxBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      

      res.send(docxBuffer);
      
    } catch (error) {

      res.status(500).json({ 
        error: 'Failed to download DOCX report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/docx", async (req, res) => {
    try {
      const { leadId, brandSettings } = req.body;
      
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      const competitors = await storage.getCompetitorsByLeadId(leadId);
      const insights = await scoringService.scoreLeadWithAI(lead, competitors);

      const docxBuffer = await docxService.generateMarketingReport(lead, competitors, insights, brandSettings);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${lead.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.docx"`);
      res.send(docxBuffer);
      
    } catch (error) {
      res.status(500).json({ message: "DOCX generation failed" });
    }
  });

  // Email template endpoint
  app.post("/api/email-template", async (req, res) => {
    try {
      const { leadId, brandSettings } = req.body;
      
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Sanitize brand settings for email templates - prevent test data from leaking to production
      const sanitizedAgencyName = getSanitizedAgencyName(brandSettings?.agencyName);
      
      const competitors = await storage.getCompetitorsByLeadId(leadId);
      const insights = await scoringService.scoreLeadWithAI(lead, competitors);
      const emailTemplate = await emailService.generateIntelligentOutreach(
        lead, 
        competitors, 
        insights, 
        sanitizedAgencyName
      );
      
      // Return in the format the frontend expects
      res.json({
        subject: emailTemplate.subject,
        emailBody: emailTemplate.body,
        dmMessage: emailTemplate.followUpBody || `Hi! Noticed ${lead.name} has great reviews. Quick question about your online reputation strategy - could there be more growth opportunity?`
      });
      
    } catch (error) {
      res.status(500).json({ message: "Email generation failed" });
    }
  });

  // AI Analysis of Failed Search endpoint
  app.post("/api/ai-analyze-failed-search", async (req, res) => {
    try {
      const { failedSearches, searchAttempts } = req.body;
      
      if (!failedSearches || failedSearches.length === 0) {
        return res.status(400).json({ message: "No failed searches provided" });
      }

      // Use the scoring service to analyze failed searches
      const analysis = await scoringService.analyzeFailedBusinessSearch(
        failedSearches[0], 
        searchAttempts || []
      );
      
      res.json({
        insights: analysis.insights,
        suggestions: analysis.suggestions,
        nextSteps: analysis.nextSteps
      });
      
    } catch (error) {

      res.status(500).json({ 
        insights: "AI analysis failed. Please try again or use manual business data entry.",
        suggestions: [],
        nextSteps: []
      });
    }
  });

  // API Key Management endpoints
  app.get("/api/keys", async (req, res) => {
    try {
      const apiKeys = await storage.getAllApiKeys();
      res.json(apiKeys);
    } catch (error) {

      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/keys", async (req, res) => {
    try {
      const validation = apiKeyValidationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid API key data",
          errors: validation.error.issues 
        });
      }

      const { keyType, keyValue } = validation.data;
      
      // Check if key already exists
      const existingKey = await storage.getApiKeyByType(keyType);
      if (existingKey) {
        return res.status(409).json({ 
          message: `${keyType} API key already exists. Use PUT to update it.` 
        });
      }

      const apiKey = await storage.createApiKey({ keyType, keyValue });
      res.status(201).json(apiKey);
    } catch (error) {

      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.put("/api/keys/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { keyValue } = req.body;

      if (!keyValue) {
        return res.status(400).json({ message: "keyValue is required" });
      }

      const updatedKey = await storage.updateApiKey(id, { keyValue });
      if (!updatedKey) {
        return res.status(404).json({ message: "API key not found" });
      }

      res.json(updatedKey);
    } catch (error) {

      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  app.delete("/api/keys/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteApiKey(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "API key not found" });
      }

      res.status(204).send();
    } catch (error) {

      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  app.post("/api/keys/test", async (req, res) => {
    try {
      const { keyType, keyValue } = req.body;

      if (!keyType || !keyValue) {
        return res.status(400).json({ 
          valid: false, 
          message: "keyType and keyValue are required" 
        });
      }

      // Validate key format first
      const validation = apiKeyValidationSchema.safeParse({ keyType, keyValue });
      if (!validation.success) {
        return res.json({ 
          valid: false, 
          message: "Invalid API key format" 
        });
      }

      let isValid = false;
      let message = "";

      if (keyType === 'google_places') {
        try {
          // Test Google Places API key by making a basic API call
          const response = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=37.7749,-122.4194&radius=100&key=${keyValue}`);
          const data = await response.json();
          
          if (response.ok && data.status !== 'REQUEST_DENIED') {
            isValid = true;
            message = "Google Places API key is valid";
          } else {
            isValid = false;
            message = data.error_message || "Google Places API key test failed";
          }
        } catch (error) {
          isValid = false;
          message = "Google Places API key test failed";
        }
      } else if (keyType === 'openai') {
        try {
          // Test OpenAI API key
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${keyValue}`,
              'Content-Type': 'application/json'
            }
          });
          
          isValid = response.ok;
          message = isValid ? "OpenAI API key is valid" : "OpenAI API key test failed";
        } catch (error) {
          isValid = false;
          message = "OpenAI API key test failed";
        }
      } else {
        return res.json({ 
          valid: false, 
          message: "Unsupported key type" 
        });
      }

      res.json({ valid: isValid, message });
    } catch (error) {

      res.status(500).json({ 
        valid: false, 
        message: "API key test failed" 
      });
    }
  });

}