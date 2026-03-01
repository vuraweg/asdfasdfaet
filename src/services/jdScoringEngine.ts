import { ResumeData } from '../types/resume';

export interface ParameterScore {
  id: number;
  name: string;
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  suggestions: string[];
  fixable: boolean;
  fixType: 'ai' | 'user_input' | 'none';
}

export interface CategoryScore {
  name: string;
  weight: number;
  parameters: ParameterScore[];
  score: number;
  maxScore: number;
  percentage: number;
}

export interface JDScoringResult {
  overallScore: number;
  categories: CategoryScore[];
  parameters: ParameterScore[];
  matchBand: string;
  interviewProbability: string;
  fixableCount: number;
  nonFixableCount: number;
}

interface JDAnalysis {
  hardSkills: string[];
  softSkills: string[];
  tools: string[];
  roleKeywords: string[];
  seniorityLevel: string;
  yearsRequired: number;
  responsibilities: string[];
}

const TECH_SKILLS = new Set([
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'sql', 'bash', 'shell',
  'react', 'react.js', 'angular', 'vue', 'vue.js', 'svelte', 'next.js', 'nextjs', 'nuxt', 'gatsby', 'html', 'html5', 'css', 'css3', 'sass', 'scss', 'tailwind', 'bootstrap', 'material-ui', 'redux', 'mobx', 'webpack', 'vite',
  'node.js', 'nodejs', 'express', 'nestjs', 'django', 'flask', 'fastapi', 'spring', 'spring boot', '.net', 'rails', 'laravel', 'graphql', 'rest', 'restful', 'microservices',
  'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'sqlite', 'oracle', 'firebase', 'supabase',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'ci/cd', 'github actions', 'gitlab', 'circleci',
  'jest', 'mocha', 'cypress', 'selenium', 'playwright', 'pytest', 'junit',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn', 'jupyter', 'spark', 'hadoop', 'kafka',
  'git', 'github', 'jira', 'confluence', 'figma', 'postman', 'swagger', 'linux', 'nginx',
]);

const TOOL_KEYWORDS = new Set([
  'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'github actions', 'gitlab', 'circleci',
  'aws', 'azure', 'gcp', 'jira', 'confluence', 'figma', 'postman', 'swagger', 'vscode',
  'webpack', 'vite', 'babel', 'eslint', 'prettier', 'npm', 'yarn', 'pnpm',
  'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'firebase', 'supabase',
  'nginx', 'apache', 'linux', 'git', 'github', 'gitlab', 'bitbucket',
]);

const SOFT_SKILLS_LIST = [
  'communication', 'teamwork', 'collaboration', 'leadership', 'problem-solving',
  'problem solving', 'critical thinking', 'time management', 'adaptability',
  'flexibility', 'creativity', 'attention to detail', 'organization', 'interpersonal',
  'negotiation', 'conflict resolution', 'decision making', 'self-motivated', 'initiative',
  'presentation', 'public speaking', 'mentoring', 'coaching', 'customer service',
  'stakeholder management', 'cross-functional', 'agile', 'scrum', 'project management',
];

const IMPACT_VERBS = new Set([
  'achieved', 'exceeded', 'surpassed', 'attained', 'accomplished', 'delivered', 'generated', 'produced',
  'spearheaded', 'led', 'directed', 'orchestrated', 'championed', 'pioneered', 'drove', 'headed',
  'engineered', 'architected', 'developed', 'built', 'designed', 'implemented', 'created', 'constructed',
  'optimized', 'enhanced', 'streamlined', 'accelerated', 'transformed', 'revamped', 'modernized', 'boosted',
  'analyzed', 'evaluated', 'assessed', 'identified', 'diagnosed', 'investigated', 'researched', 'discovered',
  'collaborated', 'partnered', 'coordinated', 'facilitated', 'unified', 'integrated', 'aligned',
  'managed', 'oversaw', 'supervised', 'administered', 'controlled', 'governed', 'maintained', 'regulated',
  'innovated', 'invented', 'conceptualized', 'devised', 'formulated', 'established', 'introduced', 'launched',
]);

