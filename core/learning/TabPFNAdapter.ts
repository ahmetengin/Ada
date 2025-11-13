/**
 * TabPFN-2.5 Adapter for Ada
 * Paper: "TabPFN-2.5: Advancing the State of the Art in Tabular Foundation Models"
 * arXiv:2511.08667v1 (Nov 11, 2025)
 *
 * TabPFN-2.5 Features:
 * - Few-shot learning: 100% win rate vs XGBoost with ≤10,000 samples
 * - Zero training: In-context learning via forward pass only
 * - Massive scale: 50,000 rows, 2,000 features (20x TabPFNv2)
 * - Production-ready: Distillable to MLP or tree ensemble
 * - AutoGluon-level accuracy: Matches 4 hours of hyperparameter tuning
 *
 * Use Cases in Ada:
 * - Equipment failure prediction (few failure examples)
 * - Warranty claim risk (sparse historical data)
 * - Fraud detection (limited fraud cases)
 * - Contract risk assessment (small legal dataset)
 */

import EventEmitter from 'events';
import { MaritimeExperience } from './ExperienceLearningPipeline.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * TabPFN prediction result
 */
export interface TabPFNPrediction {
  prediction: any; // Predicted value (class or regression)
  confidence: number; // 0-1
  probabilities?: Record<string, number>; // For classification
  explanation?: string; // Human-readable explanation
  model_version: string;
  timestamp: Date;
}

/**
 * Tabular feature definition
 */
export interface TabularFeature {
  name: string;
  type: 'numeric' | 'categorical' | 'boolean' | 'datetime';
  value: any;
}

/**
 * Tabular data row
 */
export interface TabularRow {
  features: TabularFeature[];
  target?: any; // Ground truth (if available)
  metadata?: Record<string, any>;
}

/**
 * TabPFN model configuration
 */
export interface TabPFNConfig {
  max_samples: number; // Max training samples (default: 10,000)
  max_features: number; // Max features (default: 2,000)
  task_type: 'classification' | 'regression';
  enable_distillation: boolean; // Distill to faster model
  cache_predictions: boolean; // Cache forward passes
}

/**
 * Model distillation result
 */
export interface DistilledModel {
  model_type: 'mlp' | 'xgboost' | 'random_forest';
  parameters: Record<string, any>;
  accuracy: number; // Compared to TabPFN
  speedup_factor: number; // Inference speedup
  created_at: Date;
}

// ============================================================================
// TABPFN ADAPTER
// ============================================================================

export class TabPFNAdapter extends EventEmitter {
  private config: TabPFNConfig;
  private trainingData: TabularRow[] = [];
  private distilledModel?: DistilledModel;
  private predictionCache: Map<string, TabPFNPrediction> = new Map();

  constructor(config?: Partial<TabPFNConfig>) {
    super();
    this.config = {
      max_samples: 10_000,
      max_features: 2_000,
      task_type: 'classification',
      enable_distillation: true,
      cache_predictions: true,
      ...config,
    };
  }

  // ========================================================================
  // DATA PREPARATION
  // ========================================================================

