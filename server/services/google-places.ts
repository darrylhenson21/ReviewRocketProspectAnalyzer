import { storage } from '../storage';

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  hasIncompleteData?: boolean; // Flag to indicate when Google Places API data is incomplete
}

interface NearbySearchResult {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export class GooglePlacesService {
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  private async getApiKey(): Promise<string> {
    // Use environment variable (Replit Secrets) as primary source
    const envKey = process.env.GOOGLE_API_KEY;
    // Debug logging removed - API key working correctly
    
    if (envKey && envKey.trim()) {
      return envKey.trim();
    }

    // Fallback to storage for development/legacy support
    try {
      const apiKeyRecord = await storage.getApiKeyByType('google_places');
      if (apiKeyRecord && apiKeyRecord.keyValue) {

        return apiKeyRecord.keyValue;
      }
    } catch (error) {
      // Silently handle storage fallback error
    }

    throw new Error('Google Places API key not found. Please add GOOGLE_API_KEY in Replit Secrets.');
  }

  async findPlaceFromText(input: string): Promise<PlaceDetails | null> {
    try {
      // Check if input looks like a URL
      const isUrl = input.trim().startsWith('http');
      
      if (isUrl) {
        // First try to extract place_id from Google Maps URL
        const placeId = this.extractPlaceIdFromUrl(input);
        if (placeId) {
          const result = await this.getPlaceDetails(placeId);
          if (result) {
            return result;
          }
        }

        // If place ID extraction failed, try to extract business name from URL
        const businessName = this.extractBusinessNameFromUrl(input);
        if (businessName) {
  
          return await this.searchByText(businessName);
        }

        // Final fallback: use the whole URL as search input

        return await this.searchByText(input);
      } else {
        // Direct text search for non-URL input
        return await this.searchByText(input);
      }
    } catch (error) {
      return null;
    }
  }

