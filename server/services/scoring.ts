import { Competitor, Lead } from '@shared/schema';
import OpenAI from 'openai';

interface ScoringThresholds {
  A_rating: number;
  A_reviewGap: number;
  B_rating: number;
  B_reviewGap: number;
  C_rating: number;
}

interface MarketingInsights {
  score: 'A' | 'B' | 'C';
  gapAnalysis: string;
  marketingOpportunity: string;
  actionableRecommendations: string[];
  competitivePosition: string;
  urgencyLevel: 'High' | 'Medium' | 'Low';
  // Enhanced AI-powered insights
  intelligentInsights?: string;
  industrySpecificAdvice?: string;
  aiRecommendations?: string[];
}

export class ScoringService {
  private thresholds: ScoringThresholds = {
    A_rating: 4.0,
    A_reviewGap: 50, // Low review count threshold for A+ prospects
    B_rating: 4.0,
    B_reviewGap: 100, // Medium review count threshold
    C_rating: 4.0, // Rating threshold for service quality
  };

  private openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  async scoreLeadWithAI(lead: Lead, competitors: Competitor[], searchContext?: {
    originalInput: string;
    searchAttempts: string[];
    searchSuccess: boolean;
  }): Promise<MarketingInsights> {
    const basicInsights = this.scoreLead(lead.rating, lead.reviewCount, competitors);
    
    try {
      // Generate AI-powered insights using OpenAI
      const aiInsights = await this.generateAIInsights(lead, competitors, basicInsights.score);
      
      return {
        ...basicInsights,
        intelligentInsights: typeof aiInsights.intelligentInsights === 'string' ? aiInsights.intelligentInsights : 'AI analysis results available',
        industrySpecificAdvice: typeof aiInsights.industrySpecificAdvice === 'string' ? aiInsights.industrySpecificAdvice : 'Industry-specific recommendations available',
        aiRecommendations: Array.isArray(aiInsights.personalizedRecommendations) ? aiInsights.personalizedRecommendations : ['AI-powered recommendations available'],
        marketingOpportunity: typeof aiInsights.marketOpportunity === 'string' ? aiInsights.marketOpportunity : basicInsights.marketingOpportunity,
        competitivePosition: typeof aiInsights.competitivePositioning === 'string' ? aiInsights.competitivePositioning : basicInsights.competitivePosition,
      };
    } catch (error) {
      return basicInsights;
    }
  }

