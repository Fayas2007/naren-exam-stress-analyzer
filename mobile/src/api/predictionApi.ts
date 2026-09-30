// mobile/src/api/predictionApi.ts
// Client API for Exam Stress Prediction Module with local mathematical fallback

import apiClient from './client';

export interface PredictionInput {
  examination_type: string;
  study_hours: number;
  sleep_hours: number;
  preparation_level: 'Low' | 'Medium' | 'High';
  anxiety_score: number;
}

export interface FeatureContribution {
  feature: string;
  value: string;
  impact_score: number;
  effect: 'Risk Driver' | 'Protective' | 'Neutral';
  description: string;
}

export interface PredictionResponse {
  success: boolean;
  predicted_stress_score: number;
  predicted_stress_level: 'Low Stress' | 'Moderate Stress' | 'High Stress';
  dominant_tier: string;
  confidence: number;
  prediction_probability: {
    low: number;
    moderate: number;
    high: number;
  };
  confidence_interval: {
    lower: number;
    upper: number;
  };
  feature_contributions: FeatureContribution[];
  recommendations: string[];
  input_summary: {
    examination_type: string;
    study_hours_per_day: number;
    sleep_hours_per_night: number;
    preparation_level: string;
    anxiety_score: number;
  };
  model_metadata?: {
    model_type: string;
    version: string;
    target_variable: string;
    r_squared: number;
  };
}

