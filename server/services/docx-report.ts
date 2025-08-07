import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { Lead, Competitor, BrandSettings } from '@shared/schema';

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

export class DocxReportService {
  private sanitizeText(text: any): string {
    if (!text) return '';
    
    // Handle objects by converting to JSON or extracting useful data
    if (typeof text === 'object') {
      // If it's an array, join elements
      if (Array.isArray(text)) {
        return text.map(item => String(item)).join(', ');
      }
      
      // If it's an object, try to extract meaningful text or stringify carefully
      if (text.toString && text.toString() !== '[object Object]') {
        return text.toString();
      }
      
      // For complex objects, try to extract key-value pairs
      try {
        return Object.entries(text)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      } catch {
        return JSON.stringify(text);
      }
    }
    
    const stringText = String(text);
    
    // Don't replace non-ASCII if it shows [object Object]
    if (stringText === '[object Object]') {
      return 'Data not available';
    }
    
    return stringText
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildContactSection(brandSettings: BrandSettings): Paragraph[] {
    const contactInfo: Paragraph[] = [];
    
    // Only add contact section if we have contact information
    const hasContactInfo = brandSettings.contactEmail || 
                          brandSettings.phoneNumber || 
                          brandSettings.website || 
                          brandSettings.calendarLink;
    
    if (!hasContactInfo) return [];

    // Contact header
    contactInfo.push(new Paragraph({
      children: [
        new TextRun({
          text: 'CONTACT INFORMATION',
          bold: true,
          size: 16,
          color: brandSettings.primaryColor?.replace('#', '') || '0ea5e9',
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 }
    }));

    // Email
    if (brandSettings.contactEmail) {
      contactInfo.push(new Paragraph({
        children: [
          new TextRun({
            text: `📧 Email: ${this.sanitizeText(brandSettings.contactEmail)}`,
            size: 14,
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }));
    }

    // Phone
    if (brandSettings.phoneNumber) {
      contactInfo.push(new Paragraph({
        children: [
          new TextRun({
            text: `📞 Phone: ${this.sanitizeText(brandSettings.phoneNumber)}`,
            size: 14,
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }));
    }

    // Website
    if (brandSettings.website) {
      contactInfo.push(new Paragraph({
        children: [
          new TextRun({
            text: `🌐 Website: ${this.sanitizeText(brandSettings.website)}`,
            size: 14,
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }));
    }

    // Calendar Link
    if (brandSettings.calendarLink) {
      contactInfo.push(new Paragraph({
        children: [
          new TextRun({
            text: `📅 Schedule a Call: ${this.sanitizeText(brandSettings.calendarLink)}`,
            size: 14,
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }));
    }

    return contactInfo;
  }

  async generateMarketingReport(
    lead: Lead,
    competitors: Competitor[],
    insights: MarketingInsights,
    brandSettings: BrandSettings
  ): Promise<Buffer> {
    try {
      // Calculate competitive metrics
      const avgRating = competitors.length > 0 
        ? competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length 
        : 0;
      
      const avgReviews = competitors.length > 0 
        ? competitors.reduce((sum, c) => sum + c.reviewCount, 0) / competitors.length 
        : 0;

      const topCompetitor = competitors.length > 0 
        ? competitors.reduce((top, current) => 
            current.reviewCount > top.reviewCount ? current : top, competitors[0])
        : null;

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Header
            new Paragraph({
              children: [
                new TextRun({
                  text: `${this.sanitizeText(brandSettings.agencyName || 'Marketing Analysis')}`,
                  bold: true,
                  size: 32,
                  color: brandSettings.primaryColor?.replace('#', '') || '0ea5e9',
                })
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: 'Local Market Competitive Analysis Report',
                  size: 24,
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 }
            }),

            // Business Overview
            new Paragraph({
              children: [
                new TextRun({
                  text: 'BUSINESS OVERVIEW',
                  bold: true,
                  size: 20,
                  color: '0ea5e9',
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Business Name: ${this.sanitizeText(lead.name)}`,
                  bold: true,
                }),
                new TextRun({
                  text: `\nLocation: ${this.sanitizeText(lead.address)}`,
                }),
                new TextRun({
                  text: `\nCurrent Rating: ${lead.rating.toFixed(1)} stars`,
                }),
                new TextRun({
                  text: `\nTotal Reviews: ${lead.reviewCount} reviews`,
                }),
                new TextRun({
                  text: `\nMarket Position: ${this.sanitizeText(insights.competitivePosition)}`,
                  bold: true,
                  color: '0ea5e9'
                })
              ],
              spacing: { after: 400 }
            }),

            // Market Analysis
            new Paragraph({
              children: [
                new TextRun({
                  text: 'COMPETITIVE MARKET ANALYSIS',
                  bold: true,
                  size: 20,
                  color: '0ea5e9',
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Market Benchmarks:\n`,
                  bold: true,
                }),
                new TextRun({
                  text: `• Local Market Average: ${avgRating.toFixed(1)} stars, ${Math.round(avgReviews)} reviews\n`,
                }),
                new TextRun({
                  text: `• Competitive Position: ${this.sanitizeText(insights.competitivePosition)}\n`,
                }),
                new TextRun({
                  text: `• Market Leader: ${topCompetitor ? `${this.sanitizeText(topCompetitor.name)} (${topCompetitor.rating} stars, ${topCompetitor.reviewCount} reviews)` : 'Analysis in progress'}\n`,
                }),
                new TextRun({
                  text: `• Market Opportunity: ${this.sanitizeText(insights.marketingOpportunity)}`,
                  bold: true,
                  color: '0ea5e9'
                })
              ],
              spacing: { after: 400 }
            }),

            // Gap Analysis
            new Paragraph({
              children: [
                new TextRun({
                  text: 'PERFORMANCE GAP ANALYSIS',
                  bold: true,
                  size: 20,
                  color: '0ea5e9',
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: this.sanitizeText(insights.gapAnalysis),
                }),
              ],
              spacing: { after: 400 }
            }),

            // AI Insights
            ...(insights.intelligentInsights ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'INTELLIGENT MARKET INSIGHTS',
                    bold: true,
                    size: 20,
                    color: '0ea5e9',
                  })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: this.sanitizeText(insights.intelligentInsights),
                  }),
                ],
                spacing: { after: 400 }
              })
            ] : []),

            // Industry Advice
            ...(insights.industrySpecificAdvice ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'INDUSTRY-SPECIFIC STRATEGIC ADVICE',
                    bold: true,
                    size: 20,
                    color: '0ea5e9',
                  })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: this.sanitizeText(insights.industrySpecificAdvice),
                  }),
                ],
                spacing: { after: 400 }
              })
            ] : []),

            // Market Opportunity
            new Paragraph({
              children: [
                new TextRun({
                  text: 'MARKET OPPORTUNITY',
                  bold: true,
                  size: 20,
                  color: '0ea5e9',
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: this.sanitizeText(insights.marketingOpportunity),
                }),
              ],
              spacing: { after: 400 }
            }),

            // Recommendations
            new Paragraph({
              children: [
                new TextRun({
                  text: 'RECOMMENDED ACTION PLAN',
                  bold: true,
                  size: 20,
                  color: '0ea5e9',
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            // Action items
            ...insights.actionableRecommendations.map((recommendation, index) => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${index + 1}. ${this.sanitizeText(recommendation)}`,
                  }),
                ],
                spacing: { after: 200 }
              })
            ),

            // AI Recommendations if available
            ...(insights.aiRecommendations && insights.aiRecommendations.length > 0 ? 
              insights.aiRecommendations.map((aiRec, index) => 
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${insights.actionableRecommendations.length + index + 1}. ${this.sanitizeText(aiRec)}`,
                    }),
                  ],
                  spacing: { after: 200 }
                })
              ) : []
            ),

            // Footer with Contact Information
            new Paragraph({
              children: [
                new TextRun({
                  text: `\n\nReport generated by ${this.sanitizeText(brandSettings.agencyName || 'Marketing Analysis')}`,
                  italics: true,
                  size: 18,
                  color: brandSettings.primaryColor?.replace('#', '') || '0ea5e9',
                }),
                new TextRun({
                  text: `\nFor more insights and marketing strategies, contact our team.`,
                  italics: true,
                  size: 16,
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 600, after: 300 }
            }),

            // Contact Information Section
            ...this.buildContactSection(brandSettings)
          ]
        }]
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);
      return buffer;

    } catch (error: any) {
      console.error('DOCX generation failed:', error);
      throw new Error(`Failed to generate DOCX report: ${error?.message || 'Unknown error'}`);
    }
  }
}