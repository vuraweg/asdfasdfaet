import { ResumeData } from '../types/resume';
import { ParameterScore, scoreResumeAgainstJD, JDScoringResult } from './jdScoringEngine';
import { GapItem } from './gapClassificationEngine';
import { openrouter } from './aiProxyService';

const IMPACT_VERBS = [
  'Achieved', 'Exceeded', 'Surpassed', 'Delivered', 'Generated', 'Produced',
  'Spearheaded', 'Led', 'Directed', 'Orchestrated', 'Championed', 'Pioneered',
  'Engineered', 'Architected', 'Developed', 'Built', 'Designed', 'Implemented',
  'Optimized', 'Enhanced', 'Streamlined', 'Accelerated', 'Transformed', 'Modernized',
  'Analyzed', 'Evaluated', 'Assessed', 'Identified', 'Diagnosed', 'Investigated',
  'Collaborated', 'Coordinated', 'Facilitated', 'Integrated', 'Aligned',
  'Managed', 'Oversaw', 'Supervised', 'Administered', 'Maintained',
  'Innovated', 'Conceptualized', 'Formulated', 'Established', 'Launched',
];

const WEAK_VERBS_MAP: Record<string, string> = {
  'worked': 'Delivered', 'helped': 'Enabled', 'assisted': 'Supported', 'did': 'Executed',
  'made': 'Created', 'got': 'Achieved', 'used': 'Leveraged', 'handled': 'Managed',
  'dealt': 'Resolved', 'participated': 'Engaged',
};

const VAGUE_PHRASES: Record<string, string> = {
  'responsible for': 'Managed', 'worked on': 'Developed', 'helped with': 'Facilitated',
  'involved in': 'Contributed to', 'was part of': 'Collaborated on', 'took care of': 'Administered',
  'assisted with': 'Supported',
};

export interface OptimizationChange {
  parameterId: number;
  section: string;
  before: string;
  after: string;
  description: string;
}

export interface TargetedOptimizationResult {
  optimizedResume: ResumeData;
  changes: OptimizationChange[];
  parametersFixed: number[];
}

function getAllBullets(resume: ResumeData): string[] {
  const bullets: string[] = [];
  resume.workExperience?.forEach(exp => exp.bullets?.forEach(b => bullets.push(b)));
  resume.projects?.forEach(p => p.bullets?.forEach(b => bullets.push(b)));
  return bullets;
}

function fixWeakVerbs(resume: ResumeData): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  const usedVerbs = new Set<string>();

  const fixBullet = (bullet: string, section: string): string => {
    let fixed = bullet;
    for (const [weak, strong] of Object.entries(VAGUE_PHRASES)) {
      const regex = new RegExp(`^${weak}`, 'i');
      if (regex.test(fixed)) {
        fixed = fixed.replace(regex, strong);
        changes.push({ parameterId: 14, section, before: bullet, after: fixed, description: `Replaced vague phrase "${weak}" with "${strong}"` });
        return fixed;
      }
    }

    const firstWord = fixed.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
    if (firstWord && WEAK_VERBS_MAP[firstWord]) {
      const replacement = WEAK_VERBS_MAP[firstWord];
      fixed = replacement + fixed.slice(firstWord.length);
      changes.push({ parameterId: 14, section, before: bullet, after: fixed, description: `Replaced weak verb "${firstWord}" with "${replacement}"` });
      return fixed;
    }

    const isStrongVerb = IMPACT_VERBS.some(v => v.toLowerCase() === firstWord);
    if (!isStrongVerb && firstWord) {
      let newVerb = IMPACT_VERBS.find(v => !usedVerbs.has(v.toLowerCase())) || IMPACT_VERBS[0];
      usedVerbs.add(newVerb.toLowerCase());
      fixed = `${newVerb} ${fixed.charAt(0).toLowerCase()}${fixed.slice(1)}`;
      changes.push({ parameterId: 14, section, before: bullet, after: fixed, description: `Added strong action verb "${newVerb}"` });
    } else if (firstWord) {
      usedVerbs.add(firstWord);
    }

    return fixed;
  };

  resume.workExperience?.forEach(exp => {
    exp.bullets = exp.bullets?.map(b => fixBullet(b, 'experience')) || [];
  });
  resume.projects?.forEach(proj => {
    proj.bullets = proj.bullets?.map(b => fixBullet(b, 'projects')) || [];
  });

  return changes;
}

