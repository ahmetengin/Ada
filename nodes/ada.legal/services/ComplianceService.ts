/**
 * ComplianceService - KVKK/GDPR and international compliance
 *
 * Handles:
 * - KVKK (Kişisel Verilerin Korunması Kanunu - Turkey)
 * - GDPR (General Data Protection Regulation - EU)
 * - Data processing agreements
 * - Privacy policies
 * - Cross-border data transfers
 *
 * Collaborates with ada.hukuk for Turkish legal matters
 */

export interface PersonalDataCategory {
  category: 'identity' | 'contact' | 'financial' | 'health' | 'biometric' | 'location' | 'other';
  dataFields: string[];
  sensitivity: 'normal' | 'sensitive' | 'special-category';
  retentionPeriod: string;
  legalBasis: string;
}

export interface DataProcessingActivity {
  id: string;
  controller: string; // Company name
  processor?: string; // Third-party processor
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal-obligation' | 'vital-interests' | 'public-task' | 'legitimate-interests';

  dataCategories: PersonalDataCategory[];

  dataSubjects: Array<{
    type: 'customer' | 'employee' | 'crew' | 'passenger' | 'vendor';
    count: number;
  }>;

  recipients?: string[]; // Who receives the data
  crossBorderTransfer: boolean;
  transferCountries?: string[];
  safeguards?: string; // Adequacy decision, SCCs, BCRs, etc.

  technicalMeasures: string[];
  organizationalMeasures: string[];

  retentionPeriod: string;
  deletionProcedure: string;

  dpia: {
    required: boolean;
    completed: boolean;
    date?: Date;
    outcome?: 'low-risk' | 'medium-risk' | 'high-risk';
  };

  complianceStatus: {
    kvkk: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';
    gdpr: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';
  };
}

export interface DataSubjectRight {
  right: 'access' | 'rectification' | 'erasure' | 'restriction' | 'portability' | 'objection' | 'automated-decision';
  requestDate: Date;
  requestor: string;
  requestorType: 'individual' | 'legal-representative' | 'heir';

  dataSubject: {
    name: string;
    id: string;
    contactEmail: string;
  };

  description: string;
  responseDeadline: Date; // 30 days for GDPR, 30 days for KVKK

  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  response?: {
    date: Date;
    outcome: string;
    data?: any;
    reason?: string; // If rejected
  };

  escalated: boolean;
  escalationReason?: string;
}

export interface PrivacyPolicy {
  version: string;
  effectiveDate: Date;
  language: 'tr' | 'en' | 'de' | 'fr';

  sections: {
    dataController: string;
    purposesOfProcessing: string[];
    legalBasis: string[];
    dataCategories: string[];
    recipients: string[];
    retentionPeriod: string;
    dataSubjectRights: string[];
    contactInfo: string;
    cookiePolicy?: string;
  };

  kvkkCompliant: boolean;
  gdprCompliant: boolean;
  lastReview: Date;
  nextReviewDue: Date;
}

export interface DataBreachIncident {
  id: string;
  incidentDate: Date;
  discoveryDate: Date;
  reportingDate?: Date;

  type: 'unauthorized-access' | 'data-loss' | 'ransomware' | 'phishing' | 'insider-threat' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';

  affectedData: {
    category: PersonalDataCategory['category'];
    records: number;
    sensitivity: PersonalDataCategory['sensitivity'];
  }[];

  affectedIndividuals: number;
  affectedCountries: string[];

  technicalDetails: string;
  rootCause: string;

  containmentActions: string[];
  containmentDate?: Date;

  notifications: {
    authority: 'KVKK' | 'DPA' | 'multiple';
    notified: boolean;
    notificationDate?: Date;
    reference?: string;
  };

  dataSubjectsNotified: boolean;
  notificationMethod?: string;

  remedialActions: string[];
  preventiveMeasures: string[];

  estimatedImpact: {
    financial: number;
    reputational: 'low' | 'medium' | 'high';
    legal: 'low' | 'medium' | 'high';
  };
}

export interface ConsentRecord {
  consentId: string;
  dataSubjectId: string;

  purpose: string;
  dataCategories: string[];

  consentGiven: boolean;
  consentDate?: Date;
  consentMethod: 'explicit' | 'opt-in' | 'checkbox' | 'electronic-signature';

  consentText: string;
  language: string;

  withdrawn: boolean;
  withdrawalDate?: Date;

  proofOfConsent: string; // URL to consent record, signature, etc.

  expiryDate?: Date;
  renewalRequired: boolean;
}

/**
 * Compliance Service
 */
export class ComplianceService {
  /**
   * Check KVKK compliance for data processing activity
   */
  async checkKVKKCompliance(activity: DataProcessingActivity): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
    requiresHukukConsultation: boolean;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let requiresHukukConsultation = false;