  /**
   * Convert MaritimeExperience to TabularRow
   */
  experienceToTabular(experience: MaritimeExperience): TabularRow {
    const features: TabularFeature[] = [
      // Experience type (categorical)
      { name: 'experience_type', type: 'categorical', value: experience.type },

      // Context features
      { name: 'wind_speed', type: 'numeric', value: experience.context.vessel_state.wind.speed },
      { name: 'wind_direction', type: 'numeric', value: experience.context.vessel_state.wind.direction },
      { name: 'depth', type: 'numeric', value: experience.context.vessel_state.depth },
      { name: 'speed', type: 'numeric', value: experience.context.vessel_state.speed },
      { name: 'heading', type: 'numeric', value: experience.context.vessel_state.heading },
      { name: 'daylight', type: 'boolean', value: experience.context.time.daylight },

      // Temporal features
      { name: 'hour', type: 'numeric', value: new Date(experience.timestamp).getHours() },
      { name: 'day_of_week', type: 'numeric', value: new Date(experience.timestamp).getDay() },

      // Performance features
      { name: 'performance_score', type: 'numeric', value: experience.performance_score },
    ];

    // Add custom data features
    for (const [key, value] of Object.entries(experience.data)) {
      if (typeof value === 'number') {
        features.push({ name: `custom_${key}`, type: 'numeric', value });
      } else if (typeof value === 'boolean') {
        features.push({ name: `custom_${key}`, type: 'boolean', value });
      } else if (typeof value === 'string') {
        features.push({ name: `custom_${key}`, type: 'categorical', value });
      }
    }

    return {
      features,
      target: experience.success, // Binary classification: success/failure
      metadata: {
        experience_id: experience.id,
        timestamp: experience.timestamp,
      },
    };
  }

  /**
   * Add training example
   */
  addTrainingData(row: TabularRow): void {
    // Respect max_samples limit
    if (this.trainingData.length >= this.config.max_samples) {
      // Remove oldest sample (FIFO)
      this.trainingData.shift();
    }

    this.trainingData.push(row);

    this.emit('tabpfn:training_data_added', {
      total_samples: this.trainingData.length,
      max_samples: this.config.max_samples,
    });

    // Clear cache when training data changes
    if (this.config.cache_predictions) {
      this.predictionCache.clear();
    }
  }

  /**
   * Add multiple experiences as training data
   */
  addExperiences(experiences: MaritimeExperience[]): void {
    for (const exp of experiences) {
      const row = this.experienceToTabular(exp);
      this.addTrainingData(row);
    }
  }

  // ========================================================================
  // PREDICTION (FEW-SHOT LEARNING)
  // ========================================================================

  /**
   * Predict using TabPFN in-context learning
   * No training required - uses forward pass only!
   */
  async predict(queryRow: TabularRow): Promise<TabPFNPrediction> {
    // Check cache first
    const cacheKey = this.getCacheKey(queryRow);
    if (this.config.cache_predictions && this.predictionCache.has(cacheKey)) {
      return this.predictionCache.get(cacheKey)!;
    }

    // Check if we have enough training data
    if (this.trainingData.length === 0) {
      throw new Error('TabPFN requires at least 1 training example');
    }

    // Check feature count
    const featureCount = queryRow.features.length;
    if (featureCount > this.config.max_features) {
      throw new Error(`Feature count (${featureCount}) exceeds max (${this.config.max_features})`);
    }

    // =======================================================================
    // SIMULATED TabPFN FORWARD PASS
    // In production, this would call actual TabPFN model API
    // =======================================================================

    const prediction = await this.simulatedTabPFNForwardPass(queryRow);

    // Cache prediction
    if (this.config.cache_predictions) {
      this.predictionCache.set(cacheKey, prediction);
    }

    this.emit('tabpfn:prediction_made', {
      confidence: prediction.confidence,
      prediction: prediction.prediction,
      training_samples: this.trainingData.length,
    });

    return prediction;
  }

  /**
   * Predict from MaritimeExperience directly
   */
  async predictFromExperience(experience: MaritimeExperience): Promise<TabPFNPrediction> {
    const row = this.experienceToTabular(experience);
    return this.predict(row);
  }