function fixVerbRepetition(resume: ResumeData): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  const verbCounts: Record<string, number> = {};
  const allBulletRefs: { bullet: string; container: { bullets?: string[] }; idx: number; section: string }[] = [];

  resume.workExperience?.forEach(exp => {
    exp.bullets?.forEach((b, idx) => {
      const firstWord = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
      if (firstWord) verbCounts[firstWord] = (verbCounts[firstWord] || 0) + 1;
      allBulletRefs.push({ bullet: b, container: exp, idx, section: 'experience' });
    });
  });
  resume.projects?.forEach(proj => {
    proj.bullets?.forEach((b, idx) => {
      const firstWord = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
      if (firstWord) verbCounts[firstWord] = (verbCounts[firstWord] || 0) + 1;
      allBulletRefs.push({ bullet: b, container: proj, idx, section: 'projects' });
    });
  });

  const usedReplacements = new Set<string>();
  const overusedVerbs = Object.entries(verbCounts).filter(([_, count]) => count > 2).map(([verb]) => verb);

  overusedVerbs.forEach(verb => {
    let replacementsNeeded = verbCounts[verb] - 1;
    allBulletRefs.forEach(ref => {
      if (replacementsNeeded <= 0) return;
      const firstWord = ref.bullet.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
      if (firstWord !== verb) return;

      const replacement = IMPACT_VERBS.find(v =>
        v.toLowerCase() !== verb && !usedReplacements.has(v.toLowerCase())
      );
      if (!replacement) return;

      usedReplacements.add(replacement.toLowerCase());
      const newBullet = replacement + ref.bullet.slice(firstWord.length);
      if (ref.container.bullets) {
        ref.container.bullets[ref.idx] = newBullet;
      }
      changes.push({ parameterId: 15, section: ref.section, before: ref.bullet, after: newBullet, description: `Diversified repeated verb "${verb}" to "${replacement}"` });
      replacementsNeeded--;
    });
  });

  return changes;
}

function removePassiveVoice(resume: ResumeData): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  const passivePattern = /\b(was|were|been|being|is|are)\s+(\w+ed)\b/gi;

  const fixBullet = (bullet: string, section: string): string => {
    if (!passivePattern.test(bullet)) return bullet;
    passivePattern.lastIndex = 0;

    const fixed = bullet.replace(passivePattern, (_match, _aux, verb) => {
      return verb.charAt(0).toUpperCase() + verb.slice(1);
    });

    if (fixed !== bullet) {
      changes.push({ parameterId: 16, section, before: bullet, after: fixed, description: 'Converted passive voice to active voice' });
    }
    return fixed;
  };

  resume.workExperience?.forEach(exp => {
    exp.bullets = exp.bullets?.map(b => fixBullet(b, 'experience')) || [];
  });
  resume.projects?.forEach(proj => {
    proj.bullets = proj.bullets?.map(b => fixBullet(b, 'projects')) || [];
  });

  return changes;
}

function removeVaguePhrases(resume: ResumeData): OptimizationChange[] {
  const changes: OptimizationChange[] = [];

  const fixBullet = (bullet: string, section: string): string => {
    let fixed = bullet;
    for (const [vague, replacement] of Object.entries(VAGUE_PHRASES)) {
      const regex = new RegExp(vague, 'gi');
      if (regex.test(fixed)) {
        fixed = fixed.replace(regex, replacement);
        changes.push({ parameterId: 13, section, before: bullet, after: fixed, description: `Replaced "${vague}" with "${replacement}"` });
      }
    }
    return fixed;
  };

  resume.workExperience?.forEach(exp => {
    exp.bullets = exp.bullets?.map(b => fixBullet(b, 'experience')) || [];
  });
  resume.projects?.forEach(proj => {
    proj.bullets = proj.bullets?.map(b => fixBullet(b, 'projects')) || [];
  });

  return changes;
}