    // 1. Check legal basis (KVKK Article 5)
    if (!activity.legalBasis) {
      issues.push('Legal basis for processing not defined (KVKK Article 5)');
      requiresHukukConsultation = true;
    }

    // 2. Check consent for sensitive data
    const hasSensitiveData = activity.dataCategories.some(
      cat => cat.sensitivity === 'sensitive' || cat.sensitivity === 'special-category'
    );

    if (hasSensitiveData && activity.legalBasis !== 'consent') {
      issues.push('Explicit consent required for sensitive/special category data (KVKK Article 6)');
      recommendations.push('Implement explicit consent mechanism for sensitive data');
    }

    // 3. Check data minimization
    if (activity.dataCategories.length > 10) {
      recommendations.push('Consider data minimization - only collect necessary data');
    }

    // 4. Check KVKK registration (if required)
    if (activity.dataSubjects.reduce((sum, ds) => sum + ds.count, 0) > 1000) {
      recommendations.push('Company may need to register with KVKK Data Controllers Registry (VERBIS)');
      requiresHukukConsultation = true;
    }

    // 5. Check retention period
    if (!activity.retentionPeriod || activity.retentionPeriod === 'indefinite') {
      issues.push('Retention period must be defined and limited (KVKK Article 4)');
      recommendations.push('Define specific retention period based on legal requirements');
      requiresHukukConsultation = true;
    }

    // 6. Check cross-border transfer
    if (activity.crossBorderTransfer) {
      if (!activity.safeguards) {
        issues.push('Cross-border data transfer requires adequate safeguards (KVKK Article 9)');
        recommendations.push('Implement Standard Contractual Clauses or ensure adequacy decision');
        requiresHukukConsultation = true; // Turkish law interpretation needed
      }
    }

    // 7. Check DPIA
    if (activity.dpia.required && !activity.dpia.completed) {
      issues.push('Data Protection Impact Assessment (DPIA) required but not completed');
      recommendations.push('Complete DPIA before processing high-risk data');
    }

    // 8. Check technical/organizational measures
    if (activity.technicalMeasures.length === 0) {
      issues.push('Technical security measures not documented (KVKK Article 12)');
      recommendations.push('Implement encryption, access controls, logging');
    }

    const compliant = issues.length === 0;

