import { Lead, Competitor } from '@shared/schema';
import OpenAI from 'openai';

interface EmailTemplate {
  subject: string;
  body: string;
  followUpSubject?: string;
  followUpBody?: string;
}

interface MarketingInsights {
  score: 'A' | 'B' | 'C';
  gapAnalysis: string;
  marketingOpportunity: string;
  actionableRecommendations: string[];
  competitivePosition: string;
  urgencyLevel: 'High' | 'Medium' | 'Low';
  intelligentInsights?: string;
  industrySpecificAdvice?: string;
  aiRecommendations?: string[];
}

export class EmailTemplateService {
  private openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  private async callOpenAI(payload: any): Promise<any> {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      throw new Error('OPENAI_API_KEY missing');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API call failed: ${response.status}`);
    }
    
    return response.json();
  }

  async generateIntelligentOutreach(
    lead: Lead, 
    competitors: Competitor[], 
    insights: MarketingInsights,
    agencyName: string = "Our Marketing Team"
  ): Promise<EmailTemplate> {
    try {
      // Generate AI-powered email content using the analysis service
      const emailContent = await this.generateAIEmailContent(lead, competitors, insights, agencyName);
      return emailContent;
    } catch (error) {
      console.warn('AI email generation failed, using template fallback:', error);
      return this.getFallbackTemplate(lead, insights, agencyName);
    }
  }

  private async generateAIEmailContent(
    lead: Lead, 
    competitors: Competitor[], 
    insights: MarketingInsights,
    agencyName: string
  ): Promise<EmailTemplate> {
    const emailContext = this.prepareEmailContext(lead, competitors, insights, agencyName);

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await this.callOpenAI({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert email copywriter specializing in digital marketing outreach for local businesses. Your expertise includes:

- Crafting compelling subject lines that get opened
- Writing personalized business emails that convert prospects
- Understanding local business pain points and opportunities
- Creating urgency without being pushy
- Professional tone while being conversational

Write a personalized outreach email for a digital marketing agency that helps local businesses improve their online reputation through review generation and local SEO.

Key requirements:
1. Subject line should be compelling and personalized to the business
2. Email should be professional but conversational (not overly salesy)
3. Include specific insights about their competitive position
4. Focus on the opportunity rather than problems
5. Include a clear but soft call-to-action
6. Keep the email concise (under 200 words)
7. Use the business owner's perspective and industry context

Also provide a follow-up email subject and body for prospects who don't respond initially.

Return your response in JSON format:
{
  "subject": "Main email subject line",
  "body": "Main email body text",
  "followUpSubject": "Follow-up email subject line", 
  "followUpBody": "Follow-up email body text"
}`
        },
        {
          role: "user",
          content: emailContext
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 1500
    });

    const emailData = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      subject: emailData.subject || `Opportunity to Improve ${lead.name}'s Online Presence`,
      body: emailData.body || this.getFallbackTemplate(lead, insights, agencyName).body,
      followUpSubject: emailData.followUpSubject || `Following up: ${lead.name}'s growth opportunity`,
      followUpBody: emailData.followUpBody || this.getFallbackFollowUp(lead, agencyName)
    };
  }

  private prepareEmailContext(
    lead: Lead, 
    competitors: Competitor[], 
    insights: MarketingInsights,
    agencyName: string
  ): string {
    const businessType = this.extractBusinessType(lead.name);
    const competitorCount = competitors.length;
    const avgCompetitorReviews = competitors.length > 0
      ? Math.round(competitors.reduce((sum, c) => sum + c.reviewCount, 0) / competitors.length)
      : 0;

    return `
EMAIL GENERATION REQUEST

Agency Information:
- Agency Name: ${agencyName}
- Service: Online reputation management and review generation for local businesses

Target Business:
- Business Name: ${lead.name}
- Industry: ${businessType}
- Current Rating: ${lead.rating}/5.0 stars
- Current Reviews: ${lead.reviewCount}
- Lead Score: ${insights.score} (A=Excellent prospect, B=Good prospect, C=Poor prospect)
- Urgency Level: ${insights.urgencyLevel}

Market Context:
- Competitors Analyzed: ${competitorCount}
- Average Competitor Reviews: ${avgCompetitorReviews}
- Market Position: ${insights.competitivePosition}

Key Insights to Include:
- AI Analysis: ${insights.intelligentInsights || 'Standard competitive analysis available'}
- Market Opportunity: ${insights.marketingOpportunity}
- Industry Advice: ${insights.industrySpecificAdvice || 'General local business guidance'}

Email Requirements:
1. Use generic greeting (Hello, Hi there, Greetings) - DO NOT assume recipient name
2. Address the business owner/manager generically (no specific names)
3. Reference their specific industry (${businessType}) and business name (${lead.name})
4. Mention their current ${lead.rating} star rating and ${lead.reviewCount} reviews
5. Highlight the competitive opportunity without being negative
6. Position ${agencyName} as the solution provider
7. Include a soft call-to-action (consultation, analysis, etc.)
8. Professional but warm tone - this is initial outreach, not a hard sell
9. Keep it concise and avoid placeholder names like [Your Name] or [Agency Name]

Context: This is a cold outreach email to a local business owner who likely receives marketing emails regularly. We don't know the recipient's name, so use generic greetings and sign-offs. The email needs to stand out by being genuinely helpful and specific to their business situation.
`;
  }

  private extractBusinessType(businessName: string): string {
    const name = businessName.toLowerCase();
    
    const businessTypes = {
      'restaurant': ['restaurant', 'cafe', 'diner', 'bistro', 'grill', 'pizza', 'bar'],
      'automotive': ['auto', 'car', 'mechanic', 'tire', 'oil', 'repair', 'garage'],
      'healthcare': ['dental', 'doctor', 'clinic', 'medical', 'health', 'dentist'],
      'home services': ['plumbing', 'hvac', 'electric', 'roofing', 'handyman', 'cleaning', 'landscaping'],
      'legal': ['law', 'attorney', 'lawyer', 'legal'],
      'beauty': ['salon', 'spa', 'beauty', 'hair', 'nail', 'barber'],
      'retail': ['shop', 'store', 'boutique', 'market'],
      'pest control': ['pest', 'exterminator', 'termite', 'bug'],
      'real estate': ['real estate', 'realtor', 'property']
    };

    for (const [category, keywords] of Object.entries(businessTypes)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return category;
      }
    }

    return 'local business';
  }

  private getFallbackTemplate(lead: Lead, insights: MarketingInsights, agencyName: string): EmailTemplate {
    const urgencyText = insights.urgencyLevel === 'High' 
      ? 'immediate growth potential' 
      : insights.urgencyLevel === 'Medium' 
      ? 'solid growth opportunity' 
      : 'potential for improvement';

    const businessType = this.extractBusinessType(lead.name);

    return {
      subject: `${lead.name}: ${urgencyText} in local market`,
      body: `Hello,

I noticed ${lead.name} has a strong ${lead.rating}-star rating, which shows you're delivering great service to your customers.

After analyzing your online presence against local ${businessType} competitors, I spotted some opportunities that could help you capture more of the market share in your area.

${insights.competitivePosition}

Would you be interested in a brief conversation about how other ${businessType} businesses in your area are leveraging their online reputation to drive more customers?

Best regards,
The team at ${agencyName}

P.S. I've prepared a detailed analysis of your competitive position that I'd be happy to share - no strings attached.`,
      followUpSubject: `Quick follow-up: ${lead.name}'s growth opportunity`,
      followUpBody: this.getFallbackFollowUp(lead, agencyName)
    };
  }

  private getFallbackFollowUp(lead: Lead, agencyName: string): string {
    return `Hello,

I wanted to follow up on my message about ${lead.name}'s online reputation opportunities.

I understand you're busy running your business, but I genuinely believe there's a significant growth opportunity here that's worth a quick 15-minute conversation.

Would this week or next work better for a brief call?

Best regards,
The team at ${agencyName}`;
  }
}