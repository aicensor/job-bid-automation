import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getModel, defaultConfig } from '@/ai/providers';

// ============================================================================
// Stage 2 Fit Check — LLM-based resume-job matching
// Called after Stage 1 (client-side skill match) passes
// Uses the analyze model (lightweight, free tier)
// ============================================================================

interface LlmFitRequest {
  mainSkills: string;       // resume's main skills
  jobTitle: string;
  jobDescription: string;
  mainTechStacks: string;
}

export interface LlmFitResult {
  score: number;            // 0-100
  reason: string;
  proceed: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { mainSkills, jobTitle, jobDescription, mainTechStacks } = (await req.json()) as LlmFitRequest;

    if (!mainSkills || !jobTitle) {
      return NextResponse.json({ error: 'mainSkills and jobTitle required' }, { status: 400 });
    }

    const { model } = getModel('analyze', defaultConfig);

    // Keep tokens low — trim description
    const jdShort = (jobDescription || '').substring(0, 1500);

    const { text } = await generateText({
      model,
      prompt: `Score how well this candidate's skill set fits this job. Focus on: primary tech stack alignment, role relevance, and whether the candidate could realistically perform the core duties.

CANDIDATE MAIN SKILLS: ${mainSkills}

JOB: ${jobTitle}
REQUIRED TECH: ${mainTechStacks}
JOB DESCRIPTION:
${jdShort}

Reply ONLY with JSON: {"score": <0-100>, "reason": "<one sentence explaining fit>"}
Scoring guide:
- 70-100: Strong fit — primary skills directly match core requirements
- 40-69: Partial fit — some overlap, transferable skills present
- 0-39: Weak fit — different primary stack, unlikely to pass screening`,
      maxTokens: 100,
      temperature: 0.1,
    });

    // Parse response
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const match = cleaned.match(/\{[^}]*"score"\s*:\s*(\d+)[^}]*"reason"\s*:\s*"([^"]*)"[^}]*\}/);

    if (match) {
      const score = parseInt(match[1]);
      return NextResponse.json({ score, reason: match[2], proceed: score >= 40 });
    }

    // Fallback: try to find just a number
    const numMatch = cleaned.match(/(\d+)/);
    if (numMatch) {
      const score = parseInt(numMatch[1]);
      return NextResponse.json({ score, reason: 'Score parsed from response', proceed: score >= 40 });
    }

    // LLM response unparseable — let them proceed
    return NextResponse.json({ score: 50, reason: 'Could not parse LLM response', proceed: true });
  } catch (error) {
    console.error('[api/bidman/fit-check] LLM error:', error);
    // On error, don't block — let them proceed
    return NextResponse.json({ score: 50, reason: 'Fit check unavailable', proceed: true });
  }
}