function addMissingKeywords(resume: ResumeData, jobDescription: string): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  const jdLower = jobDescription.toLowerCase();
  const resumeText = [
    resume.summary || '',
    ...(resume.skills?.flatMap(s => s.list) || []),
    ...(resume.workExperience?.flatMap(e => e.bullets || []) || []),
    ...(resume.projects?.flatMap(p => [...(p.bullets || []), ...(p.techStack || [])]) || []),
  ].join(' ').toLowerCase();

  const techSkills = new Set([
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    'react', 'angular', 'vue', 'svelte', 'next.js', 'node.js', 'express', 'django', 'flask', 'spring',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd',
    'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'firebase',
    'git', 'github', 'jira', 'figma', 'postman', 'linux', 'nginx',
    'jest', 'cypress', 'selenium', 'pytest',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch',
    'graphql', 'rest', 'microservices', 'webpack', 'vite', 'tailwind', 'bootstrap',
  ]);

  const missingSkills: string[] = [];
  techSkills.forEach(skill => {
    if (jdLower.includes(skill) && !resumeText.includes(skill)) {
      missingSkills.push(skill);
    }
  });

  if (missingSkills.length === 0) return changes;

  if (!resume.skills) resume.skills = [];
  let techCategory = resume.skills.find(s => s.category.toLowerCase().includes('technical') || s.category.toLowerCase() === 'tools & platforms');
  if (!techCategory) {
    techCategory = { category: 'Technical Skills', count: 0, list: [] };
    resume.skills.push(techCategory);
  }

  const existingLower = new Set(techCategory.list.map(s => s.toLowerCase()));
  missingSkills.forEach(skill => {
    if (existingLower.has(skill)) return;
    const formatted = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    techCategory!.list.push(formatted);
    techCategory!.count = techCategory!.list.length;
    existingLower.add(skill);
    changes.push({ parameterId: 6, section: 'skills', before: '', after: formatted, description: `Added missing JD keyword "${formatted}" to skills` });
  });

  if (resume.summary && missingSkills.length > 0) {
    const topMissing = missingSkills.slice(0, 3).map(s => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    const oldSummary = resume.summary;
    resume.summary = `${resume.summary.replace(/\.?\s*$/, '')}. Proficient in ${topMissing.join(', ')}.`;
    changes.push({ parameterId: 10, section: 'summary', before: oldSummary, after: resume.summary, description: `Integrated ${topMissing.length} keywords into summary` });
  }

  return changes;
}

async function addMetricsWithAI(resume: ResumeData): Promise<OptimizationChange[]> {
  const changes: OptimizationChange[] = [];
  const metricPattern = /\d+%|\$\d+|\d+\s*(users?|customers?|clients?|million|k\b|x\b|hrs?|hours?|days?|requests?)/i;

  const bulletsToFix: { bullet: string; role: string }[] = [];
  resume.workExperience?.forEach(exp => {
    exp.bullets?.forEach(b => {
      if (!metricPattern.test(b)) bulletsToFix.push({ bullet: b, role: exp.role });
    });
  });
  resume.projects?.forEach(p => {
    p.bullets?.forEach(b => {
      if (!metricPattern.test(b)) bulletsToFix.push({ bullet: b, role: p.title });
    });
  });

  if (bulletsToFix.length === 0) return changes;

  const bulletsText = bulletsToFix.slice(0, 10).map((b, i) => `${i + 1}. [${b.role}] ${b.bullet}`).join('\n');

  try {
    const prompt = `Add realistic, measurable metrics to these resume bullets. Keep the original meaning. Return ONLY a JSON array of objects with "original" and "improved" keys.

Bullets:
${bulletsText}

Rules:
- Add specific numbers, percentages, or quantifiable outcomes
- Keep improvements realistic and believable
- Preserve the original meaning and context
- Return valid JSON array only`;

    const response = await openrouter.chatWithSystem(
      'You are a resume optimization expert. Return only valid JSON.',
      prompt,
      { temperature: 0.3, maxTokens: 2000 }
    );

    const cleaned = response.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    const improvements = JSON.parse(cleaned) as Array<{ original: string; improved: string }>;

    improvements.forEach(imp => {
      if (!imp.original || !imp.improved || imp.original === imp.improved) return;

      resume.workExperience?.forEach(exp => {
        exp.bullets = exp.bullets?.map(b => {
          if (b.trim() === imp.original.trim()) {
            changes.push({ parameterId: 11, section: 'experience', before: b, after: imp.improved, description: 'Added measurable metrics via AI' });
            return imp.improved;
          }
          return b;
        }) || [];
      });

      resume.projects?.forEach(proj => {
        proj.bullets = proj.bullets?.map(b => {
          if (b.trim() === imp.original.trim()) {
            changes.push({ parameterId: 11, section: 'projects', before: b, after: imp.improved, description: 'Added measurable metrics via AI' });
            return imp.improved;
          }
          return b;
        }) || [];
      });
    });
  } catch (err) {
    console.warn('AI metric enhancement failed, using fallback:', err);
    const fallbackMetrics = [
      'improving efficiency by 35%', 'reducing processing time by 40%',
      'achieving 99.5% uptime', 'serving 5K+ users', 'with 90% test coverage',
      'reducing costs by 20%', 'increasing throughput by 45%',
    ];
    let metricIdx = 0;
    resume.workExperience?.forEach(exp => {
      exp.bullets = exp.bullets?.map(b => {
        if (metricPattern.test(b)) return b;
        const old = b;
        const metric = fallbackMetrics[metricIdx % fallbackMetrics.length];
        metricIdx++;
        const fixed = `${b.replace(/\.?\s*$/, '')}, ${metric}.`;
        changes.push({ parameterId: 11, section: 'experience', before: old, after: fixed, description: 'Added fallback metrics' });
        return fixed;
      }) || [];
    });
  }

  return changes;
}

