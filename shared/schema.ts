import { z } from "zod";
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// API Keys table for persistent storage
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  keyType: text("key_type").notNull(), // 'google_places' or 'openai'
  keyValue: text("key_value").notNull(),
  isActive: text("is_active").notNull().default("true"), // 'true' or 'false'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectApiKeySchema = createSelectSchema(apiKeys);

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// API Key validation schemas
export const googlePlacesKeySchema = z.string()
  .min(39, "Google Places API key must be at least 39 characters")
  .max(39, "Google Places API key must be exactly 39 characters")
  .regex(/^AIza[A-Za-z0-9_-]{35}$/, "Google Places API key must start with 'AIza' followed by 35 characters")
  .describe("Google Places API key format: AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

export const openaiKeySchema = z.string()
  .min(20, "OpenAI API key must be at least 20 characters")
  .startsWith("sk-", "OpenAI API key must start with 'sk-'")
  .describe("OpenAI API key format: sk-XXXXXXXXXXXXXXXXXXXX");

export const apiKeyValidationSchema = z.object({
  keyType: z.enum(['google_places', 'openai']),
  keyValue: z.string().min(1, "API key is required"),
}).refine((data) => {
  if (data.keyType === 'google_places') {
    return googlePlacesKeySchema.safeParse(data.keyValue).success;
  } else if (data.keyType === 'openai') {
    return openaiKeySchema.safeParse(data.keyValue).success;
  }
  return false;
}, {
  message: "Invalid API key format for the selected key type",
  path: ["keyValue"],
});

// Lead data model
export const leadSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  placeId: z.string().optional(),
  rating: z.number(),
  reviewCount: z.number(),
  score: z.enum(['A', 'B', 'C']),
  gapAnalysis: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const insertLeadSchema = leadSchema.omit({ id: true });

export type Lead = z.infer<typeof leadSchema>;
export type InsertLead = z.infer<typeof insertLeadSchema>;

// Competitor data model
export const competitorSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  name: z.string(),
  rating: z.number(),
  reviewCount: z.number(),
  distance: z.number(), // in meters
  placeId: z.string(),
});

export const insertCompetitorSchema = competitorSchema.omit({ id: true });

export type Competitor = z.infer<typeof competitorSchema>;
export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;

// Brand settings model
export const brandSettingsSchema = z.object({
  agencyName: z.string().default("Review Rocket"),
  primaryColor: z.string().default("#0ea5e9"),
  logoUrl: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  calendarLink: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

export type BrandSettings = z.infer<typeof brandSettingsSchema>;

// API request/response schemas
export const analyzeLeadsRequestSchema = z.object({
  leads: z.array(z.string().min(1)).max(10).default([]),
  competitors: z.array(z.string()).optional().default([]), // Manual competitor input
  businessCategory: z.string().optional(), // User-specified business category for competitor search
  manualBusinessData: z.array(z.object({
    name: z.string(),
    address: z.string().optional(),
    rating: z.number().min(0).max(5),
    reviewCount: z.number().min(0),
  })).optional().default([]), // Manual business data when API can't find the business
}).refine(
  (data) => data.leads.length > 0 || data.manualBusinessData.length > 0,
  {
    message: "Either leads or manual business data must be provided",
    path: ["leads"],
  }
);

export const analyzeLeadsResponseSchema = z.object({
  leads: z.array(leadSchema),
  competitors: z.record(z.string(), z.array(competitorSchema)),
});

export const generatePdfRequestSchema = z.object({
  leadId: z.string(),
  brandSettings: brandSettingsSchema,
});

export const generateEmailRequestSchema = z.object({
  leadId: z.string(),
  brandSettings: brandSettingsSchema,
});

export const emailTemplateResponseSchema = z.object({
  subject: z.string(),
  emailBody: z.string(),
  dmMessage: z.string(),
});

export type AnalyzeLeadsRequest = z.infer<typeof analyzeLeadsRequestSchema>;
export type AnalyzeLeadsResponse = z.infer<typeof analyzeLeadsResponseSchema>;
export type GeneratePdfRequest = z.infer<typeof generatePdfRequestSchema>;
export type GenerateEmailRequest = z.infer<typeof generateEmailRequestSchema>;
export type EmailTemplateResponse = z.infer<typeof emailTemplateResponseSchema>;
