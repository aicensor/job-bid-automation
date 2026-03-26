import { z } from 'zod';

// ============================================================================
// Job Description Zod Schema — for LLM structured output
// ============================================================================

export const skillRequirementSchema = z.object({
  skill: z.string(),
  category: z.string().describe('One of: technical, soft, domain, certification'),
  priority: z.string().describe('One of: required, preferred, bonus'),
  yearsRequired: z.number().optional(),
});

export const parsedJobSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string(),
  workType: z.string().describe('One of: remote, hybrid, onsite'),
  employmentType: z.string().describe('One of: full-time, part-time, contract'),
  salaryRange: z.string().optional(),
  seniorityLevel: z.string().describe('One of: junior, mid, senior, staff, principal, director'),
  requiredSkills: z.array(skillRequirementSchema),
  preferredSkills: z.array(skillRequirementSchema),
  responsibilities: z.array(z.string()),
  qualifications: z.array(z.string()),
  keywords: z.array(z.string()),
});

export type ParsedJobSchema = z.infer<typeof parsedJobSchema>;
