<template>
  <div class="vessel-onboarding">
    <!-- Progress Bar -->
    <div class="progress-section">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: progress + '%' }"
        ></div>
      </div>
      <p class="progress-text">{{ progress }}% Complete</p>
    </div>

    <!-- Step Navigation -->
    <div class="steps-navigation">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="step-item"
        :class="{
          'active': currentStepIndex === index,
          'completed': step.completed,
          'disabled': !canNavigateToStep(index)
        }"
        @click="goToStep(index)"
      >
        <div class="step-circle">
          <i v-if="step.completed" class="fas fa-check"></i>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="step-label">
          <div class="step-title">{{ step.title }}</div>
          <div class="step-description">{{ step.description }}</div>
        </div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="step-content">
      <!-- Step 1: Legal Identity -->
      <div v-if="currentStep.id === 'legal-identity'" class="form-section">
        <h2>⚓ Legal Identity & Registration</h2>
        <p class="required-notice">* Required fields - All vessels MUST have valid MMSI and IMO numbers</p>

        <div class="form-grid">
          <!-- Primary Identifiers -->
          <div class="form-group">
            <label>MMSI Number *</label>
            <input
              v-model="formData.legalIdentity.mmsi"
              type="text"
              placeholder="271001234"
              maxlength="9"
              pattern="[0-9]{9}"
              @blur="validateMMSI"
            />
            <small class="help-text">9-digit Maritime Mobile Service Identity</small>
            <div v-if="validationErrors.mmsi" class="error-text">{{ validationErrors.mmsi }}</div>
          </div>

          <div class="form-group">
            <label>IMO Number *</label>
            <input
              v-model="formData.legalIdentity.imo"
              type="text"
              placeholder="IMO1234567"
              @blur="validateIMO"
            />
            <small class="help-text">IMO + 7 digits (e.g., IMO1234567)</small>
            <div v-if="validationErrors.imo" class="error-text">{{ validationErrors.imo }}</div>
          </div>

          <div class="form-group">
            <label>Call Sign *</label>
            <input
              v-model="formData.legalIdentity.callSign"
              type="text"
              placeholder="TCAB1234"
            />
            <small class="help-text">Radio call sign</small>
          </div>

          <div class="form-group">
            <label>Vessel Name *</label>
            <input
              v-model="formData.legalIdentity.vesselName"
              type="text"
              placeholder="MY YACHT NAME"
            />
            <small class="help-text">Official registered name</small>
          </div>

          <!-- Flag State & Registration -->
          <div class="form-group">
            <label>Flag State *</label>
            <select v-model="formData.legalIdentity.flagState">
              <option value="">Select...</option>
              <option value="TUR">🇹🇷 Turkey</option>
              <option value="GRC">🇬🇷 Greece</option>
              <option value="CYP">🇨🇾 Cyprus</option>
              <option value="ITA">🇮🇹 Italy</option>
              <option value="ESP">🇪🇸 Spain</option>
              <option value="FRA">🇫🇷 France</option>
              <option value="GBR">🇬🇧 United Kingdom</option>
              <option value="USA">🇺🇸 United States</option>
            </select>
            <small class="help-text">ISO 3166-1 alpha-3 code</small>
          </div>

          <div class="form-group">
            <label>Port of Registry *</label>
            <input
              v-model="formData.legalIdentity.portOfRegistry"
              type="text"
              placeholder="Istanbul"
            />
          </div>

          <div class="form-group">
            <label>Registration Number *</label>
            <input
              v-model="formData.legalIdentity.registrationNumber"
              type="text"
              placeholder="TR-IST-2024-001"
            />
          </div>

          <!-- Vessel Type -->
          <div class="form-group">
            <label>Vessel Type *</label>
            <select v-model="formData.legalIdentity.vesselType">
              <option value="">Select...</option>
              <option value="36">⛵ Sailing Yacht</option>
              <option value="37">🛥️ Motor Yacht / Pleasure Craft</option>
              <option value="60">🚢 Passenger Ship</option>
              <option value="70">📦 Cargo</option>
              <option value="80">🛢️ Tanker</option>
            </select>
          </div>

          <div class="form-group">
            <label>AIS Class *</label>
            <select v-model="formData.legalIdentity.aisClass">
              <option value="">Select...</option>
              <option value="B">Class B (Recreational, <300 GT)</option>
              <option value="A">Class A (Commercial, >300 GT)</option>
            </select>
          </div>

          <!-- Dimensions -->
          <div class="form-group">
            <label>Length *</label>
            <input
              v-model.number="formData.legalIdentity.length"
              type="number"
              step="0.01"
              placeholder="15.94"
            />
            <small class="help-text">Overall length in meters</small>
          </div>

          <div class="form-group">
            <label>Beam *</label>
            <input
              v-model.number="formData.legalIdentity.beam"
              type="number"
              step="0.01"
              placeholder="4.80"
            />
            <small class="help-text">Beam in meters</small>
          </div>

          <div class="form-group">
            <label>Draft *</label>
            <input
              v-model.number="formData.legalIdentity.draft"
              type="number"
              step="0.01"
              placeholder="2.38"
            />
            <small class="help-text">Draft in meters</small>
          </div>

          <div class="form-group">
            <label>Height</label>
            <input
              v-model.number="formData.legalIdentity.height"
              type="number"
              step="0.01"
              placeholder="22.5"
            />
            <small class="help-text">Height above waterline (meters)</small>
          </div>

          <!-- Tonnage -->
          <div class="form-group">
            <label>Gross Tonnage</label>
            <input
              v-model.number="formData.legalIdentity.grossTonnage"
              type="number"
              placeholder="28"
            />
            <small class="help-text">GT (required if >100)</small>
          </div>

          <!-- Dates -->
          <div class="form-group">
            <label>Built Year *</label>
            <input
              v-model.number="formData.legalIdentity.builtYear"
              type="number"
              placeholder="2019"
              min="1900"
              :max="new Date().getFullYear()"
            />
          </div>

          <div class="form-group">
            <label>Registration Date *</label>
            <input
              v-model="formData.legalIdentity.registrationDate"
              type="date"
            />
          </div>

          <div class="form-group">
            <label>AIS Transponder Installed *</label>
            <input
              v-model="formData.legalIdentity.aisTransponderInstalled"
              type="date"
            />
          </div>

          <!-- Compliance -->
          <div class="form-group checkbox-group">
            <label>
              <input
                v-model="formData.legalIdentity.solasCompliant"
                type="checkbox"
              />
              SOLAS Compliant
            </label>
            <small class="help-text">Required for vessels 300+ GT</small>
          </div>
        </div>
      </div>

      <!-- Step 2: Certificates -->
      <div v-if="currentStep.id === 'certificates'" class="form-section">
        <h2>📜 Certificates & Documents</h2>

        <!-- Insurance -->
        <div class="subsection">
          <h3>Insurance (Required)</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Insurance Company *</label>
              <input v-model="formData.certificates.insurance.company" type="text" placeholder="Anadolu Sigorta" />
            </div>

            <div class="form-group">
              <label>Policy Number *</label>
              <input v-model="formData.certificates.insurance.policyNumber" type="text" placeholder="POL-2024-999888" />
            </div>

            <div class="form-group">
              <label>Coverage Type *</label>
              <select v-model="formData.certificates.insurance.coverageType">
                <option value="">Select...</option>
                <option value="Hull & Machinery">Hull & Machinery</option>
                <option value="P&I">P&I (Protection & Indemnity)</option>
                <option value="Comprehensive">Comprehensive</option>
              </select>
            </div>

            <div class="form-group">
              <label>Coverage Amount *</label>
              <input v-model.number="formData.certificates.insurance.coverageAmount" type="number" placeholder="500000" />
            </div>

            <div class="form-group">
              <label>Currency *</label>
              <select v-model="formData.certificates.insurance.currency">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="TRY">TRY</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div class="form-group">
              <label>Expiry Date *</label>
              <input v-model="formData.certificates.insurance.expiryDate" type="date" />
              <div v-if="isInsuranceExpiringSoon" class="warning-text">
                ⚠️ Insurance expires within 30 days!
              </div>
            </div>

            <div class="form-group">
              <label>Emergency Contact *</label>
              <input v-model="formData.certificates.insurance.contactEmergency" type="text" placeholder="+90 850 123 4567" />
            </div>
          </div>
        </div>

        <!-- Turkish Vessels: Mavi Kart -->
        <div v-if="formData.legalIdentity.flagState === 'TUR'" class="subsection">
          <h3>🇹🇷 Mavi Kart (Turkish Blue Card)</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Card Number</label>
              <input v-model="formData.certificates.maviKart.cardNumber" type="text" placeholder="MK-2020-99999" />
            </div>

            <div class="form-group">
              <label>Holder Name</label>
              <input v-model="formData.certificates.maviKart.holderName" type="text" />
            </div>

            <div class="form-group">
              <label>Holder TC</label>
              <input v-model="formData.certificates.maviKart.holderTC" type="text" maxlength="11" />
            </div>

            <div class="form-group">
              <label>Expiry Date</label>
              <input v-model="formData.certificates.maviKart.expiryDate" type="date" />
            </div>
          </div>
        </div>

        <!-- Safety Equipment -->
        <div class="subsection">
          <h3>⚓ Safety Equipment</h3>
          <div class="form-grid">
            <div class="form-group checkbox-group">
              <label>
                <input v-model="formData.certificates.safety.lifeRaftCertified" type="checkbox" />
                Life Raft Certified
              </label>
            </div>

            <div class="form-group">
              <label>Life Raft Capacity</label>
              <input v-model.number="formData.certificates.safety.lifeRaftCapacity" type="number" placeholder="8" />
            </div>

            <div class="form-group">
              <label>Life Jackets Count</label>
              <input v-model.number="formData.certificates.safety.lifeJacketsCount" type="number" placeholder="12" />
            </div>

            <div class="form-group checkbox-group">
              <label>
                <input v-model="formData.certificates.safety.epirb.registered" type="checkbox" />
                EPIRB Registered
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Specifications -->
      <div v-if="currentStep.id === 'specifications'" class="form-section">
        <h2>🚤 Vessel Specifications</h2>

        <div class="form-grid">
          <div class="form-group">
            <label>Manufacturer *</label>
            <input v-model="formData.specifications.manufacturer" type="text" placeholder="Beneteau" />
          </div>

          <div class="form-group">
            <label>Model *</label>
            <input v-model="formData.specifications.model" type="text" placeholder="Oceanis 51.1" />
          </div>

          <div class="form-group">
            <label>Hull Type *</label>
            <select v-model="formData.specifications.hullType">
              <option value="">Select...</option>
              <option value="Monohull">Monohull</option>
              <option value="Catamaran">Catamaran</option>
              <option value="Trimaran">Trimaran</option>
              <option value="Motor Yacht">Motor Yacht</option>
            </select>
          </div>

          <div class="form-group">
            <label>Propulsion *</label>
            <select v-model="formData.specifications.propulsion">
              <option value="">Select...</option>
              <option value="Sail">Sail Only</option>
              <option value="Motor">Motor Only</option>
              <option value="Sail + Motor">Sail + Motor</option>
            </select>
          </div>
        </div>

        <!-- Tanks -->
        <div class="subsection">
          <h3>💧 Tank Capacities</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Fresh Water (liters) *</label>
              <input v-model.number="formData.specifications.tanks.freshWater.capacity" type="number" placeholder="730" />
            </div>

            <div class="form-group">
              <label>Fuel (liters) *</label>
              <input v-model.number="formData.specifications.tanks.fuel.capacity" type="number" placeholder="200" />
            </div>

            <div class="form-group">
              <label>Black Water (liters)</label>
              <input v-model.number="formData.specifications.tanks.blackWater.capacity" type="number" placeholder="150" />
            </div>

            <div class="form-group">
              <label>Grey Water (liters)</label>
              <input v-model.number="formData.specifications.tanks.greyWater.capacity" type="number" placeholder="100" />
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Ownership -->
      <div v-if="currentStep.id === 'ownership'" class="form-section">
        <h2>👤 Ownership Information</h2>

        <div class="form-grid">
          <div class="form-group">
            <label>Owner Name *</label>
            <input v-model="formData.ownership.currentOwner.name" type="text" />
          </div>

          <div class="form-group">
            <label>Email *</label>
            <input v-model="formData.ownership.currentOwner.email" type="email" />
          </div>

          <div class="form-group">
            <label>Phone *</label>
            <input v-model="formData.ownership.currentOwner.phone" type="tel" />
          </div>

          <div class="form-group">
            <label>Ownership Since *</label>
            <input v-model="formData.ownership.currentOwner.since" type="date" />
          </div>
        </div>

        <!-- Home Port -->
        <div class="subsection">
          <h3>⚓ Home Port</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Marina *</label>
              <input v-model="formData.homePort.marina" type="text" placeholder="Milta Bodrum Marina" />
            </div>

            <div class="form-group">
              <label>Berth Number</label>
              <input v-model="formData.homePort.berth" type="text" placeholder="A-45" />
            </div>

            <div class="form-group">
              <label>Country *</label>
              <input v-model="formData.homePort.country" type="text" placeholder="Turkey" />
            </div>
          </div>
        </div>
      </div>

      <!-- Additional steps 5-8 would follow same pattern -->
      <div v-if="currentStep.id === 'review'" class="form-section">
        <h2>✅ Review & Confirm</h2>

        <div class="review-summary">
          <div class="review-card">
            <h3>Vessel Identity</h3>
            <p><strong>Name:</strong> {{ formData.legalIdentity.vesselName }}</p>
            <p><strong>MMSI:</strong> {{ formData.legalIdentity.mmsi }}</p>
            <p><strong>IMO:</strong> {{ formData.legalIdentity.imo }}</p>
            <p><strong>Flag:</strong> {{ formData.legalIdentity.flagState }}</p>
          </div>

          <div class="review-card">
            <h3>Owner</h3>
            <p><strong>Name:</strong> {{ formData.ownership.currentOwner.name }}</p>
            <p><strong>Email:</strong> {{ formData.ownership.currentOwner.email }}</p>
          </div>

          <div class="review-card">
            <h3>Home Port</h3>
            <p><strong>Marina:</strong> {{ formData.homePort.marina }}</p>
            <p><strong>Country:</strong> {{ formData.homePort.country }}</p>
          </div>

          <div v-if="validationSummary.errors.length > 0" class="validation-errors">
            <h4>⚠️ Validation Errors</h4>
            <ul>
              <li v-for="error in validationSummary.errors" :key="error">{{ error }}</li>
            </ul>
          </div>

          <div v-if="validationSummary.warnings.length > 0" class="validation-warnings">
            <h4>⚠️ Warnings</h4>
            <ul>
              <li v-for="warning in validationSummary.warnings" :key="warning">{{ warning }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="navigation-buttons">
      <button
        v-if="currentStepIndex > 0"
        @click="previousStep"
        class="btn btn-secondary"
      >
        ← Previous
      </button>

      <button
        v-if="currentStepIndex < steps.length - 1"
        @click="nextStep"
        class="btn btn-primary"
        :disabled="!currentStep.completed && currentStep.required"
      >
        Next →
      </button>

      <button
        v-if="currentStepIndex === steps.length - 1"
        @click="createVesselInstance"
        class="btn btn-success"
        :disabled="!canCreateInstance"
      >
        🚀 Create Vessel Instance
      </button>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="modal">
      <div class="modal-content">
        <h2>🎉 Success!</h2>
        <p>Vessel instance created successfully!</p>
        <p><strong>Node ID:</strong> {{ createdInstance.nodeId }}</p>
        <p><strong>Tenant ID:</strong> {{ createdInstance.tenantId }}</p>
        <button @click="closeSuccessModal" class="btn btn-primary">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

// API Base URL
const apiUrl = ref('http://localhost:8000');

// Steps configuration
const steps = ref([
  {
    id: 'legal-identity',
    title: 'Legal Identity',
    description: 'MMSI, IMO, Registration',
    completed: false,
    required: true,
  },
  {
    id: 'certificates',
    title: 'Certificates',
    description: 'Insurance, Safety, Documents',
    completed: false,
    required: true,
  },
  {
    id: 'specifications',
    title: 'Specifications',
    description: 'Manufacturer, Tanks, Equipment',
    completed: false,
    required: true,
  },
  {
    id: 'ownership',
    title: 'Ownership',
    description: 'Owner, Home Port',
    completed: false,
    required: true,
  },
  {
    id: 'crew',
    title: 'Crew',
    description: 'Captain, Crew Members',
    completed: false,
    required: false,
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    description: 'Schedule, Tasks',
    completed: false,
    required: true,
  },
  {
    id: 'emergency',
    title: 'Emergency',
    description: 'Contacts, Procedures',
    completed: false,
    required: true,
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Confirm & Create',
    completed: false,
    required: true,
  },
]);

const currentStepIndex = ref(0);

const currentStep = computed(() => steps.value[currentStepIndex.value]);

const progress = computed(() => {
  const completedSteps = steps.value.filter(s => s.completed).length;
  return Math.round((completedSteps / steps.value.length) * 100);
});

// Form Data
const formData = ref({
  legalIdentity: {
    mmsi: '',
    imo: '',
    callSign: '',
    vesselName: '',
    flagState: '',
    portOfRegistry: '',
    registrationNumber: '',
    vesselType: '',
    aisClass: '',
    length: null,
    beam: null,
    draft: null,
    height: null,
    grossTonnage: null,
    builtYear: null,
    registrationDate: '',
    aisTransponderInstalled: '',
    solasCompliant: false,
  },
  certificates: {
    insurance: {
      company: '',
      policyNumber: '',
      coverageType: '',
      coverageAmount: null,
      currency: 'EUR',
      expiryDate: '',
      contactEmergency: '',
    },
    maviKart: {
      cardNumber: '',
      holderName: '',
      holderTC: '',
      expiryDate: '',
    },
    safety: {
      lifeRaftCertified: false,
      lifeRaftCapacity: 0,
      lifeJacketsCount: 0,
      epirb: {
        registered: false,
      },
    },
  },
  specifications: {
    manufacturer: '',
    model: '',
    hullType: '',
    propulsion: '',
    tanks: {
      freshWater: { capacity: null },
      fuel: { capacity: null },
      blackWater: { capacity: null },
      greyWater: { capacity: null },
    },
  },
  ownership: {
    currentOwner: {
      name: '',
      email: '',
      phone: '',
      since: '',
    },
  },
  homePort: {
    marina: '',
    berth: '',
    country: '',
  },
});

const validationErrors = ref<Record<string, string>>({});
const validationSummary = ref({ errors: [], warnings: [] });
const showSuccessModal = ref(false);
const createdInstance = ref<any>(null);

// Validation
const validateMMSI = () => {
  const mmsi = formData.value.legalIdentity.mmsi;
  if (!mmsi) {
    validationErrors.value.mmsi = 'MMSI is required';
  } else if (!/^[0-9]{9}$/.test(mmsi)) {
    validationErrors.value.mmsi = 'MMSI must be 9 digits';
  } else if (mmsi === '000000000') {
    validationErrors.value.mmsi = 'Invalid MMSI: Dummy value not allowed';
  } else {
    delete validationErrors.value.mmsi;
  }
};

const validateIMO = () => {
  const imo = formData.value.legalIdentity.imo;
  if (!imo) {
    validationErrors.value.imo = 'IMO is required';
  } else if (!/^IMO[0-9]{7}$/.test(imo)) {
    validationErrors.value.imo = 'IMO must be IMO + 7 digits';
  } else if (imo === 'IMO0000000') {
    validationErrors.value.imo = 'Invalid IMO: Dummy value not allowed';
  } else {
    delete validationErrors.value.imo;
  }
};

const isInsuranceExpiringSoon = computed(() => {
  const expiryDate = formData.value.certificates.insurance.expiryDate;
  if (!expiryDate) return false;

  const expiry = new Date(expiryDate);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return expiry < thirtyDaysFromNow;
});

const canNavigateToStep = (index: number) => {
  // Can always go back
  if (index < currentStepIndex.value) return true;

  // Can go to next step if current is completed or not required
  if (index === currentStepIndex.value + 1) {
    return currentStep.value.completed || !currentStep.value.required;
  }

  return false;
};

const canCreateInstance = computed(() => {
  return steps.value.filter(s => s.required).every(s => s.completed);
});

// Navigation
const nextStep = () => {
  if (currentStepIndex.value < steps.value.length - 1) {
    currentStepIndex.value++;
  }
};

const previousStep = () => {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--;
  }
};