  private async searchByText(searchText: string): Promise<PlaceDetails | null> {
    try {
      // Try multiple search variations for better results
      const searchVariations = this.generateSearchVariations(searchText);
      
      for (const variation of searchVariations) {

        
        // Try Find Place from Text API first
        const apiKey = await this.getApiKey();
        const findPlaceUrl = `${this.baseUrl}/findplacefromtext/json?input=${encodeURIComponent(variation)}&inputtype=textquery&fields=place_id,name,formatted_address,rating,user_ratings_total,geometry&key=${apiKey}`;
        
        const findPlaceResponse = await fetch(findPlaceUrl);
        const findPlaceData = await findPlaceResponse.json();

        if (findPlaceData.status === 'OK' && findPlaceData.candidates && findPlaceData.candidates.length > 0) {
          const candidate = findPlaceData.candidates[0];

          
          // Validate that the returned business name actually matches the search query



          
          let isMatch = this.isBusinessNameMatch(searchText, candidate.name);
          console.log(`   Exact Match Result: ${isMatch}`);
          
          // If exact match fails, try business type matching for category searches
          if (!isMatch && (variation.includes('pest control') || variation.includes('exterminator'))) {
            isMatch = this.isBusinessTypeMatch(searchText, candidate.name, 'pest control');
            console.log(`   Category Match Result: ${isMatch}`);
          }
          
          if (!isMatch) {
            console.log(`❌ Business name mismatch: searched for "${searchText}" but found "${candidate.name}" - skipping`);
            continue; // Try next search variation
          }
          
          console.log(`✅ Business name validated: "${candidate.name}" matches search "${searchText}"`);
          
          // If we got a place_id, get full details, otherwise use what we have
          if (candidate.place_id && (!candidate.rating || !candidate.user_ratings_total)) {
            const fullDetails = await this.getPlaceDetails(candidate.place_id);
            if (fullDetails) return fullDetails;
          }
          
          // Check if we have incomplete data (common Google Places API issue)
          const hasIncompleteData = !candidate.rating || candidate.rating === 0 || !candidate.user_ratings_total || candidate.user_ratings_total === 0;
          
          if (hasIncompleteData) {
            console.log(`⚠️  INCOMPLETE DATA DETECTED: ${candidate.name} has ${candidate.rating || 0} rating and ${candidate.user_ratings_total || 0} reviews`);
            console.log(`📋 This business was found but Google Places API data appears incomplete`);
          }

          // Return the candidate data directly if we have what we need
          return {
            place_id: candidate.place_id,
            name: candidate.name,
            formatted_address: candidate.formatted_address,
            rating: candidate.rating,
            user_ratings_total: candidate.user_ratings_total,
            geometry: candidate.geometry,
            types: candidate.types,
            hasIncompleteData: hasIncompleteData // Flag for frontend to prompt manual entry
          };
        }
        
        // If Find Place failed, try Text Search API as fallback
        console.log(`Find Place failed for "${variation}", trying Text Search...`);
        const textSearchUrl = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(variation)}&key=${apiKey}`;
        
        const textSearchResponse = await fetch(textSearchUrl);
        const textSearchData = await textSearchResponse.json();

        if (textSearchData.status === 'OK' && textSearchData.results && textSearchData.results.length > 0) {
          const result = textSearchData.results[0];
          console.log(`Found business via Text Search: ${result.name} at ${result.formatted_address}`);
          
          // Also validate Text Search results for business name match
          let isTextMatch = this.isBusinessNameMatch(searchText, result.name);
          
          // If exact match fails, try business type matching for category searches
          if (!isTextMatch && (variation.includes('pest control') || variation.includes('exterminator'))) {
            isTextMatch = this.isBusinessTypeMatch(searchText, result.name, 'pest control');
            console.log(`   Text Search Category Match Result: ${isTextMatch}`);
          }
          
          if (!isTextMatch) {
            console.log(`❌ Business name mismatch in Text Search: searched for "${searchText}" but found "${result.name}" - skipping`);
            continue; // Try next search variation
          }
          
          console.log(`✅ Text Search business name validated: "${result.name}" matches search "${searchText}"`);
          
          // Check if we have incomplete data (common Google Places API issue)
          const hasIncompleteData = !result.rating || result.rating === 0 || !result.user_ratings_total || result.user_ratings_total === 0;
          
          if (hasIncompleteData) {
            console.log(`⚠️  INCOMPLETE DATA DETECTED: ${result.name} has ${result.rating || 0} rating and ${result.user_ratings_total || 0} reviews`);
            console.log(`📋 This business was found but Google Places API data appears incomplete`);
          }

          return {
            place_id: result.place_id,
            name: result.name,
            formatted_address: result.formatted_address,
            rating: result.rating,
            user_ratings_total: result.user_ratings_total,
            geometry: result.geometry,
            types: result.types,
            hasIncompleteData: hasIncompleteData // Flag for frontend to prompt manual entry
          };
        }
        
        console.log(`Both APIs failed for variation: "${variation}"`);
      }

      console.log(`No results found for any variation of: ${searchText}`);
      return null;
    } catch (error) {
      console.error('Error in text search:', error);
      return null;
    }
  }

  private isBusinessNameMatch(searchQuery: string, foundBusinessName: string): boolean {
    // Extract business name from search query (before any comma)
    const searchBusinessName = searchQuery.trim().split(',')[0].trim().toLowerCase();
    const foundName = foundBusinessName.toLowerCase();
    
    // Remove common business suffixes for comparison
    const cleanSearchName = this.cleanBusinessName(searchBusinessName);
    const cleanFoundName = this.cleanBusinessName(foundName);
    
    // Remove location terms from search query to focus on business name
    const searchWithoutLocation = this.removeLocationTerms(cleanSearchName);
    const foundWithoutLocation = this.removeLocationTerms(cleanFoundName);
    
    console.log(`   Clean Search: "${cleanSearchName}"`);
    console.log(`   Clean Found: "${cleanFoundName}"`);
    console.log(`   Search Without Location: "${searchWithoutLocation}"`);
    console.log(`   Found Without Location: "${foundWithoutLocation}"`);
    
    // Check for exact match (prioritize location-filtered comparison)
    if (foundWithoutLocation === searchWithoutLocation && searchWithoutLocation.trim() !== '') {
      console.log(`✅ Exact match found (location-filtered)`);
      return true;
    }
    
    // Fallback to full name comparison
    if (cleanFoundName === cleanSearchName) {
      console.log(`✅ Exact match found (full name)`);
      return true;
    }
    
    // Extract key business name words (use location-filtered names when possible)
    const searchWords = (searchWithoutLocation.trim() || cleanSearchName).split(' ').filter(word => word.length > 2);
    const foundWords = (foundWithoutLocation.trim() || cleanFoundName).split(' ').filter(word => word.length > 2);
    
    console.log(`   Search Keywords: [${searchWords.join(', ')}]`);
    console.log(`   Found Keywords: [${foundWords.join(', ')}]`);
    
    // Check if main business name keywords match with STRICT criteria
    let keywordMatches = 0;
    let exactMatches = 0;
    let totalKeywords = Math.max(searchWords.length, 1);
    
    for (const searchWord of searchWords) {
      for (const foundWord of foundWords) {
        // Exact word match gets priority
        if (searchWord === foundWord) {
          keywordMatches++;
          exactMatches++;
          break;
        }
        // Allow partial matches only for longer words and only if they're very similar
        else if (searchWord.length > 4 && foundWord.length > 4) {
          if (foundWord.includes(searchWord) || searchWord.includes(foundWord)) {
            // Calculate similarity for partial matches to avoid false positives
            const partialSimilarity = this.calculateStringSimilarity(searchWord, foundWord);
            if (partialSimilarity >= 0.8) { // 80% similarity for partial matches
              keywordMatches++;
              break;
            }
          }
        }
      }
    }
    
    const keywordMatchRatio = keywordMatches / totalKeywords;
    const exactMatchRatio = exactMatches / totalKeywords;
    
    console.log(`   Keyword Match Ratio: ${keywordMatches}/${totalKeywords} = ${(keywordMatchRatio * 100).toFixed(1)}%`);
    console.log(`   Exact Match Ratio: ${exactMatches}/${totalKeywords} = ${(exactMatchRatio * 100).toFixed(1)}%`);
    
    // BALANCED STRICT CRITERIA: 
    // 1. For single-word searches: require exact match
    // 2. For multi-word searches: require at least 1 exact match of primary business name
    // 3. Ignore location words when matching
    
    if (totalKeywords === 1) {
      // Single word searches need exact match
      if (exactMatches === 1) {
        console.log(`✅ Single word exact match validated`);
        return true;
      }
    } else {
      // Multi-word searches: Must have at least 1 exact business name match
      // But ignore clearly different business types (bistro vs grille, etc.)
      
      // First check if this is likely the same business type
      const searchTypeWords = ['restaurant', 'cafe', 'bistro', 'grill', 'grille', 'bar', 'pub', 'diner', 'pizzeria', 'bakery'];
      const searchHasType = searchWords.some(word => searchTypeWords.includes(word));
      const foundHasType = foundWords.some(word => searchTypeWords.includes(word));
      
      if (searchHasType && foundHasType) {
        // Both have business type words - check if types are compatible
        const searchTypes = searchWords.filter(word => searchTypeWords.includes(word));
        const foundTypes = foundWords.filter(word => searchTypeWords.includes(word));
        
        const hasTypeMatch = searchTypes.some(sType => 
          foundTypes.some(fType => sType === fType || 
                         (sType === 'grill' && fType === 'grille') ||
                         (sType === 'grille' && fType === 'grill'))
        );
        
        if (!hasTypeMatch) {
          console.log(`❌ Different business types: [${searchTypes.join(', ')}] vs [${foundTypes.join(', ')}]`);
          return false;
        }
      }
      
      // Now check for business name matches with ADAPTIVE criteria based on location filtering
      // If location terms were removed, be more lenient
      const hasLocationTerms = searchWithoutLocation.length < cleanSearchName.length;
      let requiredMatchRatio = hasLocationTerms ? 0.6 : 0.75; // More lenient if location terms were filtered
      const requiredMatches = Math.ceil(totalKeywords * requiredMatchRatio);
      
      if (exactMatches >= requiredMatches) {
        console.log(`✅ Validation passed (${exactMatches}/${requiredMatches} required exact matches, ratio: ${requiredMatchRatio})`);
        return true;
      } else {
        console.log(`❌ Insufficient exact matches (${exactMatches}/${requiredMatches} required, ratio: ${requiredMatchRatio})`);
      }
    }
    
    // Fall back to very high similarity only for edge cases
    const similarity = this.calculateStringSimilarity(cleanSearchName, cleanFoundName);
    
    // Use extremely high similarity threshold (95%) for fallback matching to prevent false positives
    if (similarity >= 0.95) {
      console.log(`✅ Extremely high similarity match (${(similarity * 100).toFixed(1)}%): "${cleanSearchName}" ≈ "${cleanFoundName}"`);
      return true;
    }
    
    console.log(`❌ No match found - Keyword: ${(keywordMatchRatio * 100).toFixed(1)}%, Exact: ${(exactMatchRatio * 100).toFixed(1)}%, Similarity: ${(similarity * 100).toFixed(1)}%`);
    return false;
  }
  
  private cleanBusinessName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(restaurant|cafe|bistro|diner|grill|bar|pub|llc|inc|corp|ltd|co\.?)\b/g, '')
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private removeLocationTerms(name: string): string {
    // Common location terms that should be ignored in business name matching
    const locationTerms = [
      // US States (abbreviated and full)
      'al', 'alabama', 'ak', 'alaska', 'az', 'arizona', 'ar', 'arkansas', 'ca', 'california',
      'co', 'colorado', 'ct', 'connecticut', 'de', 'delaware', 'fl', 'florida', 'ga', 'georgia',
      'hi', 'hawaii', 'id', 'idaho', 'il', 'illinois', 'in', 'indiana', 'ia', 'iowa',
      'ks', 'kansas', 'ky', 'kentucky', 'la', 'louisiana', 'me', 'maine', 'md', 'maryland',
      'ma', 'massachusetts', 'mi', 'michigan', 'mn', 'minnesota', 'ms', 'mississippi',
      'mo', 'missouri', 'mt', 'montana', 'ne', 'nebraska', 'nv', 'nevada', 'nh', 'new hampshire',
      'nj', 'new jersey', 'nm', 'new mexico', 'ny', 'new york', 'nc', 'north carolina',
      'nd', 'north dakota', 'oh', 'ohio', 'ok', 'oklahoma', 'or', 'oregon', 'pa', 'pennsylvania',
      'ri', 'rhode island', 'sc', 'south carolina', 'sd', 'south dakota', 'tn', 'tennessee',
      'tx', 'texas', 'ut', 'utah', 'vt', 'vermont', 'va', 'virginia', 'wa', 'washington',
      'wv', 'west virginia', 'wi', 'wisconsin', 'wy', 'wyoming',
      // Common city/location terms
      'city', 'town', 'village', 'downtown', 'metro', 'area', 'region', 'county',
      // Common Texas cities (since this seems to be a common case)
      'houston', 'dallas', 'austin', 'san antonio', 'fort worth', 'el paso', 'arlington',
      'corpus christi', 'plano', 'laredo', 'lubbock', 'garland', 'irving', 'amarillo',
      'grand prairie', 'brownsville', 'pasadena', 'mesquite', 'mckinney', 'killeen',
      'frisco', 'carrollton', 'denton', 'midland', 'abilene', 'beaumont', 'round rock',
      'richardson', 'odessa', 'waco', 'lewisville', 'tyler', 'college station', 'pearland',
      'sugar land', 'baytown', 'conroe', 'longview', 'bryan', 'pharr', 'missouri city',
      'temple', 'flower mound', 'league city', 'cedar park', 'harlingen', 'north richland hills',
      'victoria', 'san marcos', 'new braunfels', 'georgetown', 'sherman', 'rowlett',
      'texarkana', 'huntsville', 'galveston', 'cedar hill', 'wylie', 'desoto', 'burleson',
      'mansfield', 'allen', 'the woodlands', 'pflugerville', 'big spring', 'mission',
      'port arthur', 'euless', 'grapevine', 'bedford', 'hurst', 'keller', 'coppell',
      'duncanville', 'haltom city', 'farmers branch', 'southlake', 'lancaster', 'carrollton',
      'lorena', 'hewitt', 'robinson', 'woodway', 'bellmead', 'lacy lakeview', 'beverly hills'
    ];
    
    const words = name.toLowerCase().split(' ');
    const filteredWords = words.filter(word => !locationTerms.includes(word));
    return filteredWords.join(' ');
  }
  
  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance implementation for string similarity
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    // Convert distance to similarity score
    const maxLength = Math.max(len1, len2);
    return 1 - (matrix[len2][len1] / maxLength);
  }

  private generateSearchVariations(input: string): string[] {
    const variations = [input]; // Start with exact input from user
    const cleaned = input.trim();
    
    // Since users will copy exact names from Google Places, prioritize exact matching
    // Only add minimal variations for better match accuracy
    
    // Add quoted version for exact phrase matching
    if (!cleaned.startsWith('"')) {
      variations.push(`"${cleaned}"`);
    }
    
    // Only add comma variation if it's clearly missing
    if (!cleaned.includes(',') && cleaned.split(/\s+/).length >= 3) {
      const parts = cleaned.split(/\s+/);
      const businessPart = parts.slice(0, -2).join(' ');
      const locationPart = parts.slice(-2).join(' ');
      variations.push(`${businessPart}, ${locationPart}`);
    }
    
    // For businesses with locations, add category-based fallback searches
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',').map(p => p.trim());
      const businessName = parts[0].toLowerCase();
      const location = parts.slice(1).join(' ');
      
      // Add category-based searches for common business types
      if (businessName.includes('pest control') || businessName.includes('exterminator')) {
        variations.push(
          `pest control ${location}`,
          `pest control service ${location}`,
          `exterminator ${location}`
        );
      }
      
      if (businessName.includes('plumb')) {
        variations.push(
          `plumber ${location}`,
          `plumbing service ${location}`
        );
      }
      
      if (businessName.includes('electric')) {
        variations.push(
          `electrician ${location}`,
          `electrical service ${location}`
        );
      }
    }
    
    // Remove duplicates while preserving order (prioritize exact input first)
    return Array.from(new Set(variations));
  }

  private extractBusinessKeywords(input: string): { category?: string, location?: string } {
    const businessCategories = [
      'pest control', 'rodent control', 'exterminator',
      'restaurant', 'cafe', 'coffee', 'pizza', 'plumber', 'plumbing',
      'dentist', 'dental', 'doctor', 'clinic', 'salon', 'barber',
      'auto repair', 'mechanic', 'lawyer', 'attorney'
    ];
    
    const inputLower = input.toLowerCase();
    
    // Find matching business category
    const category = businessCategories.find(cat => inputLower.includes(cat));
    
    // Extract location (assuming it's at the end)
    const parts = input.trim().split(/\s+/);
    const location = parts.slice(-2).join(' '); // Last 2 words as location
    
    return { category, location };
  }

  private extractBusinessNameFromUrl(url: string): string | null {
    try {
      // Try to extract business name from various URL patterns
      const patterns = [
        // /place/Business+Name/@
        /\/place\/([^\/]+)\/@/,
        // /place/Business+Name/
        /\/place\/([^\/]+)\//,
        // search?q=business+name
        /[?&]q=([^&]+)/,
        // After "place/"
        /place\/([^?&#\/]+)/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          // Decode and clean up the business name
          let businessName = decodeURIComponent(match[1]);
          businessName = businessName.replace(/\+/g, ' ');
          businessName = businessName.replace(/@.*$/, ''); // Remove @ and everything after
          
          if (businessName.length > 2) {
            return businessName.trim();
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting business name from URL:', error);
      return null;
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      const apiKey = await this.getApiKey();
      const detailsUrl = `${this.baseUrl}/details/json?place_id=${placeId}&fields=place_id,name,formatted_address,rating,user_ratings_total,geometry,types&key=${apiKey}`;
      
      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.result;
      }

      return null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  async getNearbyPlaces(lat: number, lng: number, type?: string, radius: number = 2000): Promise<NearbySearchResult[]> {
    try {
      const apiKey = await this.getApiKey();
      // Start with the specific business type
      let nearbyUrl = `${this.baseUrl}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${apiKey}`;
      
      if (type && type !== 'establishment') {
        nearbyUrl += `&type=${type}`;
      } else {
        nearbyUrl += `&type=establishment`;
      }

      console.log(`Searching for competitors of type: ${type} within ${radius}m radius`);
      
      const response = await fetch(nearbyUrl);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        // Filter results to get genuine competitors with ratings
        const validCompetitors = data.results.filter((place: any) => 
          place.rating && 
          place.rating > 0 && 
          place.user_ratings_total && 
          place.user_ratings_total > 1 // Lower threshold for broader competitor pool
        );
        

        return validCompetitors.slice(0, 5); // Return top 5 competitors
      }

      // If no results with specific type, try broader establishment search
      if (type !== 'establishment') {

        return await this.getNearbyPlaces(lat, lng, 'establishment', radius);
      }

      return [];
    } catch (error) {
      console.error('Error getting nearby places:', error);
      return [];
    }
  }

  private extractPlaceIdFromUrl(url: string): string | null {
    try {
      // First decode the URL to handle encoded characters
      const decodedUrl = decodeURIComponent(url);
      
      // Match various Google Maps URL formats
      const patterns = [
        // Standard place_id parameter
        /[?&]place_id=([a-zA-Z0-9_-]+)/,
        // Encoded place_id in URL  
        /place_id[:|=]([a-zA-Z0-9_-]+)/,
        // Data parameter formats (various encodings)
        /data=[^&]*!1s([a-zA-Z0-9_-]+)/,
        /data=[^&]*!4m[^&]*!3m[^&]*!1s([a-zA-Z0-9_-]+)/,
        // ftid parameter (sometimes used)
        /[?&]ftid=([a-zA-Z0-9_-]+)/,
        // Place URL with coordinates
        /place\/[^\/]+\/@[^\/]+\/data=[^&]*!1s([a-zA-Z0-9_-]+)/,
        // Shorter data parameter
        /!1s([a-zA-Z0-9_-]{27,})/,
        // CID parameter
        /[?&]cid=([0-9]+)/,
        // Google Place ID in 16s format (URL encoded)
        /16s%2Fg%2F([a-zA-Z0-9_-]+)/,
        // Google Place ID in 16s format (decoded)
        /16s\/g\/([a-zA-Z0-9_-]+)/,
        // Another common pattern
        /!1s0x[a-fA-F0-9]+:0x[a-fA-F0-9]+!8m2!3d[\d.-]+!4d[\d.-]+!16s\/g\/([a-zA-Z0-9_-]+)/
      ];



      // Try patterns on both original and decoded URLs
      const urlsToCheck = [url, decodedUrl];
      
      for (const checkUrl of urlsToCheck) {
        for (const pattern of patterns) {
          const match = checkUrl.match(pattern);
          if (match && match[1]) {

            return match[1];
          }
        }
      }

      // Try to extract business name from URL for fallback text search
      const businessName = this.extractBusinessNameFromUrl(url);
      if (businessName) {

        return null; // Return null so it falls back to text search
      }


      return null;
    } catch (error) {
      console.error('Error extracting place ID from URL:', error);
      return null;
    }
  }

  private getBusinessType(types?: string[]): string {
    if (!types) return 'establishment';
    
    // Enhanced business type categorization for better competitor matching
    const businessCategories = {
      // Food & Restaurants
      'restaurant': ['restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'cafe', 'bar', 'bakery'],
      'food': ['restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'cafe', 'bar', 'bakery'],
      
      // Healthcare Services
      'health': ['doctor', 'dentist', 'hospital', 'pharmacy', 'veterinary_care', 'physiotherapist', 'chiropractor'],
      'doctor': ['doctor', 'dentist', 'hospital', 'pharmacy', 'veterinary_care', 'physiotherapist', 'chiropractor'],
      
      // Professional Services
      'lawyer': ['lawyer', 'accounting', 'real_estate_agency', 'insurance_agency', 'finance'],
      'accounting': ['lawyer', 'accounting', 'real_estate_agency', 'insurance_agency', 'finance'],
      
      // Beauty & Wellness
      'beauty_salon': ['beauty_salon', 'hair_care', 'spa', 'gym', 'fitness_center'],
      'spa': ['beauty_salon', 'hair_care', 'spa', 'gym', 'fitness_center'],
      
      // Home Services
      'plumber': ['plumber', 'electrician', 'locksmith', 'moving_company', 'painter', 'contractor', 'roofing_contractor'],
      'electrician': ['plumber', 'electrician', 'locksmith', 'moving_company', 'painter', 'contractor', 'roofing_contractor'],
      
      // Automotive
      'car_repair': ['car_repair', 'car_dealer', 'gas_station', 'car_wash', 'auto_parts_store'],
      'car_dealer': ['car_repair', 'car_dealer', 'gas_station', 'car_wash', 'auto_parts_store'],
      
      // Retail
      'store': ['store', 'clothing_store', 'electronics_store', 'furniture_store', 'jewelry_store', 'book_store'],
      'shopping_mall': ['store', 'clothing_store', 'electronics_store', 'furniture_store', 'jewelry_store', 'book_store']
    };

    // Priority order for business types - most specific first
    const priorityTypes = [
      'restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'cafe', 'bar',
      'doctor', 'dentist', 'hospital', 'pharmacy', 'veterinary_care',
      'lawyer', 'accounting', 'real_estate_agency', 'insurance_agency',
      'beauty_salon', 'hair_care', 'spa', 'gym', 'fitness_center',
      'plumber', 'electrician', 'locksmith', 'moving_company', 'contractor',
      'car_repair', 'car_dealer', 'gas_station',
      'store', 'clothing_store', 'electronics_store', 'shopping_mall',
      'lodging', 'tourist_attraction',
      'establishment'
    ];

    // Find the most specific business type match
    for (const businessType of priorityTypes) {
      if (types.includes(businessType)) {
        return businessType;
      }
    }

    // Fallback to first non-generic type
    const genericTypes = ['point_of_interest', 'establishment', 'premise'];
    for (const type of types) {
      if (!genericTypes.includes(type)) {
        return type;
      }
    }

    return 'establishment';
  }

  async getBusinessTypeFromPlaceDetails(placeDetails: PlaceDetails): Promise<string> {
    return this.getBusinessType(placeDetails.types);
  }

  // Add business type matching for category-based searches
  private isBusinessTypeMatch(searchedBusinessName: string, foundBusinessName: string, expectedCategory: string): boolean {
    const searchLower = searchedBusinessName.toLowerCase();
    const foundLower = foundBusinessName.toLowerCase();
    
    // Check if both businesses are in the same category
    if (expectedCategory === 'pest control') {
      const pestControlKeywords = ['pest control', 'pest management', 'exterminator', 'fumigation', 'termite', 'rodent control'];
      
      const searchHasPestControl = pestControlKeywords.some(keyword => searchLower.includes(keyword));
      const foundHasPestControl = pestControlKeywords.some(keyword => foundLower.includes(keyword));
      
      if (searchHasPestControl && foundHasPestControl) {
        // Both are pest control businesses, now check if they could be the same business
        
        // Extract key business name words (excluding common terms)
        const searchWords = this.extractBusinessWords(searchLower);
        const foundWords = this.extractBusinessWords(foundLower);
        
        // Check for any significant word overlap that could indicate same business
        let wordMatches = 0;
        for (const searchWord of searchWords) {
          for (const foundWord of foundWords) {
            if (searchWord === foundWord || 
                (searchWord.length > 4 && foundWord.includes(searchWord)) ||
                (foundWord.length > 4 && searchWord.includes(foundWord))) {
              wordMatches++;
              break;
            }
          }
        }
        
        // If we find some business name overlap, this could be a match
        if (wordMatches > 0 && searchWords.length > 0) {
          console.log(`🔍 Potential business type match: "${foundBusinessName}" could be "${searchedBusinessName}" (${wordMatches} word matches)`);
          return true;
        }
      }
    }
    
    return false;
  }

  private extractBusinessWords(businessName: string): string[] {
    const commonWords = ['pest', 'control', 'service', 'services', 'company', 'llc', 'inc', 'corp', 'ltd', 'management', 'solutions', 'professional', 'the', 'and', 'of', 'for'];
    const words = businessName.toLowerCase().split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .map(word => word.replace(/[^a-z]/g, '')); // Remove punctuation
    
    return words.filter(word => word.length > 0);
  }
}
