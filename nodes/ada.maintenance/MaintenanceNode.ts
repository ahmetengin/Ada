/**
 * MaintenanceNode - AI-powered maintenance and repair management node
 * Manages yacht and marina maintenance, scheduling, and technician dispatch
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';

export interface MaintenanceNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  serviceInfo: {
    name: string;
    coverage: string[];
    specializations: string[];
  };
}

interface MaintenanceRequest {
  id: string;
  requesterId: string;
  requesterType: 'yacht' | 'marina' | 'other';
  type: 'scheduled' | 'emergency' | 'inspection';
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  requestDate: Date;
  scheduledDate?: Date;
  completionDate?: Date;
  assignedTechnician?: string;
  estimatedCost?: number;
  actualCost?: number;
}

interface MaintenanceSchedule {
  id: string;
  entityId: string;
  entityType: 'yacht' | 'marina' | 'equipment';
  maintenanceType: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  lastPerformed?: Date;
  nextDue: Date;
  description: string;
}

interface Technician {
  id: string;
  name: string;
  specializations: string[];
  available: boolean;
  currentJob?: string;
}

interface SparePart {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  minStock: number;
  supplier: string;
  price: number;
}

export class MaintenanceNode extends BaseNode {
  private serviceInfo: MaintenanceNodeConfig['serviceInfo'];
  private requests: Map<string, MaintenanceRequest> = new Map();
  private schedules: Map<string, MaintenanceSchedule> = new Map();
  private technicians: Map<string, Technician> = new Map();
  private spareParts: Map<string, SparePart> = new Map();

  constructor(config: MaintenanceNodeConfig) {
    super({
      ...config,
      type: 'ada.maintenance',
      capabilities: {
        skills: [
          'maintenance-scheduling',
          'emergency-repair',
          'technician-dispatch',
          'spare-parts-management',
          'preventive-maintenance',
          'inspection-services',
          'equipment-diagnostics',
          'maintenance-tracking',
        ],
        services: [
          'repair-services',
          'scheduled-maintenance',
          'emergency-response',
          'parts-supply',
          'maintenance-reporting',
          'equipment-monitoring',
        ],
        integrations: [
          'ada.sea',
          'ada.marina',
          'ada.finance',
          'parts-suppliers',
          'diagnostic-systems',
        ],
      },
    });

    this.serviceInfo = config.serviceInfo;
    this.initializeTechnicians();
    this.initializeSpareParts();
  }

  /**
   * Initialize the Maintenance node
   */
  async initialize(): Promise<void> {
    this.logEvent('Maintenance node initializing', { service: this.serviceInfo });
    this.setupMaintenanceHandlers();
    this.logEvent('Maintenance node initialized', { id: this.identity.id });
  }

  /**
   * Process maintenance-related tasks
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'create-request':
        return this.createMaintenanceRequest(data);
      case 'schedule-maintenance':
        return this.schedulePreventiveMaintenance(data);
      case 'assign-technician':
        return this.assignTechnician(data);
      case 'complete-maintenance':
        return this.completeMaintenanceRequest(data);
      case 'check-spare-parts':
        return this.checkSparePartAvailability(data);
      case 'get-maintenance-history':
        return this.getMaintenanceHistory(data);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    const pendingRequests = Array.from(this.requests.values())
      .filter(r => r.status === 'pending' || r.status === 'assigned').length;

    const criticalRequests = Array.from(this.requests.values())
      .filter(r => r.priority === 'critical' && r.status !== 'completed').length;

    const availableTechnicians = Array.from(this.technicians.values())
      .filter(t => t.available).length;

    const lowStockParts = Array.from(this.spareParts.values())
      .filter(p => p.quantity < p.minStock).length;

    return {
      service: this.serviceInfo,
      totalRequests: this.requests.size,
      pendingRequests,
      criticalRequests,
      availableTechnicians,
      totalTechnicians: this.technicians.size,
      lowStockParts,
      totalParts: this.spareParts.size,
    };
  }

  /**
   * Create maintenance request
   */
  createMaintenanceRequest(data: {
    requesterId: string;
    requesterType: 'yacht' | 'marina' | 'other';
    type: 'scheduled' | 'emergency' | 'inspection';
    category: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): MaintenanceRequest {
    const request: MaintenanceRequest = {
      id: uuidv4(),
      requesterId: data.requesterId,
      requesterType: data.requesterType,
      type: data.type,
      category: data.category,
      description: data.description,
      priority: data.priority || (data.type === 'emergency' ? 'critical' : 'medium'),
      status: 'pending',
      requestDate: new Date(),
    };

    this.requests.set(request.id, request);

    // Auto-assign if emergency
    if (request.type === 'emergency') {
      this.assignTechnician({ requestId: request.id });
    }

    this.remember('data', { request }, ['maintenance', 'request'], 8);

    return request;
  }

  /**
   * Schedule preventive maintenance
   */
  schedulePreventiveMaintenance(data: {
    entityId: string;
    entityType: 'yacht' | 'marina' | 'equipment';
    maintenanceType: string;
    frequency: MaintenanceSchedule['frequency'];
    description: string;
  }): MaintenanceSchedule {
    const nextDue = this.calculateNextDueDate(data.frequency);

    const schedule: MaintenanceSchedule = {
      id: uuidv4(),
      entityId: data.entityId,
      entityType: data.entityType,
      maintenanceType: data.maintenanceType,
      frequency: data.frequency,
      nextDue,
      description: data.description,
    };

    this.schedules.set(schedule.id, schedule);

    this.remember('data', { schedule }, ['maintenance', 'scheduling'], 7);

    return schedule;
  }

  /**
   * Assign technician to maintenance request
   */
  assignTechnician(data: { requestId: string; technicianId?: string }): any {
    const request = this.requests.get(data.requestId);

    if (!request) {
      return { success: false, message: 'Request not found' };
    }

    let technician: Technician | undefined;

    if (data.technicianId) {
      technician = this.technicians.get(data.technicianId);
      if (!technician || !technician.available) {
        return { success: false, message: 'Technician not available' };
      }
    } else {
      // Auto-assign available technician
      technician = Array.from(this.technicians.values())
        .find(t => t.available && t.specializations.includes(request.category));

      if (!technician) {
        return { success: false, message: 'No available technician' };
      }
    }

    request.assignedTechnician = technician.id;
    request.status = 'assigned';
    technician.available = false;
    technician.currentJob = request.id;

    this.remember('event', { request, technician }, ['assignment'], 7);

    return { success: true, request, technician };
  }

  /**
   * Complete maintenance request
   */
  completeMaintenanceRequest(data: {
    requestId: string;
    actualCost: number;
    notes?: string;
  }): any {
    const request = this.requests.get(data.requestId);

    if (!request) {
      return { success: false, message: 'Request not found' };
    }

    request.status = 'completed';
    request.completionDate = new Date();
    request.actualCost = data.actualCost;

    // Free up technician
    if (request.assignedTechnician) {
      const technician = this.technicians.get(request.assignedTechnician);
      if (technician) {
        technician.available = true;
        technician.currentJob = undefined;
      }
    }

    this.remember('data', { request, completion: data }, ['maintenance', 'completed'], 9);

    return { success: true, request };
  }

  /**
   * Check spare part availability
   */
  checkSparePartAvailability(data: { partNumber: string }): any {
    const part = Array.from(this.spareParts.values())
      .find(p => p.partNumber === data.partNumber);

    if (!part) {
      return { available: false, message: 'Part not found' };
    }

    return {
      available: part.quantity > 0,
      part: {
        name: part.name,
        partNumber: part.partNumber,
        quantityAvailable: part.quantity,
        price: part.price,
        needsReorder: part.quantity < part.minStock,
      },
    };
  }

  /**
   * Get maintenance history
   */
  getMaintenanceHistory(data: { entityId: string }): MaintenanceRequest[] {
    return Array.from(this.requests.values())
      .filter(r => r.requesterId === data.entityId)
      .sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
  }

  /**
   * Calculate next due date based on frequency
   */
  private calculateNextDueDate(frequency: MaintenanceSchedule['frequency']): Date {
    const now = new Date();
    const nextDue = new Date(now);

    switch (frequency) {
      case 'daily':
        nextDue.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextDue.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        nextDue.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        nextDue.setMonth(now.getMonth() + 3);
        break;
      case 'annual':
        nextDue.setFullYear(now.getFullYear() + 1);
        break;
    }

    return nextDue;
  }

  /**
   * Initialize sample technicians
   */
  private initializeTechnicians(): void {
    const techs: Technician[] = [
      {
        id: uuidv4(),
        name: 'Mehmet Yılmaz',
        specializations: ['engine', 'electrical', 'mechanical'],
        available: true,
      },
      {
        id: uuidv4(),
        name: 'Ayşe Demir',
        specializations: ['hull', 'painting', 'carpentry'],
        available: true,
      },
      {
        id: uuidv4(),
        name: 'Can Özkan',
        specializations: ['electronics', 'navigation', 'communication'],
        available: true,
      },
    ];

    techs.forEach(tech => this.technicians.set(tech.id, tech));
  }

  /**
   * Initialize sample spare parts
   */
  private initializeSpareParts(): void {
    const parts: SparePart[] = [
      {
        id: uuidv4(),
        name: 'Oil Filter',
        partNumber: 'OF-2024',
        quantity: 15,
        minStock: 5,
        supplier: 'Marine Parts Co.',
        price: 35,
      },
      {
        id: uuidv4(),
        name: 'Impeller Kit',
        partNumber: 'IMP-500',
        quantity: 8,
        minStock: 3,
        supplier: 'Marine Parts Co.',
        price: 120,
      },
      {
        id: uuidv4(),
        name: 'Anchor Chain Link',
        partNumber: 'ACL-10MM',
        quantity: 50,
        minStock: 20,
        supplier: 'Anchor Supplies Ltd.',
        price: 12,
      },
    ];

    parts.forEach(part => this.spareParts.set(part.id, part));
  }

  /**
   * Setup maintenance-specific message handlers
   */
  private setupMaintenanceHandlers(): void {
    // Maintenance request from yacht/marina
    this.communication.onMessage('request-maintenance', async (message) => {
      this.remember('conversation', message, ['maintenance-request'], 8);
      const request = this.createMaintenanceRequest(message.payload);
      return { success: true, request };
    });

    // Emergency repair request
    this.communication.onMessage('emergency-repair', async (message) => {
      this.remember('conversation', message, ['emergency'], 9);
      const request = this.createMaintenanceRequest({
        ...message.payload,
        type: 'emergency',
        priority: 'critical',
      });
      return { success: true, request, eta: '30 minutes' };
    });

    // Spare parts inquiry
    this.communication.onMessage('parts-inquiry', async (message) => {
      const result = this.checkSparePartAvailability(message.payload);
      return result;
    });

    // Service status
    this.communication.onMessage('service-inquiry', async (message) => {
      return {
        service: this.serviceInfo,
        status: this.getStatus(),
      };
    });
  }
}