const goToStep = (index: number) => {
  if (canNavigateToStep(index)) {
    currentStepIndex.value = index;
  }
};

// Create Vessel Instance
const createVesselInstance = async () => {
  try {
    const response = await axios.post(`${apiUrl.value}/api/ada-sea/onboarding`, formData.value);
    createdInstance.value = response.data;
    showSuccessModal.value = true;
  } catch (error) {
    console.error('Error creating vessel instance:', error);
    alert('Error creating vessel instance. Please check console for details.');
  }
};

const closeSuccessModal = () => {
  showSuccessModal.value = false;
  // Redirect to vessel dashboard
  window.location.href = `/vessel/${createdInstance.value.tenantId}`;
};

// Auto-save draft (optional)
const saveDraft = () => {
  localStorage.setItem('vessel-onboarding-draft', JSON.stringify(formData.value));
};

const loadDraft = () => {
  const draft = localStorage.getItem('vessel-onboarding-draft');
  if (draft) {
    formData.value = JSON.parse(draft);
  }
};

onMounted(() => {
  loadDraft();
});
</script>

<style scoped>
.vessel-onboarding {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.progress-section {
  margin-bottom: 30px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #2196F3);
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  margin-top: 10px;
  font-weight: bold;
  color: #2196F3;
}

.steps-navigation {
  display: flex;
  justify-content: space-between;
  margin-bottom: 40px;
  overflow-x: auto;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 10px;
  min-width: 120px;
}

.step-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.step-item.active .step-circle {
  background: #2196F3;
  color: white;
  transform: scale(1.1);
}

.step-item.completed .step-circle {
  background: #4CAF50;
  color: white;
}

.step-label {
  text-align: center;
}

.step-title {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
}

.step-description {
  font-size: 11px;
  color: #666;
}

.form-section {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-height: 500px;
}

.form-section h2 {
  margin-bottom: 10px;
  color: #2196F3;
}

.required-notice {
  color: #f44336;
  margin-bottom: 20px;
  font-size: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.form-group input,
.form-group select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #2196F3;
}

.help-text {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.error-text {
  font-size: 12px;
  color: #f44336;
  margin-top: 4px;
}

.warning-text {
  font-size: 12px;
  color: #ff9800;
  margin-top: 4px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subsection {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.subsection h3 {
  margin-bottom: 15px;
  color: #666;
}

.review-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.review-card {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.review-card h3 {
  margin-bottom: 15px;
  color: #2196F3;
}

.review-card p {
  margin-bottom: 8px;
}

.validation-errors,
.validation-warnings {
  grid-column: 1 / -1;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

.validation-errors {
  background: #ffebee;
  border-left: 4px solid #f44336;
}

.validation-warnings {
  background: #fff3e0;
  border-left: 4px solid #ff9800;
}

.navigation-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
}

.btn {
  padding: 12px 30px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1976D2;
}

.btn-secondary {
  background: #757575;
  color: white;
}

.btn-secondary:hover {
  background: #616161;
}

.btn-success {
  background: #4CAF50;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #388E3C;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 40px;
  border-radius: 8px;
  text-align: center;
  max-width: 500px;
}

.modal-content h2 {
  color: #4CAF50;
  margin-bottom: 20px;
}

.modal-content p {
  margin-bottom: 10px;
}
</style>
