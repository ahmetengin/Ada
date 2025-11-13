/**
 * CustomerNode - AI-powered Customer Intelligence Hub
 * Central CRM, customer tracking, and AI-powered customer service
 * Features: 360° profiles, churn prediction, LTV, proactive care, multi-channel support
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';

export interface CustomerNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  companyInfo: {
    name: string;
    industry: string; // 'maritime', 'hospitality', etc.
    supportChannels: ('email' | 'phone' | 'whatsapp' | 'chat')[];
  };
}

// Customer Profile - 360° view
interface CustomerProfile {
  id: string;
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    language: 'tr' | 'en' | 'de' | 'ru' | 'ar';
    country: string;
  };
  segment: 'VIP' | 'Regular' | 'Occasional' | 'At-Risk' | 'Lost';
  lifetimeValue: number; // Total revenue
  totalSpending: number;
  firstInteraction: Date;
  lastInteraction: Date;
  status: 'active' | 'inactive' | 'churned';

  // AI Insights
  aiInsights: {
    churnRisk: 'low' | 'medium' | 'high' | 'critical';
    churnProbability: number; // 0-100
    predictedLTV: number;
    nextBestAction: string;
    actionReason: string;
    sentimentScore: number; // -1 to 1 (-1=negative, 0=neutral, 1=positive)
    satisfactionScore?: number; // 1-5
  };

  // Cross-node data
  crossNodeData: {
    // Marina
    marinaUsage?: {
      totalDays: number;
      preferredBerth?: string;
      lastVisit?: Date;
      averageStay: number; // days
    };

    // Travel
    travelPattern?: {
      totalBookings: number;
      favoriteDestinations: string[];
      preferredClass: 'economy' | 'business' | 'first';
    };

    // Restaurant
    foodPreferences?: {
      favoriteCuisines: string[];
      dietaryRestrictions: string[];
      allergens: string[];
      averageOrderValue: number;
    };

    // Finance
    paymentBehavior?: {
      onTimePayments: number;
      latePayments: number;
      averagePaymentDelay: number; // days
      preferredPaymentMethod: string;
    };

    // Legal
    legalHistory?: {
      activeContracts: number;
      totalContracts: number;
      contractTypes: string[];
    };

    // Maintenance
    maintenanceHistory?: {
      totalRequests: number;
      emergencyRequests: number;
      averageResponseTime: number; // hours
    };

    // Congress
    eventParticipation?: {
      totalEvents: number;
      eventTypes: string[];
      lastEventDate?: Date;
    };
  };

  // Interaction history
  interactions: CustomerInteraction[];
  tags: string[];
  notes: string;
  kvkkConsent: boolean; // KVKK/GDPR consent
  consentDate?: Date;
  dataRetentionUntil?: Date;
}

// Customer interaction tracking
interface CustomerInteraction {
  id: string;
  customerId: string;
  timestamp: Date;
  nodeType: string; // Which node was involved
  type: 'purchase' | 'inquiry' | 'complaint' | 'support' | 'feedback' | 'contract' | 'service';
  channel: 'email' | 'phone' | 'whatsapp' | 'chat' | 'in-person' | 'system';
  subject: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  resolved: boolean;
  metadata?: any;
}

// Support ticket system
interface SupportTicket {
  id: string;
  ticketNumber: string; // e.g., "TKT-2025-001234"
  customerId: string;
  customerName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'waiting-customer' | 'resolved' | 'closed';
  channel: 'email' | 'phone' | 'whatsapp' | 'chat';
  category: string; // 'billing', 'technical', 'complaint', 'inquiry'
  subject: string;
  description: string;
  assignedTo?: string;
  createdDate: Date;
  updatedDate: Date;
  resolvedDate?: Date;
  closedDate?: Date;
  sla: {
    responseTime: number; // minutes
    resolutionTime: number; // minutes
    breached: boolean;
  };
  messages: TicketMessage[];
  satisfaction?: number; // 1-5
  tags: string[];
}

interface TicketMessage {
  id: string;
  ticketId: string;
  from: 'customer' | 'agent' | 'system';
  message: string;
  timestamp: Date;
  attachments?: string[];
}

// Proactive action (AI recommendations)
interface ProactiveAction {
  id: string;
  customerId: string;
  type: 'reminder' | 'offer' | 'alert' | 'birthday' | 'renewal' | 'recommendation';
  action: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  scheduledFor: Date;
  executed: boolean;
  executedDate?: Date;
  targetNode?: string; // Which node should execute this
  metadata?: any;
}

// Knowledge base article
interface KnowledgeArticle {
  id: string;
  title: string;
  titleEn: string;
  category: string;
  content: string;
  contentEn: string;
  tags: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  createdDate: Date;
  updatedDate: Date;
  status: 'draft' | 'published' | 'archived';
}

export class CustomerNode extends BaseNode {
  private companyInfo: CustomerNodeConfig['companyInfo'];
  private customers: Map<string, CustomerProfile> = new Map();
  private tickets: Map<string, SupportTicket> = new Map();
  private proactiveActions: Map<string, ProactiveAction> = new Map();
  private knowledgeBase: Map<string, KnowledgeArticle> = new Map();
  private interactions: Map<string, CustomerInteraction> = new Map();

  // AI Learning - customer patterns
  private segmentationRules: Map<string, any> = new Map();
  private churnPatterns: Map<string, any> = new Map();
  private satisfactionDrivers: Map<string, number> = new Map();

  constructor(config: CustomerNodeConfig) {
    super({
      ...config,
      type: 'ada.customer',
      capabilities: {
        skills: [
          'crm',
          'customer-tracking',
          'churn-prediction',
          'ltv-calculation',
          'sentiment-analysis',
          'ticket-management',
          'proactive-care',
          'ai-insights',
          'kvkk-compliance',
        ],
        services: [
          'customer-360-view',
          'support-tickets',
          'ai-recommendations',
          'customer-segmentation',
          'interaction-tracking',
          'knowledge-base',
        ],
        integrations: [
          'all-ada-nodes',
          'email',
          'whatsapp',
          'phone-system',
          'chat-platform',
        ],
      },
    });

    this.companyInfo = config.companyInfo;
    this.initializeKnowledgeBase();
  }

  /**
   * Initialize the Customer node
   */
  async initialize(): Promise<void> {
    this.logEvent('Customer node initializing', { company: this.companyInfo });

    // Set up message handlers for cross-node communication
    this.setupCustomerHandlers();

    this.logEvent('Customer node initialized', { id: this.identity.id });
  }

  /**
   * Process tasks specific to customer management
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'create-customer':
        return this.createCustomer(data);
      case 'update-customer':
        return this.updateCustomerProfile(data);
      case 'get-customer-360':
        return this.getCustomer360View(data.customerId);
      case 'create-ticket':
        return this.createSupportTicket(data);
      case 'get-ai-insights':
        return this.getAIInsights(data.customerId);
      case 'track-interaction':
        return this.trackInteraction(data);
      case 'get-proactive-actions':
        return this.getProactiveActions(data.customerId);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    const totalCustomers = this.customers.size;
    const activeCustomers = Array.from(this.customers.values())
      .filter(c => c.status === 'active').length;

    const vipCustomers = Array.from(this.customers.values())
      .filter(c => c.segment === 'VIP').length;

    const atRiskCustomers = Array.from(this.customers.values())
      .filter(c => c.aiInsights.churnRisk === 'high' || c.aiInsights.churnRisk === 'critical').length;

    const openTickets = Array.from(this.tickets.values())
      .filter(t => t.status === 'open' || t.status === 'in-progress').length;

    const avgSatisfaction = this.calculateAverageSatisfaction();

    return {
      totalCustomers,
      activeCustomers,
      vipCustomers,
      atRiskCustomers,
      openTickets,
      avgSatisfaction,
      companyInfo: this.companyInfo,
      aiLearning: {
        segmentationRules: this.segmentationRules.size,
        churnPatterns: this.churnPatterns.size,
        satisfactionDrivers: this.satisfactionDrivers.size,
      },
    };
  }

  /**
   * Create new customer profile
   */
  createCustomer(data: {
    name: string;
    email: string;
    phone?: string;
    language?: 'tr' | 'en' | 'de' | 'ru' | 'ar';
    country?: string;
    kvkkConsent: boolean;
  }): CustomerProfile {
    const customer: CustomerProfile = {
      id: uuidv4(),
      personalInfo: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        language: data.language || 'tr',
        country: data.country || 'Turkey',
      },
      segment: 'Occasional', // Starts as occasional
      lifetimeValue: 0,
      totalSpending: 0,
      firstInteraction: new Date(),
      lastInteraction: new Date(),
      status: 'active',
      aiInsights: {
        churnRisk: 'low',
        churnProbability: 5,
        predictedLTV: 0,
        nextBestAction: 'Onboard customer with welcome package',
        actionReason: 'New customer - first impression is critical',
        sentimentScore: 0,
      },
      crossNodeData: {},
      interactions: [],
      tags: ['new-customer'],
      notes: '',
      kvkkConsent: data.kvkkConsent,
      consentDate: data.kvkkConsent ? new Date() : undefined,
      dataRetentionUntil: data.kvkkConsent
        ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) // 10 years
        : undefined,
    };

    this.customers.set(customer.id, customer);

    this.remember('data', { customer }, ['customer', 'onboarding'], 9);

    // Create proactive welcome action
    this.createProactiveAction({
      customerId: customer.id,
      type: 'reminder',
      action: 'Send welcome email with onboarding guide',
      reason: 'New customer onboarding',
      priority: 'high',
      scheduledFor: new Date(),
    });

    return customer;
  }

  /**
   * Get 360° customer view
   */
  getCustomer360View(customerId: string): any {
    const customer = this.customers.get(customerId);

    if (!customer) {
      return { error: 'Customer not found' };
    }

    // Update AI insights before returning
    this.updateAIInsights(customer);

    // Get recent interactions
    const recentInteractions = Array.from(this.interactions.values())
      .filter(i => i.customerId === customerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    // Get active tickets
    const activeTickets = Array.from(this.tickets.values())
      .filter(t => t.customerId === customerId && t.status !== 'closed')
      .sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());

    // Get pending proactive actions
    const pendingActions = Array.from(this.proactiveActions.values())
      .filter(a => a.customerId === customerId && !a.executed)
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

    return {
      customer,
      recentInteractions,
      activeTickets,
      pendingActions,
      timeline: this.generateCustomerTimeline(customerId),
    };
  }

  /**
   * Update customer profile with cross-node data
   */
  async updateCustomerProfile(data: {
    customerId: string;
    nodeType: string;
    updates: any;
  }): Promise<void> {
    const customer = this.customers.get(data.customerId);

    if (!customer) {
      console.log('Customer not found:', data.customerId);
      return;
    }

    // Update cross-node data based on node type
    switch (data.nodeType) {
      case 'ada.marina':
        customer.crossNodeData.marinaUsage = {
          ...customer.crossNodeData.marinaUsage,
          ...data.updates,
        };
        break;

      case 'ada.travel':
        customer.crossNodeData.travelPattern = {
          ...customer.crossNodeData.travelPattern,
          ...data.updates,
        };
        break;

      case 'ada.restaurant':
        customer.crossNodeData.foodPreferences = {
          ...customer.crossNodeData.foodPreferences,
          ...data.updates,
        };
        break;

      case 'ada.finance':
        customer.crossNodeData.paymentBehavior = {
          ...customer.crossNodeData.paymentBehavior,
          ...data.updates,
        };
        customer.totalSpending = data.updates.totalSpending || customer.totalSpending;
        customer.lifetimeValue = data.updates.lifetimeValue || customer.lifetimeValue;
        break;

      case 'ada.legal':
        customer.crossNodeData.legalHistory = {
          ...customer.crossNodeData.legalHistory,
          ...data.updates,
        };
        break;

      case 'ada.maintenance':
        customer.crossNodeData.maintenanceHistory = {
          ...customer.crossNodeData.maintenanceHistory,
          ...data.updates,
        };
        break;

      case 'ada.congress':
        customer.crossNodeData.eventParticipation = {
          ...customer.crossNodeData.eventParticipation,
          ...data.updates,
        };
        break;
    }

    customer.lastInteraction = new Date();

    // Update AI insights after data change
    this.updateAIInsights(customer);

    // Re-segment if needed
    this.updateCustomerSegment(customer);

    this.remember('data', {
      customerId: data.customerId,
      nodeType: data.nodeType,
      updated: true,
    }, ['customer-update', 'cross-node'], 7);
  }

  /**
   * Track customer interaction
   */
  trackInteraction(data: {
    customerId: string;
    nodeType: string;
    type: CustomerInteraction['type'];
    channel: CustomerInteraction['channel'];
    subject: string;
    sentiment?: CustomerInteraction['sentiment'];
    metadata?: any;
  }): CustomerInteraction {
    const interaction: CustomerInteraction = {
      id: uuidv4(),
      customerId: data.customerId,
      timestamp: new Date(),
      nodeType: data.nodeType,
      type: data.type,
      channel: data.channel,
      subject: data.subject,
      sentiment: data.sentiment,
      resolved: true,
      metadata: data.metadata,
    };

    this.interactions.set(interaction.id, interaction);

    // Add to customer's interaction history
    const customer = this.customers.get(data.customerId);
    if (customer) {
      customer.interactions.push(interaction);
      customer.lastInteraction = new Date();

      // Update sentiment score based on interaction
      if (data.sentiment) {
        this.updateSentimentScore(customer, data.sentiment);
      }
    }

    this.remember('data', { interaction }, ['interaction', 'tracking'], 6);

    return interaction;
  }

  /**
   * Create support ticket
   */
  createSupportTicket(data: {
    customerId: string;
    customerName: string;
    priority?: SupportTicket['priority'];
    channel: SupportTicket['channel'];
    category: string;
    subject: string;
    description: string;
  }): SupportTicket {
    const ticketNumber = this.generateTicketNumber();

    // Calculate SLA based on priority
    const slaMinutes = this.calculateSLA(data.priority || 'medium');

    const ticket: SupportTicket = {
      id: uuidv4(),
      ticketNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      priority: data.priority || 'medium',
      status: 'open',
      channel: data.channel,
      category: data.category,
      subject: data.subject,
      description: data.description,
      createdDate: new Date(),
      updatedDate: new Date(),
      sla: {
        responseTime: slaMinutes.response,
        resolutionTime: slaMinutes.resolution,
        breached: false,
      },
      messages: [
        {
          id: uuidv4(),
          ticketId: ticketNumber,
          from: 'customer',
          message: data.description,
          timestamp: new Date(),
        },
      ],
      tags: [data.category],
    };

    this.tickets.set(ticket.id, ticket);

    // Track as interaction
    this.trackInteraction({
      customerId: data.customerId,
      nodeType: 'ada.customer',
      type: 'support',
      channel: data.channel,
      subject: data.subject,
      sentiment: 'neutral',
    });

    // Auto-escalate if critical
    if (data.priority === 'critical') {
      this.escalateTicket(ticket.id);
    }

    this.remember('data', { ticket }, ['support', 'ticket'], 8);

    return ticket;
  }

  /**
   * Update AI insights for customer
   */
  private updateAIInsights(customer: CustomerProfile): void {
    // Calculate churn risk
    const churnRisk = this.calculateChurnRisk(customer);
    customer.aiInsights.churnRisk = churnRisk.level;
    customer.aiInsights.churnProbability = churnRisk.probability;

    // Calculate predicted LTV
    customer.aiInsights.predictedLTV = this.calculatePredictedLTV(customer);

    // Generate next best action
    const nextAction = this.generateNextBestAction(customer);
    customer.aiInsights.nextBestAction = nextAction.action;
    customer.aiInsights.actionReason = nextAction.reason;
  }

  /**
   * Calculate churn risk using AI patterns
   */
  private calculateChurnRisk(customer: CustomerProfile): {
    level: 'low' | 'medium' | 'high' | 'critical';
    probability: number;
  } {
    let riskScore = 0;

    // Days since last interaction
    const daysSinceLastInteraction = Math.floor(
      (Date.now() - customer.lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastInteraction > 180) riskScore += 40;
    else if (daysSinceLastInteraction > 90) riskScore += 25;
    else if (daysSinceLastInteraction > 30) riskScore += 10;

    // Sentiment score
    if (customer.aiInsights.sentimentScore < -0.5) riskScore += 30;
    else if (customer.aiInsights.sentimentScore < 0) riskScore += 15;

    // Payment behavior
    if (customer.crossNodeData.paymentBehavior) {
      const { latePayments, onTimePayments } = customer.crossNodeData.paymentBehavior;
      const latePaymentRatio = latePayments / Math.max(1, latePayments + onTimePayments);
      riskScore += latePaymentRatio * 20;
    }

    // Ticket resolution (unresolved complaints increase risk)
    const unresolvedComplaints = customer.interactions.filter(
      i => i.type === 'complaint' && !i.resolved
    ).length;
    riskScore += unresolvedComplaints * 10;

    // Spending trend (decreasing spending = higher risk)
    if (customer.lifetimeValue > 0 && customer.totalSpending < customer.lifetimeValue * 0.5) {
      riskScore += 15;
    }

    // Determine level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 70) level = 'critical';
    else if (riskScore >= 50) level = 'high';
    else if (riskScore >= 30) level = 'medium';
    else level = 'low';

    return { level, probability: Math.min(95, riskScore) };
  }

  /**
   * Calculate predicted Lifetime Value
   */
  private calculatePredictedLTV(customer: CustomerProfile): number {
    const customerAge = Math.floor(
      (Date.now() - customer.firstInteraction.getTime()) / (1000 * 60 * 60 * 24 * 30)
    ); // months

    if (customerAge === 0) {
      // New customer - estimate based on segment
      const segmentAverageLTV = {
        'VIP': 100000,
        'Regular': 30000,
        'Occasional': 10000,
        'At-Risk': 5000,
        'Lost': 0,
      };
      return segmentAverageLTV[customer.segment];
    }

    // Calculate monthly average spending
    const monthlyAverage = customer.totalSpending / customerAge;

    // Project for 24 months (average customer lifetime in maritime)
    const projectedLTV = monthlyAverage * 24;

    // Adjust based on churn risk
    const churnMultiplier = {
      'low': 1.0,
      'medium': 0.7,
      'high': 0.4,
      'critical': 0.2,
    };

    return Math.round(projectedLTV * churnMultiplier[customer.aiInsights.churnRisk]);
  }

  /**
   * Generate next best action using AI
   */
  private generateNextBestAction(customer: CustomerProfile): {
    action: string;
    reason: string;
  } {
    // Critical churn risk - immediate intervention
    if (customer.aiInsights.churnRisk === 'critical') {
      return {
        action: 'Schedule urgent call with customer success manager',
        reason: 'Customer at critical risk of churning. Immediate personal attention needed.',
      };
    }

    // High churn risk - retention offer
    if (customer.aiInsights.churnRisk === 'high') {
      return {
        action: 'Offer loyalty discount or exclusive benefit package',
        reason: 'Customer showing signs of disengagement. Retention offer may prevent churn.',
      };
    }

    // VIP customer with good behavior - upsell
    if (customer.segment === 'VIP' && customer.aiInsights.churnRisk === 'low') {
      return {
        action: 'Present premium service package or annual contract upgrade',
        reason: 'VIP customer with excellent payment history. Ready for premium offerings.',
      };
    }

    // Marina usage pattern - berth contract
    if (customer.crossNodeData.marinaUsage &&
        customer.crossNodeData.marinaUsage.totalDays > 180) {
      return {
        action: 'Offer annual berth contract with 15% discount',
        reason: `Customer uses marina frequently (${customer.crossNodeData.marinaUsage.totalDays} days). Annual contract saves money.`,
      };
    }

    // Travel pattern - package deal
    if (customer.crossNodeData.travelPattern &&
        customer.crossNodeData.travelPattern.totalBookings > 5) {
      return {
        action: 'Offer travel package with hotel + flight bundle',
        reason: `Frequent traveler (${customer.crossNodeData.travelPattern.totalBookings} bookings). Package deals provide value.`,
      };
    }

    // Birthday coming - special offer
    // (Would check birthday if we had it in personalInfo)

    // Default - regular engagement
    return {
      action: 'Send monthly newsletter with tips and offers',
      reason: 'Regular customer engagement to maintain relationship.',
    };
  }

  /**
   * Update customer segment based on behavior
   */
  private updateCustomerSegment(customer: CustomerProfile): void {
    const oldSegment = customer.segment;

    // VIP criteria
    if (customer.lifetimeValue > 50000 &&
        customer.aiInsights.churnRisk === 'low' &&
        customer.crossNodeData.paymentBehavior?.onTimePayments! >= 10) {
      customer.segment = 'VIP';
    }
    // At-Risk criteria
    else if (customer.aiInsights.churnRisk === 'high' ||
             customer.aiInsights.churnRisk === 'critical') {
      customer.segment = 'At-Risk';
    }
    // Regular criteria
    else if (customer.lifetimeValue > 10000 && customer.interactions.length > 5) {
      customer.segment = 'Regular';
    }
    // Occasional
    else if (customer.status === 'active') {
      customer.segment = 'Occasional';
    }
    // Lost
    else if (customer.status === 'churned') {
      customer.segment = 'Lost';
    }

    if (oldSegment !== customer.segment) {
      console.log(`Customer ${customer.personalInfo.name} segment changed: ${oldSegment} → ${customer.segment}`);

      // Create proactive action for segment change
      if (customer.segment === 'At-Risk') {
        this.createProactiveAction({
          customerId: customer.id,
          type: 'alert',
          action: 'Initiate retention campaign',
          reason: `Customer moved to At-Risk segment from ${oldSegment}`,
          priority: 'high',
          scheduledFor: new Date(),
        });
      }
    }
  }

  /**
   * Update sentiment score
   */
  private updateSentimentScore(customer: CustomerProfile, sentiment: 'positive' | 'neutral' | 'negative'): void {
    const sentimentValue = {
      'positive': 0.3,
      'neutral': 0,
      'negative': -0.3,
    };

    // Moving average with weight on recent interactions
    customer.aiInsights.sentimentScore =
      (customer.aiInsights.sentimentScore * 0.7) + (sentimentValue[sentiment] * 0.3);

    // Clamp to [-1, 1]
    customer.aiInsights.sentimentScore = Math.max(-1, Math.min(1, customer.aiInsights.sentimentScore));
  }

  /**
   * Create proactive action
   */
  private createProactiveAction(data: {
    customerId: string;
    type: ProactiveAction['type'];
    action: string;
    reason: string;
    priority: ProactiveAction['priority'];
    scheduledFor: Date;
    targetNode?: string;
    metadata?: any;
  }): ProactiveAction {
    const action: ProactiveAction = {
      id: uuidv4(),
      customerId: data.customerId,
      type: data.type,
      action: data.action,
      reason: data.reason,
      priority: data.priority,
      scheduledFor: data.scheduledFor,
      executed: false,
      targetNode: data.targetNode,
      metadata: data.metadata,
    };

    this.proactiveActions.set(action.id, action);

    return action;
  }

  /**
   * Get proactive actions for customer
   */
  getProactiveActions(customerId: string): ProactiveAction[] {
    return Array.from(this.proactiveActions.values())
      .filter(a => a.customerId === customerId && !a.executed)
      .sort((a, b) => {
        // Sort by priority then scheduled time
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.scheduledFor.getTime() - b.scheduledFor.getTime();
      });
  }

  /**
   * Get AI insights for customer
   */
  getAIInsights(customerId: string): any {
    const customer = this.customers.get(customerId);

    if (!customer) {
      return { error: 'Customer not found' };
    }

    this.updateAIInsights(customer);

    return {
      customerId,
      customerName: customer.personalInfo.name,
      segment: customer.segment,
      insights: customer.aiInsights,
      recommendations: this.getProactiveActions(customerId),
      riskFactors: this.identifyRiskFactors(customer),
      opportunities: this.identifyOpportunities(customer),
    };
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(customer: CustomerProfile): string[] {
    const risks: string[] = [];

    const daysSinceLastInteraction = Math.floor(
      (Date.now() - customer.lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastInteraction > 90) {
      risks.push(`No interaction in ${daysSinceLastInteraction} days`);
    }

    if (customer.aiInsights.sentimentScore < 0) {
      risks.push('Negative sentiment detected');
    }

    if (customer.crossNodeData.paymentBehavior?.latePayments! > 0) {
      risks.push(`${customer.crossNodeData.paymentBehavior?.latePayments} late payments`);
    }

    const unresolvedComplaints = customer.interactions.filter(
      i => i.type === 'complaint' && !i.resolved
    ).length;
    if (unresolvedComplaints > 0) {
      risks.push(`${unresolvedComplaints} unresolved complaints`);
    }

    return risks;
  }

  /**
   * Identify upsell/cross-sell opportunities
   */
  private identifyOpportunities(customer: CustomerProfile): string[] {
    const opportunities: string[] = [];

    // Marina opportunity
    if (customer.crossNodeData.marinaUsage &&
        customer.crossNodeData.marinaUsage.totalDays > 90 &&
        !customer.crossNodeData.legalHistory?.contractTypes?.includes('yearly')) {
      opportunities.push('Annual berth contract (high marina usage)');
    }

    // Travel opportunity
    if (customer.crossNodeData.travelPattern?.totalBookings! > 3) {
      opportunities.push('Travel loyalty program enrollment');
    }

    // Restaurant opportunity
    if (customer.crossNodeData.eventParticipation?.totalEvents! > 2) {
      opportunities.push('Event catering package');
    }

    // VIP upgrade opportunity
    if (customer.segment === 'Regular' && customer.lifetimeValue > 30000) {
      opportunities.push('VIP membership upgrade');
    }

    return opportunities;
  }

  /**
   * Generate customer timeline
   */
  private generateCustomerTimeline(customerId: string): any[] {
    const interactions = Array.from(this.interactions.values())
      .filter(i => i.customerId === customerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    return interactions.map(i => ({
      date: i.timestamp,
      type: i.type,
      node: i.nodeType,
      subject: i.subject,
      sentiment: i.sentiment,
    }));
  }

  /**
   * Escalate ticket
   */
  private escalateTicket(ticketId: string): void {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return;

    ticket.priority = 'critical';
    ticket.updatedDate = new Date();

    // Create proactive action for immediate attention
    this.createProactiveAction({
      customerId: ticket.customerId,
      type: 'alert',
      action: `URGENT: Resolve ticket ${ticket.ticketNumber}`,
      reason: 'Critical priority ticket requires immediate attention',
      priority: 'high',
      scheduledFor: new Date(),
      metadata: { ticketId: ticket.id },
    });

    console.log(`🚨 Ticket ${ticket.ticketNumber} escalated to CRITICAL`);
  }

  /**
   * Calculate SLA times based on priority
   */
  private calculateSLA(priority: SupportTicket['priority']): {
    response: number;
    resolution: number;
  } {
    const slaMatrix = {
      'critical': { response: 15, resolution: 120 },    // 15min / 2hr
      'high': { response: 60, resolution: 480 },        // 1hr / 8hr
      'medium': { response: 240, resolution: 1440 },    // 4hr / 24hr
      'low': { response: 480, resolution: 2880 },       // 8hr / 48hr
    };

    return slaMatrix[priority];
  }

  /**
   * Generate ticket number
   */
  private generateTicketNumber(): string {
    const year = new Date().getFullYear();
    const count = this.tickets.size + 1;
    return `TKT-${year}-${String(count).padStart(6, '0')}`;
  }

  /**
   * Calculate average satisfaction
   */
  private calculateAverageSatisfaction(): number {
    const satisfactionScores = Array.from(this.customers.values())
      .map(c => c.aiInsights.satisfactionScore)
      .filter(s => s !== undefined) as number[];

    if (satisfactionScores.length === 0) return 0;

    const sum = satisfactionScores.reduce((a, b) => a + b, 0);
    return Math.round((sum / satisfactionScores.length) * 10) / 10;
  }

  /**
   * Initialize knowledge base with common articles
   */
  private initializeKnowledgeBase(): void {
    const articles: KnowledgeArticle[] = [
      {
        id: uuidv4(),
        title: 'Marina Rezervasyon Nasıl Yapılır?',
        titleEn: 'How to Make Marina Reservation?',
        category: 'marina',
        content: 'Marina rezervasyonu yapmak için...',
        contentEn: 'To make a marina reservation...',
        tags: ['marina', 'reservation', 'berth'],
        views: 0,
        helpful: 0,
        notHelpful: 0,
        createdDate: new Date(),
        updatedDate: new Date(),
        status: 'published',
      },
      {
        id: uuidv4(),
        title: 'Ödeme Yöntemleri',
        titleEn: 'Payment Methods',
        category: 'billing',
        content: 'Kabul edilen ödeme yöntemleri: Kredi kartı, banka havalesi...',
        contentEn: 'Accepted payment methods: Credit card, wire transfer...',
        tags: ['payment', 'billing', 'finance'],
        views: 0,
        helpful: 0,
        notHelpful: 0,
        createdDate: new Date(),
        updatedDate: new Date(),
        status: 'published',
      },
    ];

    articles.forEach(article => {
      this.knowledgeBase.set(article.id, article);
    });
  }

  /**
   * Setup message handlers for cross-node communication
   */
  private setupCustomerHandlers(): void {
    // Customer profile update from other nodes
    this.communication.onMessage('update-customer-data', async (message) => {
      await this.updateCustomerProfile(message.payload);
      return { success: true };
    });

    // Track interaction from other nodes
    this.communication.onMessage('track-interaction', async (message) => {
      const interaction = this.trackInteraction(message.payload);
      return { success: true, interaction };
    });

    // Get customer 360 view
    this.communication.onMessage('get-customer-360', async (message) => {
      const view = this.getCustomer360View(message.payload.customerId);
      return view;
    });

    // Create support ticket
    this.communication.onMessage('create-ticket', async (message) => {
      const ticket = this.createSupportTicket(message.payload);
      return { success: true, ticket };
    });

    // Get AI insights
    this.communication.onMessage('get-ai-insights', async (message) => {
      const insights = this.getAIInsights(message.payload.customerId);
      return insights;
    });
  }
}