    return {
      compliant,
      issues,
      recommendations,
      requiresHukukConsultation,
    };
  }

  /**
   * Check GDPR compliance
   */
  async checkGDPRCompliance(activity: DataProcessingActivity): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 1. Legal basis (GDPR Article 6)
    if (!activity.legalBasis) {
      issues.push('Legal basis for processing not defined (GDPR Article 6)');
    }

    // 2. Special category data requires explicit consent (GDPR Article 9)
    const hasSpecialCategory = activity.dataCategories.some(
      cat => cat.sensitivity === 'special-category'
    );

    if (hasSpecialCategory && activity.legalBasis !== 'consent') {
      issues.push('Explicit consent required for special category data (GDPR Article 9)');
    }

    // 3. Data Protection Officer (GDPR Article 37)
    if (activity.dataSubjects.reduce((sum, ds) => sum + ds.count, 0) > 5000) {
      recommendations.push('Consider appointing Data Protection Officer (DPO) - Article 37');
    }

    // 4. DPIA for high-risk processing (GDPR Article 35)
    const isHighRisk =
      hasSensitiveData ||
      activity.dataSubjects.reduce((sum, ds) => sum + ds.count, 0) > 10000 ||
      activity.crossBorderTransfer;

    if (isHighRisk && !activity.dpia.completed) {
      issues.push('Data Protection Impact Assessment (DPIA) required for high-risk processing');
    }

    // 5. Cross-border transfer (GDPR Chapter V)
    if (activity.crossBorderTransfer) {
      const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'GR', 'SE'];
      const hasNonEUTransfer = activity.transferCountries?.some(c => !euCountries.includes(c));

      if (hasNonEUTransfer && !activity.safeguards) {
        issues.push('International data transfer requires adequate safeguards (GDPR Articles 44-50)');
        recommendations.push('Use Standard Contractual Clauses (SCCs) approved by EU Commission');
      }
    }

    // 6. Records of processing activities (GDPR Article 30)
    recommendations.push('Maintain records of processing activities (Article 30 compliance)');

    // 7. Data breach notification capability (GDPR Article 33)
    recommendations.push('Ensure capability to notify supervisory authority within 72 hours of breach');

    const compliant = issues.length === 0;

    return {
      compliant,
      issues,
      recommendations,
    };
  }

  /**
   * Process data subject rights request
   */
  async processDataSubjectRequest(request: DataSubjectRight): Promise<{
    action: string;
    deadline: Date;
    steps: string[];
    escalateToHukuk: boolean;
  }> {
    const steps: string[] = [];
    let escalateToHukuk = false;

    // Calculate response deadline
    const deadline = new Date(request.requestDate);
    deadline.setDate(deadline.getDate() + 30); // 30 days for both KVKK and GDPR

    // Process based on request type
    switch (request.right) {
      case 'access':
        steps.push('1. Verify identity of data subject');
        steps.push('2. Search all systems for personal data');
        steps.push('3. Compile data into readable format');
        steps.push('4. Provide copy to data subject (free of charge for first request)');
        break;

      case 'erasure':
        steps.push('1. Verify identity and legal basis for erasure');
        steps.push('2. Check if legal obligation to retain data exists');
        steps.push('3. If retention required, notify data subject of reason');
        steps.push('4. If no retention required, delete data from all systems');
        steps.push('5. Notify third parties who received the data');
        escalateToHukuk = true; // Legal assessment needed for retention obligations
        break;

      case 'rectification':
        steps.push('1. Verify identity and validity of rectification request');
        steps.push('2. Update data in all systems');
        steps.push('3. Notify third parties who received incorrect data');
        steps.push('4. Confirm rectification to data subject');
        break;

      case 'restriction':
        steps.push('1. Verify legal basis for restriction');
        steps.push('2. Mark data as restricted in all systems');
        steps.push('3. Ensure data is not processed except for storage');
        steps.push('4. Notify data subject when restriction is lifted');
        break;

      case 'portability':
        steps.push('1. Verify data is processed by automated means based on consent/contract');
        steps.push('2. Extract data in structured, machine-readable format (JSON/CSV)');
        steps.push('3. Provide to data subject or transmit directly to new controller');
        break;

      case 'objection':
        steps.push('1. Assess legal basis for processing');
        steps.push('2. If based on legitimate interests, balance rights');
        steps.push('3. Stop processing unless compelling legitimate grounds exist');
        steps.push('4. Notify data subject of decision');
        escalateToHukuk = true; // Legal balancing required
        break;

      case 'automated-decision':
        steps.push('1. Identify automated decision-making processes');
        steps.push('2. Explain logic and significance of automated processing');
        steps.push('3. Provide human review if requested');
        escalateToHukuk = true;
        break;
    }

    return {
      action: `Process ${request.right} request`,
      deadline,
      steps,
      escalateToHukuk,
    };
  }

  /**
   * Handle data breach - determine notification requirements
   */
  async handleDataBreach(incident: DataBreachIncident): Promise<{
    notifyAuthority: boolean;
    authority: 'KVKK' | 'DPA' | 'multiple';
    deadline: Date;
    notifyDataSubjects: boolean;
    estimatedFine: number;
    urgentActions: string[];
    consultHukuk: boolean;
  }> {
    const urgentActions: string[] = [];
    let consultHukuk = false;

    // Determine if notification required (72 hours)
    const notifyAuthority =
      incident.severity === 'high' || incident.severity === 'critical' ||
      incident.affectedIndividuals > 100 ||
      incident.affectedData.some(d => d.sensitivity === 'sensitive' || d.sensitivity === 'special-category');

    // Notification deadline (72 hours from discovery for GDPR/KVKK)
    const deadline = new Date(incident.discoveryDate);
    deadline.setHours(deadline.getHours() + 72);

    // Determine authority
    const hasTurkishData = incident.affectedCountries.includes('TR');
    const hasEUData = incident.affectedCountries.some(c =>
      ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'GR', 'SE'].includes(c)
    );

    const authority: 'KVKK' | 'DPA' | 'multiple' =
      hasTurkishData && hasEUData ? 'multiple' :
      hasTurkishData ? 'KVKK' : 'DPA';

    // Determine if data subjects must be notified
    const notifyDataSubjects =
      incident.severity === 'critical' ||
      incident.affectedData.some(d => d.sensitivity === 'special-category');

    // Estimate potential fine
    let estimatedFine = 0;
    if (notifyAuthority) {
      if (authority === 'KVKK' || authority === 'multiple') {
        // KVKK: Up to 2% of annual turnover (estimated based on affected records)
        estimatedFine += Math.min(incident.affectedIndividuals * 100, 1000000);
        consultHukuk = true;
      }
      if (authority === 'DPA' || authority === 'multiple') {
        // GDPR: Up to €20 million or 4% of turnover
        estimatedFine += Math.min(incident.affectedIndividuals * 50, 500000);
      }
    }

    // Urgent actions
    urgentActions.push('1. IMMEDIATE: Contain the breach - isolate affected systems');
    urgentActions.push('2. Document: Create detailed timeline and impact assessment');
    urgentActions.push('3. Investigate: Determine root cause and extent of breach');

    if (notifyAuthority) {
      urgentActions.push(`4. URGENT: Notify ${authority} within 72 hours (deadline: ${deadline.toISOString()})`);
      if (hasTurkishData) {
        urgentActions.push('5. Contact ada.hukuk for KVKK notification assistance');
        consultHukuk = true;
      }
    }

    if (notifyDataSubjects) {
      urgentActions.push('6. Notify affected individuals without undue delay');
    }

    urgentActions.push('7. Implement remedial measures to prevent recurrence');

    return {
      notifyAuthority,
      authority,
      deadline,
      notifyDataSubjects,
      estimatedFine,
      urgentActions,
      consultHukuk,
    };
  }

  /**
   * Generate privacy policy template
   */
  generatePrivacyPolicy(language: 'tr' | 'en', companyInfo: {
    name: string;
    address: string;
    email: string;
    phone: string;
  }): PrivacyPolicy {
    const sections = language === 'tr' ? {
      dataController: `Veri Sorumlusu: ${companyInfo.name}, ${companyInfo.address}`,
      purposesOfProcessing: [
        'Hizmet sunumu ve sözleşme yükümlülüklerinin yerine getirilmesi',
        'Müşteri ilişkileri yönetimi',
        'Yasal yükümlülüklerin yerine getirilmesi',
        'Güvenlik ve dolandırıcılık önleme',
      ],
      legalBasis: [
        'Sözleşmenin kurulması ve ifası (KVKK m.5/2-c)',
        'Hukuki yükümlülüğün yerine getirilmesi (KVKK m.5/2-ç)',
        'Meşru menfaatler (KVKK m.5/2-f)',
      ],
      dataCategories: [
        'Kimlik bilgileri (ad, soyad, TC kimlik no)',
        'İletişim bilgileri (e-posta, telefon, adres)',
        'Finansal bilgiler (banka hesap bilgileri, ödeme işlemleri)',
        'Konum bilgileri (gemi pozisyonu, liman bilgileri)',
      ],
      recipients: [
        'İş ortakları ve tedarikçiler',
        'Yasal merciler (gerektiğinde)',
        'Düzenleyici otoriteler',
      ],
      retentionPeriod: 'Veriler, yasal saklama yükümlülükleri ve iş amaçları için gerekli süre boyunca saklanır',
      dataSubjectRights: [
        'Kişisel verilerinize erişim hakkı',
        'Düzeltme ve silme hakkı',
        'İşleme itiraz hakkı',
        'Veri taşınabilirliği hakkı',
      ],
      contactInfo: `KVKK başvuruları için: ${companyInfo.email}`,
    } : {
      dataController: `Data Controller: ${companyInfo.name}, ${companyInfo.address}`,
      purposesOfProcessing: [
        'Service provision and contract fulfillment',
        'Customer relationship management',
        'Legal compliance',
        'Security and fraud prevention',
      ],
      legalBasis: [
        'Contract performance (GDPR Art. 6(1)(b))',
        'Legal obligation (GDPR Art. 6(1)(c))',
        'Legitimate interests (GDPR Art. 6(1)(f))',
      ],
      dataCategories: [
        'Identity data (name, surname, ID number)',
        'Contact data (email, phone, address)',
        'Financial data (bank details, payment transactions)',
        'Location data (vessel position, port information)',
      ],
      recipients: [
        'Business partners and suppliers',
        'Legal authorities (when required)',
        'Regulatory bodies',
      ],
      retentionPeriod: 'Data is retained for the period required by legal obligations and business purposes',
      dataSubjectRights: [
        'Right of access to your personal data',
        'Right to rectification and erasure',
        'Right to object to processing',
        'Right to data portability',
      ],
      contactInfo: `For GDPR requests: ${companyInfo.email}`,
    };

    return {
      version: '1.0',
      effectiveDate: new Date(),
      language,
      sections,
      kvkkCompliant: language === 'tr',
      gdprCompliant: true,
      lastReview: new Date(),
      nextReviewDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Validate consent mechanism
   */
  validateConsent(consent: ConsentRecord): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // 1. Check consent is explicit (not implied)
    if (consent.consentMethod === 'opt-in') {
      issues.push('Consent should be explicit (opt-in checkbox) not pre-ticked');
    }

    // 2. Check consent text is clear and specific
    if (!consent.consentText || consent.consentText.length < 50) {
      issues.push('Consent text must clearly explain purpose and data categories');
    }

    // 3. Check proof of consent exists
    if (!consent.proofOfConsent) {
      issues.push('Proof of consent must be maintained');
    }

    // 4. Check consent is still valid (not withdrawn)
    if (consent.withdrawn) {
      issues.push('Consent has been withdrawn - processing must stop');
    }

    // 5. Check consent hasn't expired
    if (consent.expiryDate && consent.expiryDate < new Date()) {
      issues.push('Consent has expired - renewal required');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
