import React from 'react';
import { motion } from 'framer-motion';
import { Award, TrendingUp, Shield, Zap, AlertTriangle } from 'lucide-react';
import type { PremiumScoreResult } from '../../services/premiumScoreEngine';

interface ScoreOverviewCardProps {
  result: PremiumScoreResult;
}

export const ScoreOverviewCard: React.FC<ScoreOverviewCardProps> = ({ result }) => {
  const scoreColor = result.overallScore >= 80 ? 'emerald' :
    result.overallScore >= 60 ? 'amber' : 'red';

  const criticalFlags = result.redFlags.filter(f => f.severity === 'critical');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <div className="relative w-44 h-44 mb-4">
              <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="8" />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 314' }}
                  animate={{ strokeDasharray: `${(result.overallScore / 100) * 314} 314` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                  className={`stroke-${scoreColor}-400`}
                  style={{
                    stroke: scoreColor === 'emerald' ? '#34d399' :
                      scoreColor === 'amber' ? '#fbbf24' : '#f87171',
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                    className="text-5xl font-bold"
                    style={{
                      color: scoreColor === 'emerald' ? '#34d399' :
                        scoreColor === 'amber' ? '#fbbf24' : '#f87171',
                    }}
                  >
                    {result.overallScore}
                  </motion.div>
                  <div className="text-slate-400 text-sm">out of 100</div>
                </div>
              </div>
            </div>

            <div
              className="px-4 py-2 rounded-full text-sm font-semibold border"
              style={{
                backgroundColor: scoreColor === 'emerald' ? 'rgba(16,185,129,0.15)' :
                  scoreColor === 'amber' ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)',
                borderColor: scoreColor === 'emerald' ? 'rgba(16,185,129,0.3)' :
                  scoreColor === 'amber' ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)',
                color: scoreColor === 'emerald' ? '#6ee7b7' :
                  scoreColor === 'amber' ? '#fcd34d' : '#fca5a5',
              }}
            >
              {result.matchQuality}
            </div>

            <div className="flex items-center gap-2 mt-3 text-sm text-slate-400">
              <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium">
                {result.userType}
              </span>
              mode
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Shortlist Chance</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{result.shortlistChance}</div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Projected Score</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-cyan-400">{result.projectedScore}</span>
                <span className="text-sm text-slate-500">if quick wins applied</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.projectedScore}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Strengths</span>
              </div>
              <div className="space-y-1.5">
                {result.categories
                  .filter(c => c.status === 'excellent' || c.status === 'good')
                  .slice(0, 3)
                  .map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-slate-300">{c.name}</span>
                      <span className="ml-auto text-emerald-400 font-medium">{c.percentage}%</span>
                    </div>
                  ))}
                {result.categories.filter(c => c.status === 'excellent' || c.status === 'good').length === 0 && (
                  <p className="text-slate-500 text-sm">Keep improving to unlock strengths</p>
                )}
              </div>
            </div>

            {criticalFlags.length > 0 && (
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-xs uppercase tracking-wider font-medium">Critical Issues</span>
                </div>
                <div className="space-y-1">
                  {criticalFlags.slice(0, 3).map(f => (
                    <p key={f.id} className="text-red-300/80 text-sm">{f.title}</p>
                  ))}
                </div>
              </div>
            )}

            {criticalFlags.length === 0 && (
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 text-xs uppercase tracking-wider font-medium">Status</span>
                </div>
                <p className="text-emerald-300/80 text-sm">No critical issues detected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
