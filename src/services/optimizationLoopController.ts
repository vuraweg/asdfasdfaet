import { ResumeData } from '../types/resume';
import { scoreResumeAgainstJD, JDScoringResult, ParameterScore } from './jdScoringEngine';
import { classifyGaps, GapClassification } from './gapClassificationEngine';
import { optimizeByParameter, OptimizationChange, TargetedOptimizationResult } from './targetedParameterOptimizer';

export interface LoopIterationResult {
  iteration: number;
  score: JDScoringResult;
  gapClassification: GapClassification;
  changes: OptimizationChange[];
}

export interface OptimizationSessionResult {
  beforeScore: JDScoringResult;
  afterScore: JDScoringResult;
  gapClassification: GapClassification;
  optimizedResume: ResumeData;
  iterations: LoopIterationResult[];
  totalChanges: OptimizationChange[];
  parameterDeltas: ParameterDelta[];
  categoryDeltas: CategoryDelta[];
  reachedTarget: boolean;
  processingTimeMs: number;
}

export interface ParameterDelta {
  id: number;
  name: string;
  category: string;
  beforeScore: number;
  afterScore: number;
  beforePercentage: number;
  afterPercentage: number;
  delta: number;
  improved: boolean;
  fixable: boolean;
}

export interface CategoryDelta {
  name: string;
  beforePercentage: number;
  afterPercentage: number;
  delta: number;
  weight: number;
}

const MAX_LOOPS = 2;
const TARGET_SCORE = 90;

export async function runOptimizationLoop(
  resume: ResumeData,
  jobDescription: string,
  onProgress?: (message: string, progress: number) => void
): Promise<OptimizationSessionResult> {
  const startTime = Date.now();
  const iterations: LoopIterationResult[] = [];
  const allChanges: OptimizationChange[] = [];

  onProgress?.('Scoring your resume against the job description...', 10);
  const beforeScore = scoreResumeAgainstJD(resume, jobDescription);

  let currentResume = JSON.parse(JSON.stringify(resume)) as ResumeData;
  let currentScore = beforeScore;
  let currentGaps = classifyGaps(currentScore.parameters, currentScore.overallScore);

  for (let loop = 0; loop < MAX_LOOPS; loop++) {
    if (currentScore.overallScore >= TARGET_SCORE) break;
    if (currentGaps.fixableGaps.length === 0) break;

    const progressBase = 20 + loop * 35;
    onProgress?.(`Optimization pass ${loop + 1}: Fixing ${currentGaps.fixableGaps.length} parameters...`, progressBase);

    const optimizationResult = await optimizeByParameter(
      currentResume,
      jobDescription,
      currentGaps.fixableGaps
    );

    currentResume = optimizationResult.optimizedResume;
    allChanges.push(...optimizationResult.changes);

    onProgress?.(`Re-scoring after pass ${loop + 1}...`, progressBase + 25);
    currentScore = scoreResumeAgainstJD(currentResume, jobDescription);
    currentGaps = classifyGaps(currentScore.parameters, currentScore.overallScore);

    iterations.push({
      iteration: loop + 1,
      score: currentScore,
      gapClassification: currentGaps,
      changes: optimizationResult.changes,
    });
  }

  onProgress?.('Calculating final results...', 90);

  const parameterDeltas = buildParameterDeltas(beforeScore.parameters, currentScore.parameters);
  const categoryDeltas = buildCategoryDeltas(beforeScore, currentScore);

  onProgress?.('Optimization complete!', 100);

  return {
    beforeScore,
    afterScore: currentScore,
    gapClassification: currentGaps,
    optimizedResume: currentResume,
    iterations,
    totalChanges: allChanges,
    parameterDeltas,
    categoryDeltas,
    reachedTarget: currentScore.overallScore >= TARGET_SCORE,
    processingTimeMs: Date.now() - startTime,
  };
}

function buildParameterDeltas(
  before: ParameterScore[],
  after: ParameterScore[]
): ParameterDelta[] {
  return before.map(bp => {
    const ap = after.find(a => a.id === bp.id);
    if (!ap) return null;
    return {
      id: bp.id,
      name: bp.name,
      category: bp.category,
      beforeScore: bp.score,
      afterScore: ap.score,
      beforePercentage: bp.percentage,
      afterPercentage: ap.percentage,
      delta: ap.percentage - bp.percentage,
      improved: ap.percentage > bp.percentage,
      fixable: bp.fixable,
    };
  }).filter(Boolean) as ParameterDelta[];
}

function buildCategoryDeltas(
  before: JDScoringResult,
  after: JDScoringResult
): CategoryDelta[] {
  return before.categories.map(bc => {
    const ac = after.categories.find(a => a.name === bc.name);
    if (!ac) return null;
    return {
      name: bc.name,
      beforePercentage: bc.percentage,
      afterPercentage: ac.percentage,
      delta: ac.percentage - bc.percentage,
      weight: bc.weight,
    };
  }).filter(Boolean) as CategoryDelta[];
}
