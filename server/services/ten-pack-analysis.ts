import { GooglePlacesService } from './google-places';

interface TenPackBusiness {
  name: string;
  rating: number;
  reviewCount: number;
  placeId: string;
  address: string;
}

interface TenPackAnalysis {
  businesses: TenPackBusiness[];
  averageRating: number;
  averageReviews: number;
  medianReviews: number;
  reviewRange: {
    min: number;
    max: number;
  };
  ratingRange: {
    min: number;
    max: number;
  };
  topPerformer: TenPackBusiness;
  entryThreshold: {
    reviewsNeeded: number;
    ratingNeeded: number;
  };
}

export class TenPackAnalysisService {
  constructor(private googlePlaces: GooglePlacesService) {}

  async analyzeTenPack(businessCategory: string, city: string, state: string): Promise<TenPackAnalysis> {
    // Search for the top 10 businesses in this category and location
    const searchQuery = `${businessCategory} ${city} ${state}`;

    
    // Use Google Places Text Search to get the top results (equivalent to Maps 10-pack)
    const apiKey = await this.googlePlaces['getApiKey']();
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
    
    const response = await fetch(textSearchUrl);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(`No results found for ${searchQuery} 10-pack analysis`);
    }

    // Process the top 10 results (Google's equivalent to the Maps 10-pack)
    const businesses: TenPackBusiness[] = data.results
      .slice(0, 10) // Take top 10 results
      .filter((place: any) => place.rating && place.user_ratings_total) // Must have ratings and reviews
      .map((place: any) => ({
        name: place.name,
        rating: place.rating,
        reviewCount: place.user_ratings_total,
        placeId: place.place_id,
        address: place.formatted_address || place.vicinity || ''
      }));


    businesses.forEach((business, index) => {

    });

    // Calculate statistics
    const ratings = businesses.map(b => b.rating);
    const reviewCounts = businesses.map(b => b.reviewCount);
    
    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const averageReviews = reviewCounts.reduce((sum, count) => sum + count, 0) / reviewCounts.length;
    
    // Calculate median reviews
    const sortedReviews = [...reviewCounts].sort((a, b) => a - b);
    const medianReviews = sortedReviews.length % 2 === 0
      ? (sortedReviews[sortedReviews.length / 2 - 1] + sortedReviews[sortedReviews.length / 2]) / 2
      : sortedReviews[Math.floor(sortedReviews.length / 2)];

    const reviewRange = {
      min: Math.min(...reviewCounts),
      max: Math.max(...reviewCounts)
    };

    const ratingRange = {
      min: Math.min(...ratings),
      max: Math.max(...ratings)
    };

    // Find top performer (highest rating, then highest reviews)
    const topPerformer = businesses.reduce((top, current) => {
      if (current.rating > top.rating) return current;
      if (current.rating === top.rating && current.reviewCount > top.reviewCount) return current;
      return top;
    });

    // Calculate entry threshold (what you need to get into the 10-pack)
    // Use the 10th position as the baseline
    const tenthPosition = businesses[businesses.length - 1];
    const entryThreshold = {
      reviewsNeeded: tenthPosition ? tenthPosition.reviewCount + 1 : Math.ceil(averageReviews * 0.7),
      ratingNeeded: Math.max(4.0, ratingRange.min) // Minimum 4.0 or higher
    };




    return {
      businesses,
      averageRating,
      averageReviews,
      medianReviews,
      reviewRange,
      ratingRange,
      topPerformer,
      entryThreshold
    };
  }

  generateTenPackInsights(analysis: TenPackAnalysis, businessName: string, businessRating: number, businessReviews: number): string {
    const { averageRating, averageReviews, medianReviews, reviewRange, entryThreshold, topPerformer } = analysis;
    
    // Compare business to 10-pack
    const ratingVsAverage = businessRating - averageRating;
    const reviewsVsAverage = businessReviews - averageReviews;
    const reviewsVsMedian = businessReviews - medianReviews;
    const reviewsVsEntry = businessReviews - entryThreshold.reviewsNeeded;
    
    let insights = `\n🎯 GOOGLE 10-PACK COMPETITIVE ANALYSIS\n\n`;
    
    // Position analysis
    if (reviewsVsEntry >= 0 && businessRating >= entryThreshold.ratingNeeded) {
      insights += `✅ COMPETITIVE POSITION: Your business meets 10-pack entry criteria\n`;
    } else {
      insights += `⚠️  OPPORTUNITY: You need ${Math.max(0, entryThreshold.reviewsNeeded - businessReviews)} more reviews and ${Math.max(0, entryThreshold.ratingNeeded - businessRating).toFixed(1)} rating points to enter the 10-pack\n`;
    }
    
    // Rating analysis
    if (ratingVsAverage > 0) {
      insights += `📈 RATING ADVANTAGE: ${ratingVsAverage.toFixed(1)} points above 10-pack average (${averageRating.toFixed(1)}⭐)\n`;
    } else {
      insights += `📉 RATING GAP: ${Math.abs(ratingVsAverage).toFixed(1)} points below 10-pack average (${averageRating.toFixed(1)}⭐)\n`;
    }
    
    // Review volume analysis
    if (reviewsVsMedian > 0) {
      insights += `💪 REVIEW STRENGTH: ${Math.round(reviewsVsMedian)} reviews above median (${Math.round(medianReviews)})\n`;
    } else {
      insights += `📊 REVIEW OPPORTUNITY: ${Math.round(Math.abs(reviewsVsMedian))} reviews behind median competitor (${Math.round(medianReviews)})\n`;
    }
    
    // Market context
    insights += `\n📊 MARKET BENCHMARKS:\n`;
    insights += `• 10-Pack Average: ${averageRating.toFixed(1)}⭐, ${Math.round(averageReviews)} reviews\n`;
    insights += `• Market Leader: ${topPerformer.name} (${topPerformer.rating}⭐, ${topPerformer.reviewCount} reviews)\n`;
    insights += `• Entry Threshold: ${entryThreshold.ratingNeeded}⭐, ${entryThreshold.reviewsNeeded}+ reviews\n`;
    insights += `• Review Range: ${reviewRange.min} - ${reviewRange.max} reviews\n`;
    
    // Strategic recommendations
    insights += `\n🚀 STRATEGIC RECOMMENDATIONS:\n`;
    if (businessRating < entryThreshold.ratingNeeded) {
      insights += `• PRIORITY: Focus on service quality to reach ${entryThreshold.ratingNeeded}⭐ minimum\n`;
    }
    if (businessReviews < entryThreshold.reviewsNeeded) {
      insights += `• GROWTH TARGET: Gain ${entryThreshold.reviewsNeeded - businessReviews} reviews to reach entry threshold\n`;
    }
    if (businessReviews < averageReviews) {
      insights += `• COMPETITIVE GOAL: Reach ${Math.round(averageReviews)} reviews to match market average\n`;
    }
    
    return insights;
  }
}