const VAGUE_PHRASES = [
  'responsible for', 'worked on', 'helped with', 'involved in', 'participated in',
  'was part of', 'assisted with', 'handled', 'dealt with', 'took care of',
];

const PASSIVE_PATTERNS = [
  /\bwas\s+\w+ed\b/i, /\bwere\s+\w+ed\b/i, /\bbeen\s+\w+ed\b/i,
  /\bbeing\s+\w+ed\b/i, /\bis\s+\w+ed\b/i, /\bare\s+\w+ed\b/i,
];

function getFullResumeText(resume: ResumeData): string {
  const parts: string[] = [];
  if (resume.summary) parts.push(resume.summary);
  if (resume.careerObjective) parts.push(resume.careerObjective);
  resume.workExperience?.forEach(exp => {
    parts.push(`${exp.role} ${exp.company}`);
    exp.bullets?.forEach(b => parts.push(b));
  });
  resume.projects?.forEach(p => {
    parts.push(p.title);
    p.bullets?.forEach(b => parts.push(b));
    if (p.techStack) parts.push(p.techStack.join(', '));
  });
  resume.skills?.forEach(s => parts.push(s.list.join(', ')));
  resume.education?.forEach(e => parts.push(`${e.degree} ${e.school}`));
  resume.certifications?.forEach(c => {
    if (typeof c === 'string') parts.push(c);
    else parts.push(`${c.title} ${c.description}`);
  });
  return parts.join(' ');
}

function getAllBullets(resume: ResumeData): string[] {
  const bullets: string[] = [];
  resume.workExperience?.forEach(exp => exp.bullets?.forEach(b => bullets.push(b)));
  resume.projects?.forEach(p => p.bullets?.forEach(b => bullets.push(b)));
  return bullets;
}

function analyzeJD(jd: string): JDAnalysis {
  const jdLower = jd.toLowerCase();

  const hardSkills: string[] = [];
  TECH_SKILLS.forEach(skill => {
    if (jdLower.includes(skill)) hardSkills.push(skill);
  });

  const tools: string[] = [];
  TOOL_KEYWORDS.forEach(tool => {
    if (jdLower.includes(tool)) tools.push(tool);
  });

  const softSkills: string[] = [];
  SOFT_SKILLS_LIST.forEach(skill => {
    if (jdLower.includes(skill)) softSkills.push(skill);
  });

  const roleKeywords: string[] = [];
  const roleMatches = jd.match(/\b(engineer|developer|architect|lead|senior|junior|manager|analyst|specialist|consultant|designer|devops|sre|full.?stack|front.?end|back.?end|data|software|web|mobile)\b/gi) || [];
  roleMatches.forEach(m => {
    const n = m.toLowerCase();
    if (!roleKeywords.includes(n)) roleKeywords.push(n);
  });

  let seniorityLevel = 'mid';
  if (/\b(principal|staff|distinguished|director)\b/i.test(jd)) seniorityLevel = 'principal';
  else if (/\b(lead|tech lead|team lead)\b/i.test(jd)) seniorityLevel = 'lead';
  else if (/\b(senior|sr\.?)\b/i.test(jd)) seniorityLevel = 'senior';
  else if (/\b(junior|jr\.?|entry|fresher|graduate|intern)\b/i.test(jd)) seniorityLevel = 'entry';

  const yearsMatch = jd.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i);
  const yearsRequired = yearsMatch ? parseInt(yearsMatch[1]) : 0;

  const responsibilities: string[] = [];
  const respPatterns = /(?:responsible for|will be|you will|duties include)[:\s]*([^.]+)/gi;
  let respMatch;
  while ((respMatch = respPatterns.exec(jd)) !== null) {
    responsibilities.push(respMatch[1].trim());
  }

  return {
    hardSkills: [...new Set(hardSkills)],
    softSkills: [...new Set(softSkills)],
    tools: [...new Set(tools)],
    roleKeywords: [...new Set(roleKeywords)],
    seniorityLevel,
    yearsRequired,
    responsibilities,
  };
}

