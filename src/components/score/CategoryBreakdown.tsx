import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { CategoryScore } from '../../services/premiumScoreEngine';

interface CategoryBreakdownProps {
  categories: CategoryScore[];
}

const categoryIcons: Record<string, string> = {
  section_order: '📋',
  keyword_match: '🔑',
  projects_quality: '🚀',
  ats_compatibility: '🤖',
  skills_quality: '⚡',
  internship: '💼',
  impact_achievements: '📊',
  experience_quality: '🏢',
  structure_readability: '📐',
  education: '🎓',
  online_presence: '🌐',
};

const statusColors: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  excellent: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  good: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', bar: 'bg-cyan-500' },
  needs_work: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', bar: 'bg-amber-500' },
  poor: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', bar: 'bg-red-500' },
};

const statusLabels: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  needs_work: 'Needs Work',
  poor: 'Poor',
};

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ categories }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      <div className="p-5 border-b border-slate-700/40">
        <h3 className="text-lg font-semibold text-slate-100">Score Breakdown</h3>
        <p className="text-sm text-slate-400 mt-1">Click any category to see detailed checks</p>
      </div>

      <div className="p-4 space-y-3">
        {categories.map((cat, index) => {
          const colors = statusColors[cat.status];
          const isExpanded = expandedId === cat.id;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                className={`w-full text-left rounded-xl border transition-all duration-200 ${
                  isExpanded ? `${colors.bg} ${colors.border}` : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600/50'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{categoryIcons[cat.id] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-200 truncate">{cat.name}</span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-xs font-medium ${colors.text} px-2 py-0.5 rounded-full ${colors.bg} ${colors.border} border`}>
                            {statusLabels[cat.status]}
                          </span>
                          <span className="text-sm font-bold text-slate-300">{cat.percentage}%</span>
                          <span className="text-xs text-slate-500">{cat.weight}% weight</span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(cat.percentage, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.4 + index * 0.05 }}
                          className={`h-1.5 rounded-full ${colors.bar}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 space-y-3">
                      <div className="space-y-2">
                        {cat.subChecks.map(check => (
                          <div
                            key={check.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              check.passed
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : check.severity === 'critical'
                                ? 'bg-red-500/5 border-red-500/20'
                                : 'bg-amber-500/5 border-amber-500/20'
                            }`}
                          >
                            {check.passed ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            ) : check.severity === 'critical' ? (
                              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${check.passed ? 'text-slate-200' : 'text-slate-300'}`}>
                                  {check.label}
                                </span>
                                {check.severity === 'critical' && !check.passed && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium uppercase">Critical</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{check.detail}</p>
                              {check.fix && !check.passed && (
                                <p className="text-xs text-cyan-400/80 mt-1">Fix: {check.fix}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {cat.suggestions.length > 0 && (
                        <div className="pt-2 border-t border-slate-700/30">
                          <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Suggestions</p>
                          {cat.suggestions.map((s, i) => (
                            <p key={i} className="text-sm text-slate-300 ml-2 mb-1">- {s}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