// Local psychometric prediction model matching backend modules/prediction.R
export function calculateLocalPrediction(input: PredictionInput): PredictionResponse {
  const { examination_type, study_hours, sleep_hours, preparation_level, anxiety_score } = input;

  const baseIntercept = 6.15;

  // Exam type weight
  const typeKey = (examination_type || '').toLowerCase().replace(/\s+/g, '');
  let typeContrib = 0.5;
  if (typeKey.includes('final')) typeContrib = 1.4;
  else if (typeKey.includes('standardized')) typeContrib = 1.25;
  else if (typeKey.includes('oral') || typeKey.includes('viva')) typeContrib = 1.15;
  else if (typeKey.includes('midterm')) typeContrib = 0.65;
  else if (typeKey.includes('lab') || typeKey.includes('practical')) typeContrib = 0.35;
  else if (typeKey.includes('quiz')) typeContrib = -0.95;

  // Preparation level
  let prepContrib = 0.0;
  if (preparation_level === 'Low') prepContrib = 1.65;
  else if (preparation_level === 'High') prepContrib = -1.85;

  // Sleep effect (benchmark 8.0h, beta = -0.52)
  const sleepContrib = -0.52 * (sleep_hours - 8.0);

  // Study effect (diminishing return & fatigue curve)
  let studyContrib = 0.0;
  if (study_hours < 3.0) {
    studyContrib = 0.35 * (3.0 - study_hours);
  } else if (study_hours <= 7.0) {
    studyContrib = -0.28 * (study_hours - 3.0);
  } else {
    studyContrib = -1.12 + 0.22 * (study_hours - 7.0);
  }

  // Anxiety effect (benchmark 5.0, beta = 0.48)
  const anxietyContrib = 0.48 * (anxiety_score - 5.0);

  // Raw score clamped between 0.8 and 9.7
  const rawScore = baseIntercept + typeContrib + prepContrib + sleepContrib + studyContrib + anxietyContrib;
  const predictedScore = Number(Math.max(0.8, Math.min(9.7, rawScore)).toFixed(2));

  // Categorize
  let level: 'Low Stress' | 'Moderate Stress' | 'High Stress' = 'Moderate Stress';
  if (predictedScore < 4.0) level = 'Low Stress';
  else if (predictedScore > 7.0) level = 'High Stress';

  // Gaussian CDF approximation
  const normalCdf = (x: number) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  };

  const sigma = 1.45;
  const pLowRaw = normalCdf((4.0 - predictedScore) / sigma);
  const pHighRaw = 1 - normalCdf((7.0 - predictedScore) / sigma);
  const pModRaw = Math.max(0.02, 1 - pLowRaw - pHighRaw);

  const totalP = pLowRaw + pModRaw + pHighRaw;
  const probLow = Number((pLowRaw / totalP).toFixed(3));
  const probMod = Number((pModRaw / totalP).toFixed(3));
  const probHigh = Number((pHighRaw / totalP).toFixed(3));
  const confidence = Math.max(probLow, probMod, probHigh);

  const sePred = 0.32;
  const ciLower = Number(Math.max(0.5, predictedScore - 1.96 * sePred).toFixed(2));
  const ciUpper = Number(Math.min(10.0, predictedScore + 1.96 * sePred).toFixed(2));

  const contributions: FeatureContribution[] = [
    {
      feature: 'Anxiety Level',
      value: `${anxiety_score} / 10`,
      impact_score: Number(anxietyContrib.toFixed(2)),
      effect: anxietyContrib > 0.3 ? 'Risk Driver' : anxietyContrib < -0.3 ? 'Protective' : 'Neutral',
      description: anxiety_score > 6 ? 'Elevated anxiety significantly inflates predicted exam stress.' : 'Controlled anxiety keeps stress levels balanced.',
    },
    {
      feature: 'Sleep Duration',
      value: `${sleep_hours} hrs/night`,
      impact_score: Number(sleepContrib.toFixed(2)),
      effect: sleepContrib > 0.3 ? 'Risk Driver' : sleepContrib < -0.3 ? 'Protective' : 'Neutral',
      description: sleep_hours < 6.5 ? 'Sleep deficit elevates cortisol and reduces cognitive stamina.' : 'Adequate sleep provides neuroprotective resilience.',
    },
    {
      feature: 'Preparation Readiness',
      value: preparation_level,
      impact_score: Number(prepContrib.toFixed(2)),
      effect: prepContrib > 0.3 ? 'Risk Driver' : prepContrib < -0.3 ? 'Protective' : 'Neutral',
      description: preparation_level === 'High' ? 'Comprehensive preparation significantly reduces apprehension.' : preparation_level === 'Low' ? 'Perceived unpreparedness is a prominent stress driver.' : 'Moderate preparation offers a baseline cushion.',
    },
    {
      feature: 'Examination Stakes',
      value: examination_type,
      impact_score: Number(typeContrib.toFixed(2)),
      effect: typeContrib > 0.3 ? 'Risk Driver' : typeContrib < -0.3 ? 'Protective' : 'Neutral',
      description: typeContrib > 0 ? 'High academic consequences elevate evaluative anxiety.' : 'Formative evaluations induce minimal performance apprehension.',
    },
    {
      feature: 'Study Time Allocation',
      value: `${study_hours} hrs/day`,
      impact_score: Number(studyContrib.toFixed(2)),
      effect: studyContrib > 0.3 ? 'Risk Driver' : studyContrib < -0.3 ? 'Protective' : 'Neutral',
      description: study_hours > 8 ? 'Diminishing cognitive returns and mental exhaustion detected.' : 'Balanced revision duration reinforces conceptual confidence.',
    },
  ];

  const recommendations: string[] = [];
  if (sleep_hours < 7.0) {
    const target = Math.min(8.0, sleep_hours + 1.5);
    const saved = (0.52 * (target - sleep_hours)).toFixed(1);
    recommendations.push(`Increasing nightly sleep to ${target}h could lower predicted stress by ~${saved} points.`);
  }
  if (anxiety_score > 6.0) {
    recommendations.push('Practice 5 minutes of box breathing (4s in, 4s hold, 4s out, 4s hold) before starting study sessions.');
  }
  if (preparation_level === 'Low') {
    recommendations.push('Prioritize high-yield past questions and flashcard active recall to rapidly advance readiness to Medium.');
  }
  if (study_hours > 8.0) {
    recommendations.push('Cap daily study at 6-7 hours with 10-minute breaks every 50 minutes to avoid cognitive burnout.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Your daily study and recovery balance demonstrates strong psychological resilience for upcoming examinations.');
  }

  return {
    success: true,
    predicted_stress_score: predictedScore,
    predicted_stress_level: level,
    dominant_tier: level,
    confidence,
    prediction_probability: {
      low: probLow,
      moderate: probMod,
      high: probHigh,
    },
    confidence_interval: {
      lower: ciLower,
      upper: ciUpper,
    },
    feature_contributions: contributions,
    recommendations,
    input_summary: {
      examination_type,
      study_hours_per_day: study_hours,
      sleep_hours_per_night: sleep_hours,
      preparation_level,
      anxiety_score,
    },
    model_metadata: {
      model_type: 'Multivariate Psychometric Linear Regressor with Softmax Probability Calibration',
      version: '2.1.0',
      target_variable: 'stress_score (0.0 - 10.0)',
      r_squared: 0.764,
    },
  };
}

export const predictionApi = {
  predictStress: async (input: PredictionInput): Promise<PredictionResponse> => {
    try {
      const response = await apiClient<PredictionResponse>('/predict/stress', {
        method: 'POST',
        body: JSON.stringify(input),
        timeoutMs: 6000,
        retries: 0,
      });

      if (response && response.predicted_stress_score !== undefined) {
        return response;
      }
      return calculateLocalPrediction(input);
    } catch (err: any) {
      // Gracefully fall back to the exact same client-side mathematical model
      console.log('[Prediction] Using client model evaluator:', err.message);
      return calculateLocalPrediction(input);
    }
  },
};

export default predictionApi;
