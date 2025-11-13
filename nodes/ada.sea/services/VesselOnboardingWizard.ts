/**
 * Vessel Onboarding Wizard
 *
 * Guides users through the process of creating a new Ada.Sea vessel instance.
 * Validates all required fields and creates tenant configuration.
 *
 * Flow:
 * 1. Welcome & Legal Notice
 * 2. Legal Identity (MMSI, IMO, etc.)
 * 3. Certificates & Documents
 * 4. Vessel Specifications
 * 5. Ownership Information
 * 6. Crew (optional)
 * 7. Maintenance Schedule Setup
 * 8. Emergency Contacts
 * 9. Review & Confirm
 * 10. Generate Tenant Instance
 */

import { EventEmitter } from 'events';
import {
  VesselOnboardingTemplate,
  OnboardingValidation,
  VesselInstance,
} from '../templates/VesselOnboardingTemplate.js';
import { VesselLegalIdentity, MMSI, IMONumber } from '../types/AISTypes.js';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  fields: string[];
}

export class VesselOnboardingWizard extends EventEmitter {
  private currentStep: number = 0;
  private onboardingData: Partial<VesselOnboardingTemplate> = {};

  private steps: OnboardingStep[] = [
    {
      id: 'legal-identity',
      title: 'Legal Identity & Registration',
      description: 'MMSI, IMO, Call Sign, Flag State',
      completed: false,
      required: true,
      fields: [
        'mmsi',
        'imo',
        'callSign',
        'vesselName',
        'flagState',
        'portOfRegistry',
        'registrationNumber',
      ],
    },
    {
      id: 'certificates',
      title: 'Certificates & Documents',
      description: 'Insurance, Registration, Safety, Radio License',
      completed: false,
      required: true,
      fields: ['insurance', 'registration', 'safety', 'radio'],
    },
    {
      id: 'specifications',
      title: 'Vessel Specifications',
      description: 'Manufacturer, Hull, Engines, Tanks, Electronics',
      completed: false,
      required: true,
      fields: ['manufacturer', 'model', 'hullType', 'engines', 'tanks'],
    },
    {
      id: 'ownership',
      title: 'Ownership Information',
      description: 'Current owner, purchase info, home port',
      completed: false,
      required: true,
      fields: ['currentOwner', 'purchaseInfo', 'homePort'],
    },
    {
      id: 'crew',
      title: 'Crew (Optional)',
      description: 'Captain, crew members, certificates',
      completed: false,
      required: false,
      fields: ['crew'],
    },
    {
      id: 'maintenance',
      title: 'Maintenance Schedule',
      description: 'Engine maintenance, annual tasks, inspections',
      completed: false,
      required: true,
      fields: ['maintenanceSchedule'],
    },
    {
      id: 'emergency',
      title: 'Emergency Contacts',
      description: 'Owner, local contacts, service providers',
      completed: false,
      required: true,
      fields: ['emergencyContacts'],
    },
    {
      id: 'review',
      title: 'Review & Confirm',
      description: 'Review all information before creating vessel instance',
      completed: false,
      required: true,
      fields: [],
    },
  ];

  constructor() {
    super();
  }

  /**
   * Start onboarding process
   */
  start(): void {
    this.currentStep = 0;
    this.onboardingData = {};

    this.emit('onboarding:started');
    this.emit('step:changed', this.getCurrentStep());
  }

  /**
   * Get current step
   */
  getCurrentStep(): OnboardingStep {
    return this.steps[this.currentStep];
  }

  /**
   * Get all steps
   */
  getSteps(): OnboardingStep[] {
    return this.steps;
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    const completedSteps = this.steps.filter((s) => s.completed).length;
    return Math.round((completedSteps / this.steps.length) * 100);
  }

  /**
   * Update step data
   */
  updateStepData(stepId: string, data: any): void {
    const step = this.steps.find((s) => s.id === stepId);

    if (!step) {
      throw new Error(`Invalid step ID: ${stepId}`);
    }

    // Update onboarding data
    Object.assign(this.onboardingData, data);

    // Validate step
    const validation = this.validateStep(stepId);

    if (validation.errors.length === 0) {
      step.completed = true;
      this.emit('step:completed', step);
    }

    this.emit('data:updated', { stepId, data, validation });
  }

  /**
   * Validate specific step
   */
  validateStep(stepId: string): OnboardingValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingRequired: string[] = [];