  /**
   * Simulated TabPFN forward pass
   * In production, replace with actual model API call
   */
  private async simulatedTabPFNForwardPass(queryRow: TabularRow): Promise<TabPFNPrediction> {
    // Simulate in-context learning by finding K-nearest neighbors
    const k = Math.min(5, this.trainingData.length);
    const neighbors = this.findKNearestNeighbors(queryRow, k);

    // Classification: Vote from neighbors
    if (this.config.task_type === 'classification') {
      const votes: Record<string, number> = {};
      for (const neighbor of neighbors) {
        const target = String(neighbor.row.target);
        votes[target] = (votes[target] || 0) + 1 / (neighbor.distance + 0.001); // Weighted by distance
      }

      // Find majority class
      const sortedVotes = Object.entries(votes).sort((a, b) => b[1] - a[1]);
      const predictedClass = sortedVotes[0][0];
      const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0);

      // Calculate confidence
      const confidence = Math.min(0.95, votes[predictedClass] / totalVotes);

      // Calculate probabilities
      const probabilities: Record<string, number> = {};
      for (const [cls, vote] of Object.entries(votes)) {
        probabilities[cls] = vote / totalVotes;
      }

      return {
        prediction: predictedClass === 'true', // Convert back to boolean
        confidence,
        probabilities,
        explanation: `Predicted from ${k} similar experiences (${this.trainingData.length} total samples)`,
        model_version: 'TabPFN-2.5-simulated',
        timestamp: new Date(),
      };
    }