function addPerformanceWords(resume: ResumeData): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  const perfWords = /\b(improved|reduced|optimized|increased|enhanced|decreased|streamlined|accelerated|boosted|maximized|minimized|eliminated|saved|generated|grew|expanded|automated|simplified|transformed)\b/i;

  const enhancers = ['resulting in improved', 'effectively optimizing', 'successfully enhancing', 'significantly reducing', 'demonstrably increasing'];
  let enhancerIdx = 0;

  const fixBullet = (bullet: string, section: string): string => {
    if (perfWords.test(bullet)) return bullet;
    const enhancer = enhancers[enhancerIdx % enhancers.length];
    enhancerIdx++;
    const fixed = `${bullet.replace(/\.?\s*$/, '')}, ${enhancer} overall outcomes.`;
    changes.push({ parameterId: 12, section, before: bullet, after: fixed, description: 'Added performance language' });
    return fixed;
  };

  resume.workExperience?.forEach(exp => {
    exp.bullets = exp.bullets?.map(b => fixBullet(b, 'experience')) || [];
  });

  resume.projects?.forEach(proj => {
    proj.bullets = proj.bullets?.map(b => fixBullet(b, 'projects')) || [];
  });

  return changes;
}

function fixBulletFormatting(resume: ResumeData): OptimizationChange[] {
  const changes: OptimizationChange[] = [];

  const fix = (bullet: string, section: string): string => {
    let fixed = bullet.replace(/\s{2,}/g, ' ').trim();
    if (fixed[0] && fixed[0] !== fixed[0].toUpperCase()) {
      fixed = fixed[0].toUpperCase() + fixed.slice(1);
    }
    if (!fixed.endsWith('.') && !fixed.endsWith('!') && !fixed.endsWith('?')) {
      fixed = fixed + '.';
    }
    fixed = fixed.replace(/\.{2,}/g, '.').replace(/\s+\./g, '.');

    if (fixed !== bullet) {
      changes.push({ parameterId: 4, section, before: bullet, after: fixed, description: 'Fixed bullet formatting' });
    }
    return fixed;
  };

  resume.workExperience?.forEach(exp => {
    exp.bullets = exp.bullets?.map(b => fix(b, 'experience')) || [];
  });
  resume.projects?.forEach(proj => {
    proj.bullets = proj.bullets?.map(b => fix(b, 'projects')) || [];
  });

  return changes;
}