    switch (stepId) {
      case 'legal-identity':
        return this.validateLegalIdentity();

      case 'certificates':
        return this.validateCertificates();

      case 'specifications':
        return this.validateSpecifications();

      case 'ownership':
        return this.validateOwnership();

      case 'maintenance':
        return this.validateMaintenance();

      case 'emergency':
        return this.validateEmergencyContacts();

      default:
        return {
          complete: true,
          missingRequired: [],
          warnings: [],
          errors: [],
        };
    }
  }

  /**
   * Validate legal identity
   */
  private validateLegalIdentity(): OnboardingValidation {
    const errors: string[] = [];
    const missingRequired: string[] = [];
    const warnings: string[] = [];

    const identity = this.onboardingData.legalIdentity;

    if (!identity) {
      return {
        complete: false,
        missingRequired: ['legalIdentity'],
        warnings: [],
        errors: ['Legal identity section is required'],
      };
    }

    // MMSI validation
    if (!identity.mmsi) {
      missingRequired.push('mmsi');
    } else if (!/^[0-9]{9}$/.test(identity.mmsi)) {
      errors.push('MMSI must be 9 digits');
    } else if (identity.mmsi === '000000000') {
      errors.push('Invalid MMSI: Dummy value not allowed');
    }

    // IMO validation
    if (!identity.imo) {
      missingRequired.push('imo');
    } else if (!/^IMO[0-9]{7}$/.test(identity.imo)) {
      errors.push('IMO must be IMO + 7 digits');
    } else if (identity.imo === 'IMO0000000') {
      errors.push('Invalid IMO: Dummy value not allowed');
    }

    // Call Sign
    if (!identity.callSign || identity.callSign.length < 3) {
      missingRequired.push('callSign');
    }

    // Vessel Name
    if (!identity.vesselName || identity.vesselName.length < 2) {
      missingRequired.push('vesselName');
    }

    // Flag State
    if (!identity.flagState || identity.flagState.length !== 3) {
      missingRequired.push('flagState');
      errors.push('Flag state must be ISO 3166-1 alpha-3 (e.g., TUR, GRC)');
    }

    // Port of Registry
    if (!identity.portOfRegistry) {
      missingRequired.push('portOfRegistry');
    }

    // Registration Number
    if (!identity.registrationNumber) {
      missingRequired.push('registrationNumber');
    }

    // Vessel Type
    if (!identity.vesselType) {
      missingRequired.push('vesselType');
    }

    // AIS Class
    if (!identity.aisClass) {
      missingRequired.push('aisClass');
    }

    // Dimensions
    if (!identity.length || identity.length < 1) {
      missingRequired.push('length');
    }

    if (!identity.beam || identity.beam < 1) {
      missingRequired.push('beam');
    }

    if (!identity.draft || identity.draft < 0.1) {
      missingRequired.push('draft');
    }

    // Built Year
    if (!identity.builtYear || identity.builtYear < 1900) {
      missingRequired.push('builtYear');
    }

    // Registration Date
    if (!identity.registrationDate) {
      missingRequired.push('registrationDate');
    }

    // AIS Transponder Installed Date
    if (!identity.aisTransponderInstalled) {
      missingRequired.push('aisTransponderInstalled');
    }

    // SOLAS Compliance
    if (identity.solasCompliant === undefined) {
      missingRequired.push('solasCompliant');
    }

    // Warnings
    if (identity.grossTonnage && identity.grossTonnage >= 300) {
      if (!identity.solasCompliant) {
        warnings.push('SOLAS compliance recommended for vessels 300+ GT');
      }

      if (identity.aisClass !== 'A') {
        warnings.push('AIS Class A recommended for vessels 300+ GT');
      }
    }

    return {
      complete: missingRequired.length === 0 && errors.length === 0,
      missingRequired,
      warnings,
      errors,
    };
  }

  /**
   * Validate certificates
   */
  private validateCertificates(): OnboardingValidation {
    const errors: string[] = [];
    const missingRequired: string[] = [];
    const warnings: string[] = [];

    const certs = this.onboardingData.certificates;

    if (!certs) {
      return {
        complete: false,
        missingRequired: ['certificates'],
        warnings: [],
        errors: ['Certificates section is required'],
      };
    }

    // Insurance (REQUIRED)
    if (!certs.insurance) {
      missingRequired.push('insurance');
    } else {
      if (!certs.insurance.company) missingRequired.push('insurance.company');
      if (!certs.insurance.policyNumber) missingRequired.push('insurance.policyNumber');
      if (!certs.insurance.expiryDate) missingRequired.push('insurance.expiryDate');

      // Check expiry
      if (certs.insurance.expiryDate && certs.insurance.expiryDate < new Date()) {
        errors.push('Insurance has expired');
      } else if (
        certs.insurance.expiryDate &&
        certs.insurance.expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ) {
        warnings.push('Insurance expires within 30 days');
      }
    }

    // Registration
    if (!certs.registration) {
      missingRequired.push('registration');
    } else {
      if (!certs.registration.ruhsatNo) missingRequired.push('registration.ruhsatNo');
    }

    // Safety
    if (!certs.safety) {
      missingRequired.push('safety');
    } else {
      if (certs.safety.lifeRaftExpiry && certs.safety.lifeRaftExpiry < new Date()) {
        errors.push('Life raft certificate has expired');
      }
    }

    // Radio License
    if (!certs.radio) {
      missingRequired.push('radio');
    } else {
      if (certs.radio.expiryDate && certs.radio.expiryDate < new Date()) {
        errors.push('Radio license has expired');
      }
    }

    return {
      complete: missingRequired.length === 0 && errors.length === 0,
      missingRequired,
      warnings,
      errors,
    };
  }

  /**
   * Validate specifications
   */
  private validateSpecifications(): OnboardingValidation {
    const errors: string[] = [];
    const missingRequired: string[] = [];
    const warnings: string[] = [];

    const specs = this.onboardingData.specifications;

    if (!specs) {
      return {
        complete: false,
        missingRequired: ['specifications'],
        warnings: [],
        errors: ['Specifications section is required'],
      };
    }

    // Manufacturer
    if (!specs.manufacturer) missingRequired.push('manufacturer');
    if (!specs.model) missingRequired.push('model');
    if (!specs.hullType) missingRequired.push('hullType');

    // Engines
    if (specs.propulsion === 'Motor' || specs.propulsion === 'Sail + Motor') {
      if (!specs.engines || specs.engines.length === 0) {
        missingRequired.push('engines');
      }
    }

    // Tanks
    if (!specs.tanks) {
      missingRequired.push('tanks');
    } else {
      if (!specs.tanks.freshWater || !specs.tanks.freshWater.capacity) {
        missingRequired.push('tanks.freshWater');
      }

      if (!specs.tanks.fuel || !specs.tanks.fuel.capacity) {
        missingRequired.push('tanks.fuel');
      }

      if (!specs.tanks.blackWater || !specs.tanks.blackWater.capacity) {
        warnings.push('Black water (holding tank) capacity not specified');
      }
    }

    return {
      complete: missingRequired.length === 0 && errors.length === 0,
      missingRequired,
      warnings,
      errors,
    };
  }

  /**
   * Validate ownership
   */
  private validateOwnership(): OnboardingValidation {
    const errors: string[] = [];
    const missingRequired: string[] = [];
    const warnings: string[] = [];

    const ownership = this.onboardingData.ownership;
    const homePort = this.onboardingData.homePort;

    if (!ownership) {
      missingRequired.push('ownership');
    } else {
      if (!ownership.currentOwner) {
        missingRequired.push('currentOwner');
      } else {
        if (!ownership.currentOwner.name) missingRequired.push('currentOwner.name');
        if (!ownership.currentOwner.email) missingRequired.push('currentOwner.email');
        if (!ownership.currentOwner.phone) missingRequired.push('currentOwner.phone');
      }

      if (!ownership.purchaseInfo) {
        missingRequired.push('purchaseInfo');
      }
    }

    if (!homePort) {
      missingRequired.push('homePort');
    } else {
      if (!homePort.marina) missingRequired.push('homePort.marina');
      if (!homePort.country) missingRequired.push('homePort.country');
    }

    return {
      complete: missingRequired.length === 0 && errors.length === 0,
      missingRequired,
      warnings,
      errors,
    };
  }

  /**
   * Validate maintenance schedule
   */
  private validateMaintenance(): OnboardingValidation {
    const errors: string[] = [];
    const missingRequired: string[] = [];
    const warnings: string[] = [];

    const maintenance = this.onboardingData.maintenanceSchedule;

    if (!maintenance) {
      warnings.push('Maintenance schedule not configured - using defaults');
    }

    return {
      complete: true, // Not strictly required, can use defaults
      missingRequired,
      warnings,
      errors,
    };
  }

  /**
   * Validate emergency contacts
   */
  private validateEmergencyContacts(): OnboardingValidation {
    const errors: string[] = [];
    const missingRequired: string[] = [];
    const warnings: string[] = [];

    const emergency = this.onboardingData.emergencyContacts;

    if (!emergency) {
      missingRequired.push('emergencyContacts');
    } else {
      if (!emergency.owner) {
        missingRequired.push('emergencyContacts.owner');
      } else {
        if (!emergency.owner.phone) missingRequired.push('emergencyContacts.owner.phone');
      }
    }

    return {
      complete: missingRequired.length === 0 && errors.length === 0,
      missingRequired,
      warnings,
      errors,
    };
  }

  /**
   * Validate entire onboarding data
   */
  validateAll(): OnboardingValidation {
    const allErrors: string[] = [];
    const allMissing: string[] = [];
    const allWarnings: string[] = [];

    // Validate each required step
    this.steps
      .filter((s) => s.required)
      .forEach((step) => {
        const validation = this.validateStep(step.id);
        allErrors.push(...validation.errors);
        allMissing.push(...validation.missingRequired);
        allWarnings.push(...validation.warnings);
      });

    return {
      complete: allErrors.length === 0 && allMissing.length === 0,
      missingRequired: allMissing,
      warnings: allWarnings,
      errors: allErrors,
    };
  }

  /**
   * Move to next step
   */
  nextStep(): boolean {
    // Validate current step
    const currentStep = this.getCurrentStep();
    const validation = this.validateStep(currentStep.id);

    if (!validation.complete && currentStep.required) {
      this.emit('step:validation-failed', { step: currentStep, validation });
      return false;
    }

    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.emit('step:changed', this.getCurrentStep());
      return true;
    }

    return false;
  }

  /**
   * Move to previous step
   */
  previousStep(): boolean {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.emit('step:changed', this.getCurrentStep());
      return true;
    }

    return false;
  }

  /**
   * Jump to specific step
   */
  goToStep(stepId: string): boolean {
    const index = this.steps.findIndex((s) => s.id === stepId);

    if (index >= 0) {
      this.currentStep = index;
      this.emit('step:changed', this.getCurrentStep());
      return true;
    }

    return false;
  }

  /**
   * Get current onboarding data
   */
  getData(): Partial<VesselOnboardingTemplate> {
    return this.onboardingData;
  }

  /**
   * Create vessel instance
   * Final step after all validation passes
   */
  async createVesselInstance(): Promise<VesselInstance> {
    // Final validation
    const validation = this.validateAll();

    if (!validation.complete) {
      throw new Error(
        `Cannot create vessel instance: ${validation.errors.join(', ')} | Missing: ${validation.missingRequired.join(', ')}`
      );
    }

    // Generate tenant ID
    const mmsi = this.onboardingData.legalIdentity!.mmsi!;
    const vesselName = this.onboardingData.legalIdentity!.vesselName!
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');

    const tenantId = `${vesselName}-${mmsi}`;

    // Create vessel instance
    const instance: VesselInstance = {
      tenantId,
      displayName: this.onboardingData.legalIdentity!.vesselName!,
      mmsi,
      onboardingData: this.onboardingData as VesselOnboardingTemplate,
      createdAt: new Date(),
      createdBy: this.onboardingData.ownership!.currentOwner!.email,
      lastUpdated: new Date(),
      status: 'Active',
      nodeId: `ada.sea.${tenantId}`,
    };

    this.emit('instance:created', instance);

    return instance;
  }

  /**
   * Export onboarding data as JSON
   */
  exportData(): string {
    return JSON.stringify(this.onboardingData, null, 2);
  }

  /**
   * Import onboarding data from JSON
   */
  importData(json: string): void {
    try {
      const data = JSON.parse(json);
      this.onboardingData = data;

      // Validate all steps
      this.steps.forEach((step) => {
        const validation = this.validateStep(step.id);
        step.completed = validation.complete;
      });

      this.emit('data:imported', this.onboardingData);
    } catch (error) {
      throw new Error(`Invalid JSON data: ${error}`);
    }
  }
}