  // Add method to generate AI insights directly with OpenAI
  private async generateAIInsights(lead: Lead, competitors: Competitor[], score: 'A' | 'B' | 'C'): Promise<{
    intelligentInsights: string;
    industrySpecificAdvice: string;
    personalizedRecommendations: string[];
    marketOpportunity: string;
    competitivePositioning: string;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{
          role: "user",
          content: `Analyze this business for marketing potential:
Business: ${lead.name} (${lead.rating}⭐, ${lead.reviewCount} reviews)
Score: ${score}
Competitors: ${competitors.map(c => `${c.name} (${c.rating}⭐, ${c.reviewCount} reviews)`).join(', ')}

Provide JSON response with:
- intelligentInsights: Market analysis
- industrySpecificAdvice: Industry tips
- personalizedRecommendations: Array of 3 recommendations
- marketOpportunity: Growth opportunity
- competitivePositioning: Competitive position`
        }],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {

      return {
        intelligentInsights: "Standard competitive analysis available",
        industrySpecificAdvice: "Focus on customer service excellence",
        personalizedRecommendations: ["Increase review generation", "Improve online presence", "Monitor competitors"],
        marketOpportunity: "Growth potential in local market",
        competitivePositioning: "Positioned for market expansion"
      };
    }
  }

  // Enhanced method for analyzing failed business searches
  async findBusinessWithAI(businessName: string): Promise<{
    found: boolean;
    name?: string;
    address?: string;
    phone?: string;
    website?: string;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: `Find basic information for this business: "${businessName}"

Return JSON with:
- found: boolean (true if business exists online)
- name: standardized business name
- address: business address if available
- phone: phone number if available  
- website: website URL if available

If the business doesn't exist or you're not confident, return found: false.
Focus on finding legitimate businesses only.`
        }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        found: result.found || false,
        name: result.name || businessName,
        address: result.address || undefined,
        phone: result.phone || undefined,
        website: result.website || undefined
      };
    } catch (error) {
      return { found: false };
    }
  }

  async analyzeFailedBusinessSearch(originalInput: string, searchAttempts: string[]): Promise<{
    suggestions: string[];
    insights: string;
    nextSteps: string[];
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", 
        messages: [{
          role: "user",
          content: `A business search for "${originalInput}" failed in Google Places API, but the business likely exists online.

Common reasons why legitimate businesses fail in Google Places API:
1. Business not verified with Google My Business  
2. Listed under different name/format than public name
3. New business not yet indexed in API database
4. Service-area business without physical storefront
5. API database lag compared to Google Search results

Based on "${originalInput}", analyze and provide JSON response with:
- insights: Most likely reason for search failure (max 2 sentences)
- suggestions: 3 alternative search strategies to try
- nextSteps: 3 practical next steps including manual entry option

Focus on practical solutions and reassure that manual entry works perfectly for generating reports.`
        }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        suggestions: result.suggestions || [
          "Try business name without LLC/Inc suffixes",
          "Search by category (e.g., 'pest control [city]')", 
          "Manual entry provides same functionality as API results"
        ],
        insights: result.insights || "Business likely exists but isn't in Google Places API database. This is common for newer businesses or those without Google My Business verification.",
        nextSteps: result.nextSteps || [
          "Remove business suffixes from search",
          "Try category-based search",
          "Use manual entry - works identically to API data"
        ]
      };
    } catch (error) {

      return {
        suggestions: [
          "Try business name without LLC/Inc suffixes",
          "Search by category name + location instead", 
          "Manual entry works perfectly for report generation"
        ],
        insights: "Business likely exists online but isn't indexed in Google Places API. This is common and doesn't affect your ability to generate comprehensive reports.",
        nextSteps: [
          "Use manual business entry with details you found",
          "Try simplified search terms without suffixes",
          "Generate reports normally with manual data"
        ]
      };
    }
  }

  scoreLead(rating: number, reviewCount: number, competitors: Competitor[]): MarketingInsights {
    // CORRECT LEAD SCORING FOR MARKETERS SELLING REVIEW SERVICES:
    // A+ = High rating (4.0+) + Low reviews (need more reviews) = EXCELLENT PROSPECT
    // C = High reviews (don't need help) OR Low rating (poor service) = BAD PROSPECT
    
    let score: 'A' | 'B' | 'C';
    let urgencyLevel: 'High' | 'Medium' | 'Low';
    let marketingOpportunity: string;
    let competitivePosition: string;
    let actionableRecommendations: string[];

    // Calculate market statistics for competitive analysis
    const marketStats = this.calculateMarketStats(competitors);

    // Generate market opportunity analysis based on competitive landscape
    marketingOpportunity = this.generateMarketOpportunity(rating, reviewCount, marketStats);
    
    // Bad prospects: Poor ratings (below 4.0) - they have service quality issues
    if (rating < 4.0) {
      score = 'C';
      urgencyLevel = 'High';
      competitivePosition = `Service quality issues with ${rating}/5.0 rating`;
      actionableRecommendations = [
        'Focus on improving service quality before review acquisition',
        'Address customer satisfaction issues',
        'Not ready for aggressive review campaigns'
      ];
    }
    // Bad prospects: High review count (100+) - they don't need review help
    else if (reviewCount >= 100) {
      score = 'C';
      urgencyLevel = 'Low';
      competitivePosition = `Well-established with ${reviewCount} reviews - limited growth opportunity`;
      actionableRecommendations = [
        'Focus on review quality maintenance',
        'Consider other marketing services',
        'Limited need for review acquisition'
      ];
    }
    // EXCELLENT prospects: Good rating (4.0+) + Low reviews (under 50) = PERFECT TARGET
    else if (rating >= 4.0 && reviewCount < 50) {
      score = 'A';
      urgencyLevel = 'High';
      competitivePosition = `Perfect target: ${rating}/5.0 rating with only ${reviewCount} reviews`;
      actionableRecommendations = [
        'Implement aggressive review acquisition campaign',
        'Target 50-100 reviews within 6 months',
        'Leverage existing customer satisfaction for rapid growth'
      ];
    }
    // Good prospects: Good rating (4.0+) + Medium reviews (50-99) = DECENT TARGET
    else {
      score = 'B';
      urgencyLevel = 'Medium';
      competitivePosition = `Solid target: ${rating}/5.0 rating with ${reviewCount} reviews`;
      actionableRecommendations = [
        'Boost review count to reach 100+ threshold',
        'Maintain rating quality during growth',
        'Focus on review velocity improvement'
      ];
    }

    // Generate gap analysis
    let gapAnalysis = `Lead Quality Assessment: ${rating}/5.0 rating, ${reviewCount} reviews. `;
    if (competitors.length > 0) {
      const avgCompetitorReviews = competitors.reduce((sum, comp) => sum + comp.reviewCount, 0) / competitors.length;
      const reviewGap = reviewCount - avgCompetitorReviews;
      gapAnalysis += `Competitor average: ${Math.round(avgCompetitorReviews)} reviews (${reviewGap > 0 ? '+' : ''}${Math.round(reviewGap)} gap).`;
    } else {
      gapAnalysis += 'No competitor data for comparison.';
    }

    return {
      score,
      gapAnalysis,
      marketingOpportunity,
      actionableRecommendations,
      competitivePosition,
      urgencyLevel
    };
  }

  private calculateMarketStats(competitors: Competitor[]) {
    if (competitors.length === 0) {
      return {
        averageRating: 0,
        averageReviews: 0,
        totalCompetitors: 0,
        highPerformers: 0,
        reviewRange: { min: 0, max: 0 }
      };
    }

    const ratings = competitors.map(c => c.rating);
    const reviewCounts = competitors.map(c => c.reviewCount);
    
    const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const averageReviews = reviewCounts.reduce((sum, r) => sum + r, 0) / reviewCounts.length;
    const highPerformers = competitors.filter(c => c.rating >= 4.5 && c.reviewCount >= 100).length;
    
    return {
      averageRating: Math.round(averageRating * 10) / 10,
      averageReviews: Math.round(averageReviews),
      totalCompetitors: competitors.length,
      highPerformers,
      reviewRange: {
        min: Math.min(...reviewCounts),
        max: Math.max(...reviewCounts)
      }
    };
  }

  private generateMarketOpportunity(rating: number, reviewCount: number, marketStats: any): string {
    if (marketStats.totalCompetitors === 0) {
      return `Market analysis shows this business has a ${rating}/5.0 rating with ${reviewCount} reviews. To establish strong market presence and attract more customers, implementing a systematic review acquisition strategy would significantly improve visibility and credibility in search results.`;
    }

    const competitiveGap = reviewCount - marketStats.averageReviews;
    const ratingPosition = rating >= marketStats.averageRating ? "above" : "below";
    
    let opportunity = `Local market analysis reveals ${marketStats.totalCompetitors} active competitors with an average rating of ${marketStats.averageRating}/5.0 and ${marketStats.averageReviews} reviews. `;
    
    if (competitiveGap < -50) {
      opportunity += `Your business currently has ${Math.abs(competitiveGap)} fewer reviews than the market average, representing a significant opportunity to gain competitive advantage. `;
      opportunity += `By increasing review velocity to reach market parity, you can expect improved search rankings and increased customer trust. `;
      opportunity += `The review gap indicates strong potential for rapid market share growth through strategic reputation management.`;
    } else if (competitiveGap < 0) {
      opportunity += `With ${Math.abs(competitiveGap)} fewer reviews than competitors, there's clear opportunity to strengthen market position. `;
      opportunity += `Closing this review gap would improve local search visibility and customer confidence, directly impacting lead generation.`;
    } else {
      opportunity += `Your review count ${ratingPosition} market average indicates ${competitiveGap > 0 ? 'strong' : 'stable'} market positioning. `;
      opportunity += `Focus on maintaining review momentum while competitors work to catch up to your established market presence.`;
    }

    return opportunity;
  }
}