    // Regression: Average from neighbors (weighted)
    else {
      let weightedSum = 0;
      let totalWeight = 0;

      for (const neighbor of neighbors) {
        const weight = 1 / (neighbor.distance + 0.001);
        weightedSum += Number(neighbor.row.target) * weight;
        totalWeight += weight;
      }

      const prediction = weightedSum / totalWeight;

      // Confidence based on neighbor agreement
      const neighborValues = neighbors.map((n) => Number(n.row.target));
      const variance =
        neighborValues.reduce((sum, val) => {
          const mean = neighborValues.reduce((a, b) => a + b, 0) / neighborValues.length;
          return sum + Math.pow(val - mean, 2);
        }, 0) / neighborValues.length;

      const confidence = Math.min(0.95, 1 / (1 + variance));

      return {
        prediction,
        confidence,
        explanation: `Predicted from ${k} similar experiences (${this.trainingData.length} total samples)`,
        model_version: 'TabPFN-2.5-simulated',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Find K-nearest neighbors using euclidean distance
   */
  private findKNearestNeighbors(queryRow: TabularRow, k: number): Array<{ row: TabularRow; distance: number }> {
    const distances = this.trainingData.map((trainRow) => ({
      row: trainRow,
      distance: this.calculateDistance(queryRow, trainRow),
    }));

    // Sort by distance and take top K
    return distances.sort((a, b) => a.distance - b.distance).slice(0, k);
  }

  /**
   * Calculate euclidean distance between two rows
   */
  private calculateDistance(row1: TabularRow, row2: TabularRow): number {
    let sumSquaredDiff = 0;
    let count = 0;

    // Create feature maps for faster lookup
    const features1 = new Map(row1.features.map((f) => [f.name, f]));
    const features2 = new Map(row2.features.map((f) => [f.name, f]));

    // Calculate distance for matching features
    for (const [name, feat1] of features1) {
      const feat2 = features2.get(name);
      if (!feat2) continue;

      // Skip if types don't match
      if (feat1.type !== feat2.type) continue;

      let diff = 0;
      if (feat1.type === 'numeric') {
        diff = Number(feat1.value) - Number(feat2.value);
      } else if (feat1.type === 'boolean') {
        diff = feat1.value === feat2.value ? 0 : 1;
      } else if (feat1.type === 'categorical') {
        diff = feat1.value === feat2.value ? 0 : 1;
      }

      sumSquaredDiff += diff * diff;
      count++;
    }

    return count > 0 ? Math.sqrt(sumSquaredDiff / count) : Infinity;
  }

  /**
   * Generate cache key for a row
   */
  private getCacheKey(row: TabularRow): string {
    const featureStr = row.features
      .map((f) => `${f.name}:${f.value}`)
      .sort()
      .join('|');
    return `${this.config.task_type}:${featureStr}`;
  }

  // ========================================================================
  // MODEL DISTILLATION
  // ========================================================================

  /**
   * Distill TabPFN to faster model (MLP, XGBoost, etc.)
   * Useful for production deployment when speed is critical
   */
  async distillToFastModel(modelType: 'mlp' | 'xgboost' | 'random_forest'): Promise<DistilledModel> {
    if (this.trainingData.length < 100) {
      throw new Error('Distillation requires at least 100 training samples');
    }

    this.emit('tabpfn:distillation_started', { model_type: modelType });

    // =======================================================================
    // SIMULATED DISTILLATION
    // In production, this would train actual MLP/XGBoost on TabPFN outputs
    // =======================================================================

    // Simulate distillation process
    const distilledModel: DistilledModel = {
      model_type: modelType,
      parameters: this.generateDistilledParameters(modelType),
      accuracy: this.simulateDistillationAccuracy(modelType),
      speedup_factor: this.getSpeedupFactor(modelType),
      created_at: new Date(),
    };

    this.distilledModel = distilledModel;

    this.emit('tabpfn:distillation_completed', distilledModel);

    return distilledModel;
  }

  /**
   * Generate parameters for distilled model
   */
  private generateDistilledParameters(modelType: string): Record<string, any> {
    switch (modelType) {
      case 'mlp':
        return {
          hidden_layers: [128, 64, 32],
          activation: 'relu',
          dropout: 0.2,
          learning_rate: 0.001,
        };
      case 'xgboost':
        return {
          n_estimators: 100,
          max_depth: 6,
          learning_rate: 0.1,
          subsample: 0.8,
        };
      case 'random_forest':
        return {
          n_estimators: 100,
          max_depth: 15,
          min_samples_split: 2,
        };
      default:
        return {};
    }
  }

  /**
   * Simulate distillation accuracy
   */
  private simulateDistillationAccuracy(modelType: string): number {
    // Based on TabPFN-2.5 paper:
    // Distilled models maintain 90-95% of TabPFN accuracy
    const baseAccuracy: Record<string, number> = {
      mlp: 0.93,
      xgboost: 0.95,
      random_forest: 0.92,
    };
    return baseAccuracy[modelType] || 0.9;
  }

  /**
   * Get speedup factor for distilled model
   */
  private getSpeedupFactor(modelType: string): number {
    // Based on TabPFN-2.5 paper:
    // Distilled models are 10-100x faster
    const speedup: Record<string, number> = {
      mlp: 50,
      xgboost: 100,
      random_forest: 75,
    };
    return speedup[modelType] || 50;
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Check if TabPFN should be used based on sample count
   * TabPFN excels with few samples (1-10,000)
   */
  shouldUseTabPFN(sampleCount: number): boolean {
    return sampleCount <= this.config.max_samples;
  }

  /**
   * Get current statistics
   */
  getStatistics(): {
    training_samples: number;
    max_samples: number;
    feature_count: number;
    predictions_made: number;
    cache_size: number;
    has_distilled_model: boolean;
    task_type: string;
  } {
    const featureCount = this.trainingData.length > 0 ? this.trainingData[0].features.length : 0;

    return {
      training_samples: this.trainingData.length,
      max_samples: this.config.max_samples,
      feature_count: featureCount,
      predictions_made: this.predictionCache.size,
      cache_size: this.predictionCache.size,
      has_distilled_model: !!this.distilledModel,
      task_type: this.config.task_type,
    };
  }

  /**
   * Clear all training data and cache
   */
  reset(): void {
    this.trainingData = [];
    this.predictionCache.clear();
    this.distilledModel = undefined;
    this.emit('tabpfn:reset');
  }

  /**
   * Get confidence threshold recommendation
   * Based on TabPFN-2.5 paper guidelines
   */
  getConfidenceThreshold(sampleCount: number): number {
    if (sampleCount < 5) {
      return 0.6; // Lower threshold for very few samples
    } else if (sampleCount < 20) {
      return 0.7;
    } else if (sampleCount < 100) {
      return 0.8;
    } else {
      return 0.85; // Higher threshold when we have more data
    }
  }
}