function addProjectTechStacks(resume: ResumeData, jobDescription: string): OptimizationChange[] {
  const changes: OptimizationChange[] = [];
  const jdLower = jobDescription.toLowerCase();
  const techSkills = [
    'react', 'react.js', 'next.js', 'nextjs', 'vue', 'vue.js', 'angular', 'svelte',
    'node.js', 'nodejs', 'express', 'express.js', 'fastify', 'nestjs',
    'python', 'django', 'flask', 'fastapi',
    'java', 'spring', 'spring boot', 'springboot',
    'typescript', 'javascript', 'go', 'golang', 'rust', 'c++', 'c#', '.net',
    'aws', 'azure', 'gcp', 'google cloud',
    'docker', 'kubernetes', 'k8s', 'terraform', 'jenkins', 'ci/cd',
    'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'graphql', 'rest', 'restful', 'grpc',
    'jest', 'cypress', 'selenium', 'pytest',
    'kafka', 'rabbitmq', 'microservices',
    'html', 'css', 'tailwind', 'sass', 'bootstrap',
    'git', 'github', 'gitlab', 'jira', 'agile', 'scrum',
    'sql', 'nosql', 'firebase', 'supabase',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp',
    'linux', 'nginx', 'apache'
  ];
  const jdTech = techSkills.filter(t => jdLower.includes(t));

  const capitalize = (t: string) => t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  resume.projects?.forEach(proj => {
    const projectText = [proj.title, ...(proj.bullets || []), ...(proj.techStack || [])].join(' ').toLowerCase();
    const missingTech = jdTech.filter(t => !projectText.includes(t));

    if (!proj.techStack || proj.techStack.length === 0) {
      const relevantTech = jdTech.filter(t => projectText.includes(t));
      if (relevantTech.length > 0) {
        proj.techStack = relevantTech.map(capitalize);
      } else if (jdTech.length > 0) {
        proj.techStack = jdTech.slice(0, 4).map(capitalize);
      }
      if (proj.techStack && proj.techStack.length > 0) {
        changes.push({ parameterId: 20, section: 'projects', before: '', after: proj.techStack.join(', '), description: `Added tech stack to "${proj.title}"` });
      }
    } else if (missingTech.length > 0) {
      const toAdd = missingTech.slice(0, 3).map(capitalize);
      const before = proj.techStack.join(', ');
      proj.techStack = [...proj.techStack, ...toAdd];
      changes.push({ parameterId: 20, section: 'projects', before, after: proj.techStack.join(', '), description: `Extended tech stack for "${proj.title}"` });
    }

    if (missingTech.length > 0 && proj.bullets && proj.bullets.length > 0) {
      const techToMention = missingTech.slice(0, 2).map(capitalize);
      const lastBulletIdx = proj.bullets.length - 1;
      const originalBullet = proj.bullets[lastBulletIdx];
      const techStr = techToMention.join(' and ');
      proj.bullets[lastBulletIdx] = `${originalBullet.replace(/\.?\s*$/, '')}, leveraging ${techStr}.`;
      changes.push({ parameterId: 19, section: 'projects', before: originalBullet, after: proj.bullets[lastBulletIdx], description: `Added JD skills to project bullet in "${proj.title}"` });
    }
  });

  return changes;
}

export async function optimizeByParameter(
  resume: ResumeData,
  jobDescription: string,
  gaps: GapItem[]
): Promise<TargetedOptimizationResult> {
  const optimized = JSON.parse(JSON.stringify(resume)) as ResumeData;
  const allChanges: OptimizationChange[] = [];
  const parametersFixed: number[] = [];

  const gapIds = new Set(gaps.map(g => g.parameterId));

  if (gapIds.has(13) || gapIds.has(14)) {
    allChanges.push(...removeVaguePhrases(optimized));
    allChanges.push(...fixWeakVerbs(optimized));
    parametersFixed.push(13, 14);
  }

  if (gapIds.has(15)) {
    allChanges.push(...fixVerbRepetition(optimized));
    parametersFixed.push(15);
  }

  if (gapIds.has(16)) {
    allChanges.push(...removePassiveVoice(optimized));
    parametersFixed.push(16);
  }

  if (gapIds.has(6) || gapIds.has(7) || gapIds.has(8) || gapIds.has(10)) {
    allChanges.push(...addMissingKeywords(optimized, jobDescription));
    parametersFixed.push(6, 7, 8, 10);
  }

  if (gapIds.has(11)) {
    const metricChanges = await addMetricsWithAI(optimized);
    allChanges.push(...metricChanges);
    parametersFixed.push(11);
  }

  if (gapIds.has(12)) {
    allChanges.push(...addPerformanceWords(optimized));
    parametersFixed.push(12);
  }

  if (gapIds.has(4)) {
    allChanges.push(...fixBulletFormatting(optimized));
    parametersFixed.push(4);
  }

  if (gapIds.has(19) || gapIds.has(20)) {
    allChanges.push(...addProjectTechStacks(optimized, jobDescription));
    parametersFixed.push(19, 20);
  }

  return {
    optimizedResume: optimized,
    changes: allChanges,
    parametersFixed: [...new Set(parametersFixed)],
  };
}