function scoreP1SingleColumn(resume: ResumeData): ParameterScore {
  let score = 10;
  const suggestions: string[] = [];
  const text = getFullResumeText(resume);
  if (/\t{2,}/.test(text) || /\|/.test(text)) {
    score -= 5;
    suggestions.push('Use single-column layout for ATS compatibility');
  }
  return { id: 1, name: 'Single Column Detection', category: 'ATS Compatibility', score, maxScore: 10, percentage: Math.round((score / 10) * 100), suggestions, fixable: false, fixType: 'none' };
}

function scoreP2NoTablesImages(resume: ResumeData): ParameterScore {
  let score = 10;
  const suggestions: string[] = [];
  const text = getFullResumeText(resume);
  if (/\[image\]|\[icon\]|\[table\]/i.test(text)) {
    score -= 5;
    suggestions.push('Remove tables, images, and icons for ATS parsing');
  }
  return { id: 2, name: 'No Tables/Images/Icons', category: 'ATS Compatibility', score, maxScore: 10, percentage: Math.round((score / 10) * 100), suggestions, fixable: false, fixType: 'none' };
}

function scoreP3StandardHeadings(resume: ResumeData): ParameterScore {
  let score = 0;
  const maxScore = 10;
  const suggestions: string[] = [];
  const hasExp = (resume.workExperience?.length || 0) > 0;
  const hasEdu = (resume.education?.length || 0) > 0;
  const hasSkills = (resume.skills?.length || 0) > 0;
  const hasProjects = (resume.projects?.length || 0) > 0;
  const hasSummary = !!resume.summary && resume.summary.length > 20;

  if (hasExp) score += 2;
  else suggestions.push('Add Work Experience section');
  if (hasEdu) score += 2;
  else suggestions.push('Add Education section');
  if (hasSkills) score += 2;
  else suggestions.push('Add Skills section');
  if (hasProjects) score += 2;
  else suggestions.push('Add Projects section');
  if (hasSummary) score += 2;
  else suggestions.push('Add Summary/Objective section');

  return { id: 3, name: 'Standard Section Headings', category: 'ATS Compatibility', score, maxScore, percentage: Math.round((score / maxScore) * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP4BulletFormatting(resume: ResumeData): ParameterScore {
  let score = 0;
  const maxScore = 10;
  const suggestions: string[] = [];
  const bullets = getAllBullets(resume);
  if (bullets.length === 0) {
    suggestions.push('Add bullet points to experience and projects');
    return { id: 4, name: 'Proper Bullet Formatting', category: 'ATS Compatibility', score: 0, maxScore, percentage: 0, suggestions, fixable: true, fixType: 'ai' };
  }

  const wellFormatted = bullets.filter(b => {
    const trimmed = b.trim();
    return trimmed.length >= 20 && trimmed.length <= 300 && /^[A-Z]/.test(trimmed);
  }).length;

  score = Math.round((wellFormatted / bullets.length) * maxScore);
  if (score < maxScore) suggestions.push('Ensure bullets are 20-300 chars, start with capital letter');

  return { id: 4, name: 'Proper Bullet Formatting', category: 'ATS Compatibility', score, maxScore, percentage: Math.round((score / maxScore) * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP5PdfParsingSafety(resume: ResumeData): ParameterScore {
  let score = 8;
  const suggestions: string[] = [];
  const text = getFullResumeText(resume);
  if (text.length < 200) {
    score = 3;
    suggestions.push('Resume text appears too short, may have parsing issues');
  }
  return { id: 5, name: 'PDF Parsing Safety', category: 'ATS Compatibility', score, maxScore: 10, percentage: Math.round((score / 10) * 100), suggestions, fixable: false, fixType: 'none' };
}

function scoreP6HardSkillMatch(resume: ResumeData, jdAnalysis: JDAnalysis): ParameterScore {
  const maxScore = 15;
  const suggestions: string[] = [];
  const resumeText = getFullResumeText(resume).toLowerCase();
  const resumeSkills = resume.skills?.flatMap(s => s.list.map(sk => sk.toLowerCase())) || [];
  const combined = resumeText + ' ' + resumeSkills.join(' ');

  if (jdAnalysis.hardSkills.length === 0) {
    return { id: 6, name: 'JD Hard Skill Match %', category: 'Keyword Alignment', score: maxScore, maxScore, percentage: 100, suggestions, fixable: false, fixType: 'none' };
  }

  const matched = jdAnalysis.hardSkills.filter(s => combined.includes(s.toLowerCase()));
  const matchPct = matched.length / jdAnalysis.hardSkills.length;
  const score = Math.round(matchPct * maxScore);
  const missing = jdAnalysis.hardSkills.filter(s => !combined.includes(s.toLowerCase()));
  if (missing.length > 0) suggestions.push(`Missing hard skills: ${missing.slice(0, 5).join(', ')}`);

  return { id: 6, name: 'JD Hard Skill Match %', category: 'Keyword Alignment', score, maxScore, percentage: Math.round(matchPct * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP7ToolMatch(resume: ResumeData, jdAnalysis: JDAnalysis): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const resumeText = getFullResumeText(resume).toLowerCase();

  if (jdAnalysis.tools.length === 0) {
    return { id: 7, name: 'JD Tool Match %', category: 'Keyword Alignment', score: maxScore, maxScore, percentage: 100, suggestions, fixable: false, fixType: 'none' };
  }

  const matched = jdAnalysis.tools.filter(t => resumeText.includes(t.toLowerCase()));
  const matchPct = matched.length / jdAnalysis.tools.length;
  const score = Math.round(matchPct * maxScore);
  const missing = jdAnalysis.tools.filter(t => !resumeText.includes(t.toLowerCase()));
  if (missing.length > 0) suggestions.push(`Missing tools: ${missing.slice(0, 5).join(', ')}`);

  return { id: 7, name: 'JD Tool Match %', category: 'Keyword Alignment', score, maxScore, percentage: Math.round(matchPct * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP8MandatorySkillPresence(resume: ResumeData, jdAnalysis: JDAnalysis): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const resumeText = getFullResumeText(resume).toLowerCase();
  const mandatory = jdAnalysis.hardSkills.slice(0, 5);

  if (mandatory.length === 0) {
    return { id: 8, name: 'Mandatory Skill Presence', category: 'Keyword Alignment', score: maxScore, maxScore, percentage: 100, suggestions, fixable: false, fixType: 'none' };
  }

  const matched = mandatory.filter(s => resumeText.includes(s.toLowerCase()));
  const matchPct = matched.length / mandatory.length;
  const score = Math.round(matchPct * maxScore);
  const missing = mandatory.filter(s => !resumeText.includes(s.toLowerCase()));
  if (missing.length > 0) suggestions.push(`Missing mandatory skills: ${missing.join(', ')}`);

  return { id: 8, name: 'Mandatory Skill Presence', category: 'Keyword Alignment', score, maxScore, percentage: Math.round(matchPct * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP9RoleTitleAlignment(resume: ResumeData, jdAnalysis: JDAnalysis): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const roles = resume.workExperience?.map(e => e.role?.toLowerCase() || '') || [];
  const allRolesText = roles.join(' ') + ' ' + (resume.targetRole?.toLowerCase() || '');

  const matchingKeywords = jdAnalysis.roleKeywords.filter(kw => allRolesText.includes(kw));
  let score = Math.min(matchingKeywords.length * 2, 6);

  const seniorityTerms: Record<string, string[]> = {
    'entry': ['junior', 'intern', 'associate', 'trainee'],
    'mid': ['developer', 'engineer', 'analyst'],
    'senior': ['senior', 'sr', 'lead'],
    'lead': ['lead', 'principal', 'staff', 'architect'],
    'principal': ['principal', 'staff', 'distinguished', 'director'],
  };
  const expectedTerms = seniorityTerms[jdAnalysis.seniorityLevel] || [];
  if (expectedTerms.some(term => allRolesText.includes(term))) score += 4;
  else suggestions.push(`Align role titles with ${jdAnalysis.seniorityLevel} level`);

  score = Math.min(score, maxScore);
  return { id: 9, name: 'Role Title Alignment', category: 'Keyword Alignment', score, maxScore, percentage: Math.round((score / maxScore) * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP10KeywordDensityBalance(resume: ResumeData, jdAnalysis: JDAnalysis): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const resumeText = getFullResumeText(resume).toLowerCase();
  const words = resumeText.split(/\s+/);
  const totalWords = words.length;

  if (totalWords < 50 || jdAnalysis.hardSkills.length === 0) {
    return { id: 10, name: 'Keyword Density Balance', category: 'Keyword Alignment', score: 5, maxScore, percentage: 50, suggestions: ['Add more content'], fixable: true, fixType: 'ai' };
  }

  let score = maxScore;
  const keywordCounts: Record<string, number> = {};
  jdAnalysis.hardSkills.forEach(kw => {
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    keywordCounts[kw] = (resumeText.match(regex) || []).length;
  });

  const maxRepetition = Math.max(...Object.values(keywordCounts), 0);
  if (maxRepetition > 8) {
    score -= 4;
    suggestions.push('Some keywords appear too many times - avoid stuffing');
  } else if (maxRepetition > 5) {
    score -= 2;
  }

  const matchedKeywords = Object.values(keywordCounts).filter(c => c > 0).length;
  const coverage = matchedKeywords / jdAnalysis.hardSkills.length;
  if (coverage < 0.5) {
    score -= 3;
    suggestions.push('Increase keyword coverage across the resume');
  }

  score = Math.max(0, Math.min(score, maxScore));
  return { id: 10, name: 'Keyword Density Balance', category: 'Keyword Alignment', score, maxScore, percentage: Math.round((score / maxScore) * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP11MetricDensity(resume: ResumeData): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const bullets = getAllBullets(resume);
  if (bullets.length === 0) {
    return { id: 11, name: 'Measurable Metrics %', category: 'Impact & Metrics', score: 0, maxScore, percentage: 0, suggestions: ['Add quantified results'], fixable: true, fixType: 'ai' };
  }

  const metricPattern = /\d+%|\$\d+|\d+\s*(users?|customers?|clients?|team|people|million|k\b|x\b|hrs?|hours?|days?|weeks?|months?|requests?|transactions?|records?)/i;
  const withMetrics = bullets.filter(b => metricPattern.test(b));
  const pct = withMetrics.length / bullets.length;
  const score = Math.round(pct * maxScore);
  if (pct < 0.5) suggestions.push('Add measurable metrics to more bullets');

  return { id: 11, name: 'Measurable Metrics %', category: 'Impact & Metrics', score, maxScore, percentage: Math.round(pct * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP12PerformanceWords(resume: ResumeData): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const bullets = getAllBullets(resume);
  if (bullets.length === 0) {
    return { id: 12, name: 'Performance Words', category: 'Impact & Metrics', score: 0, maxScore, percentage: 0, suggestions: ['Add performance-oriented bullets'], fixable: true, fixType: 'ai' };
  }

  const perfWords = /\b(improved|reduced|optimized|increased|enhanced|decreased|streamlined|accelerated|boosted|maximized|minimized|eliminated|saved|generated|grew|expanded|automated|simplified|transformed)\b/i;
  const withPerfWords = bullets.filter(b => perfWords.test(b));
  const pct = withPerfWords.length / bullets.length;
  const score = Math.round(pct * maxScore);
  if (pct < 0.4) suggestions.push('Use more performance words like improved, reduced, optimized');

  return { id: 12, name: 'Performance Words', category: 'Impact & Metrics', score, maxScore, percentage: Math.round(pct * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP13NoVaguePhrases(resume: ResumeData): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const bullets = getAllBullets(resume);
  if (bullets.length === 0) {
    return { id: 13, name: 'No Vague Phrases', category: 'Impact & Metrics', score: maxScore, maxScore, percentage: 100, suggestions, fixable: true, fixType: 'ai' };
  }

  const vagueCount = bullets.filter(b => VAGUE_PHRASES.some(v => b.toLowerCase().includes(v))).length;
  const cleanPct = 1 - (vagueCount / bullets.length);
  const score = Math.round(cleanPct * maxScore);
  if (vagueCount > 0) suggestions.push(`Remove vague phrases from ${vagueCount} bullet(s)`);

  return { id: 13, name: 'No Vague Phrases', category: 'Impact & Metrics', score, maxScore, percentage: Math.round(cleanPct * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP14StrongActionVerbs(resume: ResumeData): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const bullets = getAllBullets(resume);
  if (bullets.length === 0) {
    return { id: 14, name: 'Strong Action Verbs', category: 'Verb Strength & Diversity', score: 0, maxScore, percentage: 0, suggestions: ['Add bullet points starting with action verbs'], fixable: true, fixType: 'ai' };
  }

  const withActionVerb = bullets.filter(b => {
    const firstWord = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
    return IMPACT_VERBS.has(firstWord);
  });
  const pct = withActionVerb.length / bullets.length;
  const score = Math.round(pct * maxScore);
  if (pct < 0.6) suggestions.push('Start more bullets with strong action verbs');

  return { id: 14, name: 'Strong Action Verbs', category: 'Verb Strength & Diversity', score, maxScore, percentage: Math.round(pct * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP15VerbRepetition(resume: ResumeData): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const bullets = getAllBullets(resume);
  if (bullets.length < 3) {
    return { id: 15, name: 'No Verb Repetition Dominance', category: 'Verb Strength & Diversity', score: 8, maxScore, percentage: 80, suggestions, fixable: true, fixType: 'ai' };
  }

  const firstVerbs: Record<string, number> = {};
  bullets.forEach(b => {
    const firstWord = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
    if (firstWord) firstVerbs[firstWord] = (firstVerbs[firstWord] || 0) + 1;
  });

  const maxVerbCount = Math.max(...Object.values(firstVerbs), 0);
  const dominanceRatio = maxVerbCount / bullets.length;
  let score = maxScore;
  if (dominanceRatio > 0.4) {
    score -= 5;
    const dominant = Object.entries(firstVerbs).sort((a, b) => b[1] - a[1])[0];
    suggestions.push(`"${dominant[0]}" used ${dominant[1]} times - diversify starting verbs`);
  } else if (dominanceRatio > 0.25) {
    score -= 2;
  }

  score = Math.max(0, score);
  return { id: 15, name: 'No Verb Repetition Dominance', category: 'Verb Strength & Diversity', score, maxScore, percentage: Math.round((score / maxScore) * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP16NoPassiveVoice(resume: ResumeData): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const bullets = getAllBullets(resume);
  if (bullets.length === 0) {
    return { id: 16, name: 'No Passive Voice', category: 'Verb Strength & Diversity', score: maxScore, maxScore, percentage: 100, suggestions, fixable: true, fixType: 'ai' };
  }

  const passiveCount = bullets.filter(b => PASSIVE_PATTERNS.some(p => p.test(b))).length;
  const activePct = 1 - (passiveCount / bullets.length);
  const score = Math.round(activePct * maxScore);
  if (passiveCount > 0) suggestions.push(`Convert ${passiveCount} passive voice bullet(s) to active voice`);

  return { id: 16, name: 'No Passive Voice', category: 'Verb Strength & Diversity', score, maxScore, percentage: Math.round(activePct * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP17YearsMatch(resume: ResumeData, jdAnalysis: JDAnalysis): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];

  if (jdAnalysis.yearsRequired === 0) {
    return { id: 17, name: 'Years Match JD', category: 'Experience Alignment', score: maxScore, maxScore, percentage: 100, suggestions, fixable: false, fixType: 'none' };
  }

  let totalYears = 0;
  resume.workExperience?.forEach(exp => {
    const yearMatch = exp.year?.match(/(\d{4})\s*[-–]\s*(\d{4}|present|current|ongoing)/i);
    if (yearMatch) {
      const start = parseInt(yearMatch[1]);
      const end = yearMatch[2].toLowerCase() === 'present' || yearMatch[2].toLowerCase() === 'current' || yearMatch[2].toLowerCase() === 'ongoing'
        ? new Date().getFullYear()
        : parseInt(yearMatch[2]);
      totalYears += end - start;
    }
  });

  let score: number;
  if (totalYears >= jdAnalysis.yearsRequired) score = maxScore;
  else if (totalYears >= jdAnalysis.yearsRequired - 1) score = 7;
  else if (totalYears >= jdAnalysis.yearsRequired - 2) score = 4;
  else {
    score = 2;
    suggestions.push(`JD requires ${jdAnalysis.yearsRequired}+ years, resume shows ~${totalYears} years`);
  }

  return { id: 17, name: 'Years Match JD', category: 'Experience Alignment', score, maxScore, percentage: Math.round((score / maxScore) * 100), suggestions, fixable: false, fixType: 'user_input' };
}

function scoreP18SeniorityAlignment(resume: ResumeData, jdAnalysis: JDAnalysis): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const rolesText = (resume.workExperience?.map(e => e.role || '').join(' ') || '').toLowerCase();

  const seniorityMap: Record<string, string[]> = {
    'entry': ['junior', 'intern', 'associate', 'trainee', 'graduate'],
    'mid': ['developer', 'engineer', 'analyst', 'specialist'],
    'senior': ['senior', 'sr', 'experienced'],
    'lead': ['lead', 'principal', 'staff', 'architect', 'head'],
    'principal': ['principal', 'staff', 'distinguished', 'director', 'vp'],
  };

  const expected = seniorityMap[jdAnalysis.seniorityLevel] || [];
  const hasMatch = expected.some(t => rolesText.includes(t));
  const score = hasMatch ? maxScore : 3;
  if (!hasMatch) suggestions.push(`Role titles don't reflect ${jdAnalysis.seniorityLevel} seniority level`);

  return { id: 18, name: 'Seniority Alignment', category: 'Experience Alignment', score, maxScore, percentage: Math.round((score / maxScore) * 100), suggestions, fixable: false, fixType: 'user_input' };
}

function scoreP19ProjectSkillAlignment(resume: ResumeData, jdAnalysis: JDAnalysis): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const projects = resume.projects || [];

  if (projects.length === 0) {
    suggestions.push('Add projects demonstrating relevant skills');
    return { id: 19, name: 'Project Skill Alignment %', category: 'Project Relevance', score: 0, maxScore, percentage: 0, suggestions, fixable: false, fixType: 'user_input' };
  }

  const projectText = projects.map(p => {
    const parts = [p.title, ...(p.bullets || []), ...(p.techStack || [])];
    return parts.join(' ');
  }).join(' ').toLowerCase();

  const allJdSkills = [...jdAnalysis.hardSkills, ...jdAnalysis.tools];
  if (allJdSkills.length === 0) {
    return { id: 19, name: 'Project Skill Alignment %', category: 'Project Relevance', score: maxScore, maxScore, percentage: 100, suggestions, fixable: false, fixType: 'none' };
  }

  const matched = allJdSkills.filter(s => projectText.includes(s.toLowerCase()));
  const pct = matched.length / allJdSkills.length;
  const score = Math.round(pct * maxScore);
  if (pct < 0.5) suggestions.push('Add projects that use JD-required technologies');

  return { id: 19, name: 'Project Skill Alignment %', category: 'Project Relevance', score, maxScore, percentage: Math.round(pct * 100), suggestions, fixable: true, fixType: 'ai' };
}

function scoreP20TechStackRelevance(resume: ResumeData, jdAnalysis: JDAnalysis): ParameterScore {
  const maxScore = 10;
  const suggestions: string[] = [];
  const projects = resume.projects || [];
  const techStacks = projects.flatMap(p => p.techStack || []).map(t => t.toLowerCase());

  if (techStacks.length === 0) {
    suggestions.push('Add tech stack details to projects');
    return { id: 20, name: 'Tech Stack Relevance', category: 'Project Relevance', score: 2, maxScore, percentage: 20, suggestions, fixable: true, fixType: 'ai' };
  }

  const allJdSkills = [...jdAnalysis.hardSkills, ...jdAnalysis.tools];
  if (allJdSkills.length === 0) {
    return { id: 20, name: 'Tech Stack Relevance', category: 'Project Relevance', score: maxScore, maxScore, percentage: 100, suggestions, fixable: false, fixType: 'none' };
  }

  const matched = allJdSkills.filter(s => techStacks.some(t => t.includes(s.toLowerCase())));
  const pct = matched.length / allJdSkills.length;
  const score = Math.round(pct * maxScore);
  if (pct < 0.4) suggestions.push('Include JD-relevant technologies in project tech stacks');

  return { id: 20, name: 'Tech Stack Relevance', category: 'Project Relevance', score, maxScore, percentage: Math.round(pct * 100), suggestions, fixable: true, fixType: 'ai' };
}

function getMatchBand(score: number): string {
  if (score >= 90) return 'Excellent Match';
  if (score >= 80) return 'Very Good Match';
  if (score >= 70) return 'Good Match';
  if (score >= 60) return 'Fair Match';
  if (score >= 50) return 'Below Average';
  if (score >= 40) return 'Poor Match';
  if (score >= 30) return 'Very Poor';
  if (score >= 20) return 'Inadequate';
  return 'Minimal Match';
}

function getInterviewProbability(score: number): string {
  if (score >= 90) return '85-100%';
  if (score >= 80) return '70-84%';
  if (score >= 70) return '55-69%';
  if (score >= 60) return '35-54%';
  if (score >= 50) return '20-34%';
  if (score >= 40) return '8-19%';
  if (score >= 30) return '3-7%';
  if (score >= 20) return '1-2%';
  return '0-0.5%';
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  'ATS Compatibility': 15,
  'Keyword Alignment': 35,
  'Impact & Metrics': 18,
  'Verb Strength & Diversity': 12,
  'Experience Alignment': 10,
  'Project Relevance': 10,
};

export function scoreResumeAgainstJD(resume: ResumeData, jobDescription: string): JDScoringResult {
  const jd = analyzeJD(jobDescription);

  const parameters: ParameterScore[] = [
    scoreP1SingleColumn(resume),
    scoreP2NoTablesImages(resume),
    scoreP3StandardHeadings(resume),
    scoreP4BulletFormatting(resume),
    scoreP5PdfParsingSafety(resume),
    scoreP6HardSkillMatch(resume, jd),
    scoreP7ToolMatch(resume, jd),
    scoreP8MandatorySkillPresence(resume, jd),
    scoreP9RoleTitleAlignment(resume, jd),
    scoreP10KeywordDensityBalance(resume, jd),
    scoreP11MetricDensity(resume),
    scoreP12PerformanceWords(resume),
    scoreP13NoVaguePhrases(resume),
    scoreP14StrongActionVerbs(resume),
    scoreP15VerbRepetition(resume),
    scoreP16NoPassiveVoice(resume),
    scoreP17YearsMatch(resume, jd),
    scoreP18SeniorityAlignment(resume, jd),
    scoreP19ProjectSkillAlignment(resume, jd),
    scoreP20TechStackRelevance(resume, jd),
  ];

  const categoryNames = Object.keys(CATEGORY_WEIGHTS);
  const categories: CategoryScore[] = categoryNames.map(catName => {
    const catParams = parameters.filter(p => p.category === catName);
    const catScore = catParams.reduce((sum, p) => sum + p.score, 0);
    const catMax = catParams.reduce((sum, p) => sum + p.maxScore, 0);
    return {
      name: catName,
      weight: CATEGORY_WEIGHTS[catName],
      parameters: catParams,
      score: catScore,
      maxScore: catMax,
      percentage: catMax > 0 ? Math.round((catScore / catMax) * 100) : 0,
    };
  });

  let weightedTotal = 0;
  let weightSum = 0;
  categories.forEach(cat => {
    weightedTotal += cat.percentage * cat.weight;
    weightSum += cat.weight;
  });
  const overallScore = Math.round(weightedTotal / weightSum);

  const fixableCount = parameters.filter(p => p.fixable && p.percentage < 80).length;
  const nonFixableCount = parameters.filter(p => !p.fixable && p.percentage < 80).length;

  return {
    overallScore,
    categories,
    parameters,
    matchBand: getMatchBand(overallScore),
    interviewProbability: getInterviewProbability(overallScore),
    fixableCount,
    nonFixableCount,
  };
}
