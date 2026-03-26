import { z } from 'zod';

// ============================================================================
// Zod Schemas — used for AI structured output validation
// ============================================================================

export const contactInfoSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
});

export const workExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  bullets: z.array(z.string()),
  tags: z.array(z.string()),
});

export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  graduationDate: z.string(),
  gpa: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

export const skillCategorySchema = z.object({
  category: z.string(),
  skills: z.array(z.string()),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  bullets: z.array(z.string()),
  url: z.string().optional(),
});

export const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
  url: z.string().optional(),
});

export const resumeSchema = z.object({
  id: z.string(),
  isBase: z.boolean(),
  jobId: z.string().optional(),
  contact: contactInfoSchema,
  summary: z.string(),
  experience: z.array(workExperienceSchema),
  education: z.array(educationSchema),
  skills: z.array(skillCategorySchema),
  projects: z.array(projectSchema),
  certifications: z.array(certificationSchema),
  sectionOrder: z.array(z.string()),
});

export type ResumeSchema = z.infer<typeof resumeSchema>;
