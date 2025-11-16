/**
 * RestaurantNode - AI-powered food & catering service node
 * Manages menus, provisioning, catering for yachts and events
 * Learns dietary preferences, seasonal ingredients, and guest satisfaction
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';
import { PaymentStatus, PaymentPolicy } from '../../core/types.js';

export interface RestaurantNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  restaurantInfo: {
    name: string;
    cuisine: string[]; // Mediterranean, Turkish, Italian, etc.
    certifications: string[]; // HACCP, ISO 22000, Halal, etc.
  };
}

interface MenuItem {
  id: string;
  name: string;
  nameEn: string;
  category: 'appetizer' | 'main' | 'dessert' | 'beverage' | 'breakfast';
  cuisine: string;
  ingredients: string[];
  allergens: string[];
  dietary: ('vegetarian' | 'vegan' | 'gluten-free' | 'halal' | 'kosher')[];
  price: number;
  preparationTime: number; // minutes
  seasonal: boolean;
  popularity: number; // AI learns from orders
  lastOrdered?: Date;
}

interface Menu {
  id: string;
  name: string;
  type: 'daily' | 'event' | 'yacht-charter' | 'a-la-carte';
  items: MenuItem[];
  servingSize: number; // Number of people
  totalPrice: number;
  createdDate: Date;
  validUntil?: Date;
}

interface CateringOrder {
  id: string;
  customerId: string;
  customerName: string;
  orderType: 'yacht-provisioning' | 'event-catering' | 'daily-meal';
  menu: Menu;
  deliveryDate: Date;
  deliveryLocation: string;
  guestCount: number;
  specialRequests: string[];
  dietaryRestrictions: string[];
  status: 'pending' | 'pending-payment' | 'confirmed' | 'preparing' | 'delivered' | 'completed' | 'cancelled';
  totalCost: number;
  satisfaction?: number; // 1-5, AI learns from this
  feedback?: string;
  isPrepaid?: boolean; // Gala dinners, special events
  requiresDeposit?: boolean; // Large groups (10+)
}

interface ProvisioningRequest {
  id: string;
  vesselId: string;
  vesselName: string;
  duration: number; // days at sea
  crewSize: number;
  guestCount: number;
  preferences: {
    cuisine: string[];
    dietaryRestrictions: string[];
    budget: 'economy' | 'standard' | 'premium' | 'luxury';
  };
  items: ProvisioningItem[];
  estimatedCost: number;
  deliveryDate: Date;
  status: 'calculating' | 'quoted' | 'approved' | 'delivered';
}

interface ProvisioningItem {
  category: 'fresh-produce' | 'meat-seafood' | 'dairy' | 'dry-goods' | 'beverages' | 'supplies';
  item: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  supplier?: string;
}

export class RestaurantNode extends BaseNode {
  private restaurantInfo: RestaurantNodeConfig['restaurantInfo'];
  private menuItems: Map<string, MenuItem> = new Map();
  private menus: Map<string, Menu> = new Map();
  private orders: Map<string, CateringOrder> = new Map();
  private provisioningRequests: Map<string, ProvisioningRequest> = new Map();

  // Payment tracking
  private paymentStatuses: Map<string, PaymentStatus> = new Map();

  // AI Learning Database
  private guestPreferences: Map<string, any> = new Map(); // Learns dietary preferences
  private seasonalAvailability: Map<string, string[]> = new Map(); // Learns seasonal ingredients
  private satisfactionPatterns: Map<string, number> = new Map(); // Learns what guests like

  constructor(config: RestaurantNodeConfig) {
    super({
      ...config,
      type: 'ada.restaurant',
      capabilities: {
        skills: [
          'menu-planning',
          'catering',
          'provisioning',
          'dietary-planning',
          'cost-optimization',
          'quality-control',
          'seasonal-sourcing',
          'guest-satisfaction',
          'ai-learning', // Learns preferences
          'taste-prediction', // Predicts guest satisfaction
        ],
        services: [
          'yacht-provisioning',
          'event-catering',
          'daily-meals',
          'custom-menus',
          'dietary-consultation',
          'supplier-management',
        ],
        integrations: [
          'ada.sea',
          'ada.marina',
          'ada.congress',
          'ada.finance',
          'supplier-apis',
          'food-safety-systems',
        ],
      },
    });

    this.restaurantInfo = config.restaurantInfo;
    this.initializeMenu();
    this.initializeSeasonalKnowledge();
  }

  /**
   * Initialize the Restaurant node
   */
  async initialize(): Promise<void> {
    this.logEvent('Restaurant node initializing', { restaurant: this.restaurantInfo });
    this.setupRestaurantHandlers();
    this.logEvent('Restaurant node initialized', { id: this.identity.id });
  }

  /**
   * Process restaurant tasks
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'create-catering-order':
        return this.createCateringOrder(data);
      case 'confirm-catering-payment':
        return this.confirmCateringPayment(data);
      case 'plan-yacht-provisioning':
        return this.planYachtProvisioning(data);
      case 'get-recommendations':
        return this.getAIRecommendations(data);
      case 'update-satisfaction':
        return this.updateSatisfaction(data);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    const activeOrders = Array.from(this.orders.values())
      .filter(o => o.status === 'confirmed' || o.status === 'preparing').length;

    const totalSatisfaction = Array.from(this.orders.values())
      .filter(o => o.satisfaction)
      .reduce((sum, o) => sum + (o.satisfaction || 0), 0);

    const avgSatisfaction = totalSatisfaction / Math.max(1, Array.from(this.orders.values())
      .filter(o => o.satisfaction).length);

    return {
      restaurant: this.restaurantInfo,
      totalOrders: this.orders.size,
      activeOrders,
      menuItems: this.menuItems.size,
      averageSatisfaction: avgSatisfaction.toFixed(2),
      learnedPreferences: this.guestPreferences.size,
    };
  }

  /**
   * Create catering order with AI menu optimization
   */
  async createCateringOrder(data: {
    customerId: string;
    customerName: string;
    orderType: CateringOrder['orderType'];
    guestCount: number;
    cuisine?: string[];
    dietaryRestrictions?: string[];
    budget?: number;
    deliveryDate: Date;
    deliveryLocation: string;
    isPrepaid?: boolean; // Gala dinners, special events
  }): Promise<any> {
    // AI selects menu based on:
    // 1. Guest count
    // 2. Dietary restrictions
    // 3. Budget
    // 4. Popularity (learned from past orders)
    // 5. Seasonal availability

    const menu = await this.createOptimizedMenu(
      data.guestCount,
      data.cuisine || ['Mediterranean'],
      data.dietaryRestrictions || [],
      data.budget
    );

    // Determine payment policy
    const isPrepaid = data.isPrepaid || false;
    const requiresDeposit = data.guestCount >= 10;
    const paymentPolicy: PaymentPolicy = isPrepaid ? 'prepaid' : (requiresDeposit ? 'mixed' : 'postpaid');

    const order: CateringOrder = {
      id: uuidv4(),
      customerId: data.customerId,
      customerName: data.customerName,
      orderType: data.orderType,
      menu,
      deliveryDate: data.deliveryDate,
      deliveryLocation: data.deliveryLocation,
      guestCount: data.guestCount,
      specialRequests: [],
      dietaryRestrictions: data.dietaryRestrictions || [],
      status: isPrepaid || requiresDeposit ? 'pending-payment' : 'pending',
      totalCost: menu.totalPrice,
      isPrepaid,
      requiresDeposit,
    };

    // Create payment status
    const depositAmount = requiresDeposit ? menu.totalPrice * 0.3 : 0; // 30% deposit for large groups
    const paymentStatus: PaymentStatus = {
      status: 'pending',
      totalAmount: menu.totalPrice,
      paidAmount: 0,
      remainingAmount: menu.totalPrice,
      currency: 'USD',
      createdAt: new Date(),
    };

    if (requiresDeposit) {
      paymentStatus.schedule = [
        {
          description: 'Deposit (30%)',
          amount: depositAmount,
          dueDate: new Date(), // Immediate
          status: 'pending',
        },
        {
          description: 'Balance (70%)',
          amount: menu.totalPrice - depositAmount,
          dueDate: data.deliveryDate,
          status: 'pending',
        },
      ];
    }

    this.orders.set(order.id, order);
    this.paymentStatuses.set(order.id, paymentStatus);

    // Learn from this order
    this.learnFromOrder(order);

    this.remember('data', { order, aiOptimized: true }, ['catering', 'ai-learning'], 8);

    // Return different response based on payment policy
    if (isPrepaid) {
      const paymentLink = `https://payment.ada-ecosystem.com/pay/${order.id}`;
      return {
        success: true,
        order,
        paymentPolicy: 'prepaid',
        paymentRequired: true,
        paymentLink,
        message: '⚠️ Full payment required before event confirmation.',
      };
    }

    if (requiresDeposit) {
      const depositPaymentLink = `https://payment.ada-ecosystem.com/pay/${order.id}/deposit`;
      return {
        success: true,
        order,
        paymentPolicy: 'mixed',
        depositRequired: true,
        depositAmount,
        depositPaymentLink,
        balanceDue: menu.totalPrice - depositAmount,
        balanceDueDate: data.deliveryDate,
        message: `⚠️ Deposit of $${depositAmount} required for groups of ${data.guestCount} people.`,
      };
    }

    // POSTPAID - normal daily meals
    return {
      success: true,
      order,
      paymentPolicy: 'postpaid',
      paymentDue: 'After service',
      message: '✅ Order confirmed. Payment after service.',
    };
  }

  /**
   * Confirm payment for catering order
   * For prepaid events and deposit payments
   */
  async confirmCateringPayment(data: {
    orderId: string;
    transactionId: string;
    paidAmount: number;
    paymentMethod: 'credit-card' | 'bank-transfer' | 'cash';
    paymentType?: 'full' | 'deposit' | 'balance';
  }): Promise<any> {
    const order = this.orders.get(data.orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    const paymentStatus = this.paymentStatuses.get(data.orderId);
    if (!paymentStatus) {
      return { success: false, message: 'Payment status not found' };
    }

    const paymentType = data.paymentType || 'full';

    // Handle deposit payment (for large groups)
    if (paymentType === 'deposit' && order.requiresDeposit) {
      const depositSchedule = paymentStatus.schedule?.[0];
      if (!depositSchedule) {
        return { success: false, message: 'Deposit schedule not found' };
      }

      if (data.paidAmount < depositSchedule.amount) {
        return {
          success: false,
          message: `Insufficient deposit. Required: ${depositSchedule.amount}, Paid: ${data.paidAmount}`,
        };
      }

      // Update deposit schedule
      depositSchedule.status = 'paid';
      depositSchedule.paidAt = new Date();

      paymentStatus.paidAmount += data.paidAmount;
      paymentStatus.remainingAmount -= data.paidAmount;
      paymentStatus.status = 'partial';

      order.status = 'confirmed';

      return {
        success: true,
        message: '✅ Deposit received! Order confirmed.',
        order,
        depositPaid: data.paidAmount,
        remainingBalance: paymentStatus.remainingAmount,
        balanceDueDate: paymentStatus.schedule?.[1]?.dueDate,
      };
    }

    // Handle full payment or balance payment
    const requiredAmount = paymentType === 'balance'
      ? paymentStatus.remainingAmount
      : paymentStatus.totalAmount;

    if (data.paidAmount < requiredAmount) {
      return {
        success: false,
        message: `Insufficient payment. Required: ${requiredAmount}, Paid: ${data.paidAmount}`,
      };
    }

    // Update payment status
    paymentStatus.status = 'paid';
    paymentStatus.paidAmount = paymentStatus.totalAmount;
    paymentStatus.remainingAmount = 0;
    paymentStatus.paidAt = new Date();
    paymentStatus.transactionId = data.transactionId;
    paymentStatus.paymentMethod = data.paymentMethod;

    // Update balance schedule if exists
    if (paymentStatus.schedule?.[1]) {
      paymentStatus.schedule[1].status = 'paid';
      paymentStatus.schedule[1].paidAt = new Date();
    }

    order.status = 'confirmed';

    this.remember('data', {
      order,
      payment: paymentStatus,
    }, ['catering', 'payment'], 8);

    return {
      success: true,
      message: '✅ Payment confirmed! Order ready for preparation.',
      order,
      paymentStatus,
    };
  }

  /**
   * Create invoice for catering order via Finance node
   */
  private async createInvoiceForOrder(order: CateringOrder): Promise<void> {
    const financeNodes = BaseNode.findNodesByType('ada.finance');
    if (financeNodes.length === 0) {
      console.log('No finance node available for invoice creation');
      return;
    }

    try {
      // Prepare invoice items from menu
      const invoiceItems = order.menu.items.map(item => ({
        description: item.name,
        quantity: 1, // Each menu item is prepared per serving
        unitPrice: item.price,
        vatRate: 10, // %10 KDV for food services in Turkey
      }));

      const invoiceResponse = await this.requestFromNode(
        financeNodes[0].getIdentity().id,
        'create-invoice',
        {
          customerId: order.customerId,
          customerName: order.customerName || 'Customer',
          items: invoiceItems,
          withholdingRate: 0, // No withholding for catering services
        }
      );

      this.remember('data', {
        orderId: order.id,
        invoice: invoiceResponse,
      }, ['invoice', 'finance'], 8);

      console.log(`✅ Invoice created for catering order ${order.id}: ${invoiceResponse.invoice?.invoiceNumber}`);
    } catch (error: any) {
      console.error(`Failed to create invoice for order ${order.id}:`, error.message);
    }
  }

  /**
   * Plan yacht provisioning with AI optimization
   */
  async planYachtProvisioning(data: {
    vesselId: string;
    vesselName: string;
    duration: number; // days
    crewSize: number;
    guestCount: number;
    preferences: ProvisioningRequest['preferences'];
    deliveryDate: Date;
  }): Promise<ProvisioningRequest> {
    const totalPeople = data.crewSize + data.guestCount;
    const items: ProvisioningItem[] = [];

    // AI calculates provisioning based on:
    // - Duration
    // - Number of people
    // - Dietary preferences
    // - Budget
    // - Learned consumption patterns

    // Fresh produce (AI knows consumption rates)
    items.push({
      category: 'fresh-produce',
      item: 'Mixed vegetables',
      quantity: totalPeople * data.duration * 0.5, // kg per person per day
      unit: 'kg',
      estimatedCost: totalPeople * data.duration * 0.5 * 8, // 8 TRY/kg
    });

    items.push({
      category: 'fresh-produce',
      item: 'Fresh fruits',
      quantity: totalPeople * data.duration * 0.3,
      unit: 'kg',
      estimatedCost: totalPeople * data.duration * 0.3 * 15, // 15 TRY/kg
    });

    // Protein (AI adjusts based on dietary restrictions)
    if (!data.preferences.dietaryRestrictions.includes('vegetarian')) {
      items.push({
        category: 'meat-seafood',
        item: 'Fresh fish & seafood',
        quantity: totalPeople * data.duration * 0.2,
        unit: 'kg',
        estimatedCost: totalPeople * data.duration * 0.2 * 80, // 80 TRY/kg
      });

      items.push({
        category: 'meat-seafood',
        item: 'Chicken & poultry',
        quantity: totalPeople * data.duration * 0.15,
        unit: 'kg',
        estimatedCost: totalPeople * data.duration * 0.15 * 45, // 45 TRY/kg
      });
    }

    // Dairy
    items.push({
      category: 'dairy',
      item: 'Milk, cheese, yogurt',
      quantity: totalPeople * data.duration * 0.4,
      unit: 'kg',
      estimatedCost: totalPeople * data.duration * 0.4 * 25, // 25 TRY/kg
    });

    // Beverages
    items.push({
      category: 'beverages',
      item: 'Water (bottled)',
      quantity: totalPeople * data.duration * 3, // 3L per person per day
      unit: 'L',
      estimatedCost: totalPeople * data.duration * 3 * 2, // 2 TRY/L
    });

    items.push({
      category: 'beverages',
      item: 'Wine & beverages',
      quantity: totalPeople * data.duration * 0.5,
      unit: 'L',
      estimatedCost: totalPeople * data.duration * 0.5 * 100, // 100 TRY/L
    });

    // Dry goods
    items.push({
      category: 'dry-goods',
      item: 'Pasta, rice, bread',
      quantity: totalPeople * data.duration * 0.3,
      unit: 'kg',
      estimatedCost: totalPeople * data.duration * 0.3 * 20, // 20 TRY/kg
    });

    const totalCost = items.reduce((sum, item) => sum + item.estimatedCost, 0);

    const request: ProvisioningRequest = {
      id: uuidv4(),
      vesselId: data.vesselId,
      vesselName: data.vesselName,
      duration: data.duration,
      crewSize: data.crewSize,
      guestCount: data.guestCount,
      preferences: data.preferences,
      items,
      estimatedCost: totalCost,
      deliveryDate: data.deliveryDate,
      status: 'quoted',
    };

    this.provisioningRequests.set(request.id, request);

    this.remember('data', { request, aiCalculated: true }, ['provisioning', 'yacht'], 8);

    return request;
  }

  /**
   * Create custom menu (AI-optimized)
   */
  private async createOptimizedMenu(
    guestCount: number,
    cuisines: string[],
    dietaryRestrictions: string[],
    budget?: number
  ): Promise<Menu> {
    const selectedItems: MenuItem[] = [];

    // AI selects items based on:
    // 1. Popularity (learned from past orders)
    // 2. Dietary compatibility
    // 3. Seasonal availability
    // 4. Budget constraints

    const availableItems = Array.from(this.menuItems.values())
      .filter(item => {
        // Filter by cuisine
        if (cuisines.length > 0 && !cuisines.includes(item.cuisine)) return false;

        // Filter by dietary restrictions
        for (const restriction of dietaryRestrictions) {
          if (restriction === 'vegetarian' && !item.dietary.includes('vegetarian')) return false;
          if (restriction === 'vegan' && !item.dietary.includes('vegan')) return false;
          if (restriction === 'gluten-free' && !item.dietary.includes('gluten-free')) return false;
        }

        return true;
      })
      .sort((a, b) => b.popularity - a.popularity); // Sort by popularity (AI learned)

    // Select appetizers (AI picks top 2)
    const appetizers = availableItems.filter(i => i.category === 'appetizer').slice(0, 2);
    selectedItems.push(...appetizers);

    // Select main courses (AI picks top 3)
    const mains = availableItems.filter(i => i.category === 'main').slice(0, 3);
    selectedItems.push(...mains);

    // Select desserts (AI picks top 2)
    const desserts = availableItems.filter(i => i.category === 'dessert').slice(0, 2);
    selectedItems.push(...desserts);

    const totalPrice = selectedItems.reduce((sum, item) => sum + (item.price * guestCount), 0);

    const menu: Menu = {
      id: uuidv4(),
      name: `${cuisines.join('/')} Menu for ${guestCount} guests`,
      type: 'event',
      items: selectedItems,
      servingSize: guestCount,
      totalPrice,
      createdDate: new Date(),
    };

    this.menus.set(menu.id, menu);

    return menu;
  }

  /**
   * Get AI recommendations
   */
  async getAIRecommendations(data: {
    guestProfile?: string;
    season?: string;
  }): Promise<any> {
    // AI recommends based on learned patterns
    const seasonal = this.seasonalAvailability.get(data.season || this.getCurrentSeason()) || [];

    const topRated = Array.from(this.menuItems.values())
      .filter(item => item.seasonal && seasonal.includes(item.name))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 5);

    return {
      recommendations: topRated.map(item => ({
        name: item.name,
        popularity: item.popularity,
        reason: `Highly rated (${item.popularity}/10) and seasonal`,
      })),
      seasonalIngredients: seasonal,
      aiConfidence: 0.87,
    };
  }

  /**
   * Update satisfaction (AI learns from feedback)
   */
  async updateSatisfaction(data: {
    orderId: string;
    satisfaction: number; // 1-5
    feedback?: string;
  }): Promise<void> {
    const order = this.orders.get(data.orderId);

    if (!order) return;

    order.satisfaction = data.satisfaction;
    order.feedback = data.feedback;
    order.status = 'completed';

    // AI learns from satisfaction
    order.menu.items.forEach(item => {
      const menuItem = this.menuItems.get(item.id);
      if (menuItem) {
        // Adjust popularity based on satisfaction
        const adjustment = (data.satisfaction - 3) * 0.5; // -1 to +1
        menuItem.popularity = Math.max(0, Math.min(10, menuItem.popularity + adjustment));
        menuItem.lastOrdered = new Date();

        this.satisfactionPatterns.set(item.id, data.satisfaction);
      }
    });

    this.remember('data', {
      orderId: data.orderId,
      satisfaction: data.satisfaction,
      itemsLearned: order.menu.items.length,
    }, ['ai-learning', 'satisfaction'], 9);
  }

  /**
   * Learn from order patterns
   */
  private learnFromOrder(order: CateringOrder): void {
    // Learn dietary preferences
    if (order.dietaryRestrictions.length > 0) {
      this.guestPreferences.set(order.customerId, {
        restrictions: order.dietaryRestrictions,
        lastOrder: new Date(),
      });
    }

    // Update item popularity
    order.menu.items.forEach(item => {
      const menuItem = this.menuItems.get(item.id);
      if (menuItem) {
        menuItem.popularity += 0.1; // Slight boost for being ordered
      }
    });
  }

  /**
   * Get current season
   */
  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * Initialize seasonal knowledge (AI learned)
   */
  private initializeSeasonalKnowledge(): void {
    this.seasonalAvailability.set('spring', [
      'Asparagus', 'Artichokes', 'Fresh herbs', 'Spring lamb',
    ]);

    this.seasonalAvailability.set('summer', [
      'Tomatoes', 'Peppers', 'Eggplant', 'Fresh fish', 'Watermelon',
    ]);

    this.seasonalAvailability.set('autumn', [
      'Mushrooms', 'Pumpkin', 'Chestnuts', 'Game meat',
    ]);

    this.seasonalAvailability.set('winter', [
      'Root vegetables', 'Citrus fruits', 'Seafood', 'Dried fruits',
    ]);
  }

  /**
   * Initialize menu items
   */
  private initializeMenu(): void {
    const items: MenuItem[] = [
      // Appetizers
      {
        id: uuidv4(),
        name: 'Deniz Mahsulleri Mezze',
        nameEn: 'Seafood Mezze Platter',
        category: 'appetizer',
        cuisine: 'Mediterranean',
        ingredients: ['octopus', 'shrimp', 'calamari', 'olive oil'],
        allergens: ['shellfish'],
        dietary: ['gluten-free'],
        price: 120,
        preparationTime: 30,
        seasonal: true,
        popularity: 8.5,
      },
      {
        id: uuidv4(),
        name: 'Vegan Akdeniz Tabağı',
        nameEn: 'Vegan Mediterranean Plate',
        category: 'appetizer',
        cuisine: 'Mediterranean',
        ingredients: ['hummus', 'baba ghanoush', 'tabbouleh', 'olives'],
        allergens: [],
        dietary: ['vegan', 'vegetarian', 'gluten-free'],
        price: 85,
        preparationTime: 20,
        seasonal: false,
        popularity: 7.8,
      },

      // Main courses
      {
        id: uuidv4(),
        name: 'Levrek Izgara',
        nameEn: 'Grilled Sea Bass',
        category: 'main',
        cuisine: 'Mediterranean',
        ingredients: ['sea bass', 'lemon', 'olive oil', 'herbs'],
        allergens: ['fish'],
        dietary: ['gluten-free'],
        price: 280,
        preparationTime: 45,
        seasonal: true,
        popularity: 9.2,
      },
      {
        id: uuidv4(),
        name: 'Kuzu Tandır',
        nameEn: 'Slow-cooked Lamb',
        category: 'main',
        cuisine: 'Turkish',
        ingredients: ['lamb', 'vegetables', 'spices'],
        allergens: [],
        dietary: ['gluten-free', 'halal'],
        price: 320,
        preparationTime: 180,
        seasonal: false,
        popularity: 8.9,
      },
      {
        id: uuidv4(),
        name: 'Sebzeli Risotto',
        nameEn: 'Vegetable Risotto',
        category: 'main',
        cuisine: 'Italian',
        ingredients: ['arborio rice', 'seasonal vegetables', 'parmesan'],
        allergens: ['dairy'],
        dietary: ['vegetarian'],
        price: 180,
        preparationTime: 40,
        seasonal: true,
        popularity: 7.5,
      },

      // Desserts
      {
        id: uuidv4(),
        name: 'Fıstıklı Baklava',
        nameEn: 'Pistachio Baklava',
        category: 'dessert',
        cuisine: 'Turkish',
        ingredients: ['phyllo', 'pistachio', 'honey', 'butter'],
        allergens: ['nuts', 'dairy', 'gluten'],
        dietary: ['vegetarian'],
        price: 65,
        preparationTime: 15,
        seasonal: false,
        popularity: 9.5,
      },
      {
        id: uuidv4(),
        name: 'Vegan Çikolata Mousse',
        nameEn: 'Vegan Chocolate Mousse',
        category: 'dessert',
        cuisine: 'International',
        ingredients: ['dark chocolate', 'coconut cream', 'vanilla'],
        allergens: [],
        dietary: ['vegan', 'vegetarian', 'gluten-free'],
        price: 75,
        preparationTime: 20,
        seasonal: false,
        popularity: 8.2,
      },
    ];

    items.forEach(item => this.menuItems.set(item.id, item));
  }

  /**
   * Setup restaurant-specific message handlers
   */
  private setupRestaurantHandlers(): void {
    // Catering request from yachts/events
    this.communication.onMessage('request-catering', async (message) => {
      this.remember('conversation', message, ['catering-request'], 8);
      const order = await this.createCateringOrder(message.payload);
      return { success: true, order };
    });

    // Yacht provisioning request
    this.communication.onMessage('request-provisioning', async (message) => {
      const provisioning = await this.planYachtProvisioning(message.payload);
      return provisioning;
    });

    // Menu recommendations
    this.communication.onMessage('get-menu-recommendations', async (message) => {
      const recommendations = await this.getAIRecommendations(message.payload);
      return recommendations;
    });
  }
}
