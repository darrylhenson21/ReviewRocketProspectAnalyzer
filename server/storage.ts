import { Lead, Competitor, ApiKey, type InsertLead, type InsertCompetitor, type InsertApiKey } from "@shared/schema";
import { db, HAVE_PG, mem } from "./db/index";

export interface IStorage {
  // Lead operations
  createLead(lead: InsertLead): Promise<Lead>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeads(): Promise<Lead[]>;
  clearLeads(): Promise<void>;
  
  // Competitor operations
  createCompetitor(competitor: InsertCompetitor): Promise<Competitor>;
  getCompetitorsByLeadId(leadId: string): Promise<Competitor[]>;
  clearCompetitors(): Promise<void>;

  // API Key operations
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByType(keyType: string): Promise<ApiKey | undefined>;
  getAllApiKeys(): Promise<ApiKey[]>;
  updateApiKey(id: string, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private leads: Map<string, Lead>;
  private competitors: Map<string, Competitor>;
  private apiKeys: Map<string, ApiKey>;
  private currentId: number;

  constructor() {
    this.leads = new Map();
    this.competitors = new Map();
    this.apiKeys = new Map();
    this.currentId = 1;
  }

  private generateId(): string {
    return (this.currentId++).toString();
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = this.generateId();
    const lead: Lead = { ...insertLead, id };
    this.leads.set(id, lead);
    return lead;
  }

  async getLead(id: string): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }

  async clearLeads(): Promise<void> {
    this.leads.clear();
  }

  async createCompetitor(insertCompetitor: InsertCompetitor): Promise<Competitor> {
    const id = this.generateId();
    const competitor: Competitor = { ...insertCompetitor, id };
    this.competitors.set(id, competitor);
    return competitor;
  }

  async getCompetitorsByLeadId(leadId: string): Promise<Competitor[]> {
    return Array.from(this.competitors.values()).filter(c => c.leadId === leadId);
  }

  async clearCompetitors(): Promise<void> {
    this.competitors.clear();
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const id = this.generateId();
    const now = new Date();
    const apiKey: ApiKey = { 
      id, 
      keyType: insertApiKey.keyType,
      keyValue: insertApiKey.keyValue,
      isActive: "true",
      createdAt: now,
      updatedAt: now 
    };
    this.apiKeys.set(id, apiKey);
    return apiKey;
  }

  async getApiKeyByType(keyType: string): Promise<ApiKey | undefined> {
    return Array.from(this.apiKeys.values()).find(key => key.keyType === keyType && key.isActive === 'true');
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter(key => key.isActive === 'true');
  }

  async updateApiKey(id: string, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const existing = this.apiKeys.get(id);
    if (!existing) return undefined;
    
    const updated: ApiKey = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.apiKeys.set(id, updated);
    return updated;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    return this.apiKeys.delete(id);
  }
}

// Use memory storage always for IDE mode (database dormant)
export const storage = new MemStorage();
