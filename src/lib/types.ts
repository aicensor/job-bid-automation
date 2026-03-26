// ============================================================================
// Core Types for Tailor Resume Generator
// ============================================================================

// --- Resume Data Model ---

export interface Resume {
  id: string;
  isBase: boolean;
  jobId?: string;                    // linked job (tailored resumes only)
  createdAt: Date;
  updatedAt: Date;

  contact: ContactInfo;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: SkillCategory[];
  projects: Project[];
  certifications: Certification[];
  sectionOrder: string[];            // controls section display order
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string | 'Present';
  bullets: string[];
  tags: string[];                    // for matching against JD
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa?: string;
  highlights?: string[];
}

export interface SkillCategory {
  category: string;                  // e.g., "Languages", "Cloud", "Frameworks"
  skills: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  bullets: string[];
  url?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

// --- Job Description Model ---

export interface ParsedJob {
  id: string;
  url?: string;
  company: string;
  title: string;
  location: string;
  workType: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full-time' | 'part-time' | 'contract';
  salaryRange?: string;
  seniorityLevel: 'junior' | 'mid' | 'senior' | 'staff' | 'principal' | 'director';

  // Extracted requirements
  requiredSkills: SkillRequirement[];
  preferredSkills: SkillRequirement[];
  responsibilities: string[];
  qualifications: string[];
  keywords: string[];                // all extracted keywords

  // Raw
  rawDescription: string;
  parsedAt: Date;
}

export interface SkillRequirement {
  skill: string;
  category: 'technical' | 'soft' | 'domain' | 'certification';
  priority: 'required' | 'preferred' | 'bonus';
  yearsRequired?: number;
}

// --- Achievement Bank ---

export interface Achievement {
  id: string;
  context: string;                   // situation/project
  action: string;                    // what you did
  result: string;                    // quantified outcome
  tags: string[];                    // skills demonstrated
  seniority: 'junior' | 'mid' | 'senior' | 'staff';
}

// --- User Preferences ---

export interface TailorPreferences {
  tone: 'formal' | 'balanced' | 'conversational';
  emphasis: 'leadership' | 'hands-on' | 'both';
  targetSeniority: 'senior' | 'staff' | 'principal';
  alwaysIncludeSkills: string[];
  neverModify: {
    companyNames: boolean;
    dates: boolean;
    education: boolean;
    certifications: boolean;
  };
  maxBulletsPerRole: number;
  yearsToHighlight: number;         // only tailor last N years of experience
}

// --- Scoring ---

export interface ScoreResult {
  overall: number;                   // 0-100
  breakdown: {
    atsKeywordMatch: number;         // TF-IDF exact + synonym matching
    semanticSimilarity: number;      // Embedding cosine similarity
    senioritySignals: number;        // Action verbs, metrics, leadership
    readability: number;             // Structure, length, formatting
    achievementQuality: number;      // Quantified results, STAR format
  };
  missingKeywords: string[];
  suggestions: string[];
  passesThreshold: boolean;          // overall >= 85
}

// --- Tailor Result ---

export interface TailorResult {
  baseResumeId: string;
  jobId: string;
  tailoredResume: Resume;
  scoreBefore: ScoreResult;
  scoreAfter: ScoreResult;
  iterations: number;                // how many refine loops ran
  changes: TailorChange[];
  generatedAt: Date;
}

export interface TailorChange {
  section: string;
  field: string;
  before: string;
  after: string;
  reason: string;
}

// --- Pipeline ---

export interface PipelineConfig {
  scoreThreshold: number;            // default 85
  maxIterations: number;             // default 3
  primaryModel: string;
  fallbackModels: string[];
  temperature: number;               // default 0.5
}
