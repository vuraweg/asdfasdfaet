import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type { PremiumScoreResult } from '../../services/premiumScoreEngine';
import { ScoreOverviewCard } from './ScoreOverviewCard';
import { CategoryBreakdown } from './CategoryBreakdown';
import { SkillBucketsPanel } from './SkillBucketsPanel';
import { QuickWinsPanel } from './QuickWinsPanel';
import { ProjectScoresPanel } from './ProjectScoresPanel';
import { WeightDonutChart } from './WeightDonutChart';

interface PremiumResultsDashboardProps {
  result: PremiumScoreResult;
  onCheckAnother: () => void;
  onNavigateBack: () => void;
}

export const PremiumResultsDashboard: React.FC<PremiumResultsDashboardProps> = ({
  result,
  onCheckAnother,
  onNavigateBack,
}) => {
  const showProjects = result.userType !== 'experienced' || result.projectScores.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <ScoreOverviewCard result={result} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <CategoryBreakdown categories={result.categories} />
        </div>
        <div className="space-y-5">
          <WeightDonutChart categories={result.categories} />
          <QuickWinsPanel
            quickWins={result.quickWins}
            redFlags={result.redFlags}
            projectedScore={result.projectedScore}
            currentScore={result.overallScore}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SkillBucketsPanel buckets={result.skillBuckets} />
        {showProjects && <ProjectScoresPanel projects={result.projectScores} />}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 pb-8"
      >
        <button
          onClick={onCheckAnother}
          className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 transition-all duration-300 shadow-lg shadow-emerald-500/25 flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Check Another Resume
        </button>
        <button
          onClick={onNavigateBack}
          className="px-8 py-3 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700 transition-all duration-300 border border-slate-700 flex items-center gap-2"
        >
          Back to Home
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
};
