# Resume Tailoring Engine — Reference Rules Document

> Compiled from authoritative sources including Jobscan, TheLadders eye-tracking studies,
> Tech Interview Handbook, and ATS vendor documentation. Last updated: 2026-03-24.

---

## Table of Contents

1. [ATS Parsing Rules](#1-ats-parsing-rules)
2. [ATS Scoring Algorithms](#2-ats-scoring-algorithms)
3. [Recruiter Screening Rules](#3-recruiter-screening-rules)
4. [Senior SWE Resume Best Practices](#4-senior-swe-resume-best-practices)
5. [FAANG / Big Tech Specific Rules](#5-faang--big-tech-specific-rules)
6. [Common Scoring Rubrics](#6-common-scoring-rubrics)
7. [Resume Tailoring Rules](#7-resume-tailoring-rules)
8. [PDF/DOCX Technical Rules](#8-pdfdocx-technical-rules)

---

## 1. ATS Parsing Rules

### 1.1 How ATS Parsers Work

Major parsing engines: **RChilli, Sovren (now Textkernel), Daxtra, Workday proprietary**.

All follow the same pipeline:
1. **Extraction** — Convert PDF/DOCX to raw text
2. **Segmentation** — Identify text blocks as Contact, Work, Education, Skills based on header keywords
3. **Field Parsing** — Break blocks into structured fields: Job Title, Company, Start Date, End Date, Description
4. **Ranking** — Score relevance based on parsed fields (not the visual document)

**Market share (2025):** iCIMS 10.7%, Oracle/Taleo next, followed by Workday, Greenhouse, Lever.
97.8% of Fortune 500 companies use an ATS. 99.7% of recruiters use keyword filters.

Sources: [Jobscan](https://www.jobscan.co/blog/20-ats-friendly-resume-templates/), [ResumeAdapter](https://www.resumeadapter.com/blog/ats-resume-formatting-rules-2026)

### 1.2 File Format Requirements

| Format | Compatibility | Notes |
|--------|--------------|-------|
| **.docx** | 100% of ATS platforms | Gold standard for parsing reliability |
| **Text-based PDF** | ~95% of modern ATS | Preferred for visual consistency; safe in 2026 for Greenhouse, Lever, Workday, iCIMS |
| **Image/scanned PDF** | 0% | Completely unparseable by any ATS |
| **Taleo** | DOCX preferred | PDF parsing less reliable on older Taleo versions |
| **.pages, .jpg, .png** | 0% | Never submit these formats |

**Rule:** Default to text-based PDF. Use DOCX only if the posting explicitly requests it or you are applying through Taleo.

Sources: [ResuFit](https://resufit.com/blog/pdf-vs-word-resume-how-to-choose-the-best-format-for-job-applications/), [Resumemate](https://www.resumemate.io/blog/pdf-vs-docx-for-resumes-in-2025-what-recruiters-ats-really-prefer/)

### 1.3 Formatting That Breaks ATS Parsing

| Element | Risk Level | Details |
|---------|-----------|---------|
| **Tables** | HIGH | Parser cannot reliably extract content from table cells; may skip entirely |
| **Multi-column layouts** | HIGH | Parser reads left-to-right, top-to-bottom linearly; columns merge into nonsense |
| **Text boxes** | HIGH | Floating elements outside normal text flow; invisible to most parsers |
| **Headers/Footers** | HIGH | Most ATS skip header/footer content entirely (separate document layer). TopResume found 25% failure rate for contact info in headers |
| **Images/Graphics** | HIGH | Completely invisible to ATS; icons read as garbage characters |
| **Skill rating bars** | HIGH | Graphical elements convey zero parseable data |
| **Canva exports** | HIGH | Often image-based PDFs with text embedded as graphics |
| **Creative section headings** | MEDIUM | "My Journey" instead of "Work Experience" causes section misclassification |
| **Inconsistent date formats** | MEDIUM | Mixing "Jan 2019", "2019-01", and "January '19" causes experience miscalculation |

Sources: [Jobscan](https://www.jobscan.co/blog/ats-formatting-mistakes/), [Resumemate](https://www.resumemate.io/blog/tables-columns-text-boxes-do-they-break-ats-safer-layouts/)

### 1.4 Contact Information Extraction

**Rules:**
- Place name, phone, email, LinkedIn URL in the **main document body** (not header/footer)
- Use text labels, not icons (write "Email:" not a mail icon)
- Put each piece of contact info on its own line or separated by pipes (`|`)
- Do not use tables to lay out contact info

### 1.5 Date Parsing Rules

**Safest format:** `Month Year – Month Year` (e.g., "January 2020 – March 2023")

| Format | ATS Safety | Notes |
|--------|-----------|-------|
| `January 2020 – March 2023` | SAFE | Best for humans and machines |
| `Jan 2020 – Mar 2023` | SAFE | Abbreviated month is fine |
| `01/2020 – 03/2023` | SAFE | MM/YYYY is well-parsed |
| `2020 – 2023` | RISKY | Year-only causes inaccurate experience calc (could credit 1 day or 365 days) |
| `DD/MM/YYYY` | RISKY | Ambiguous (03/04 = March 4 or April 3?) |
| `January 2nd, 2022` | RISKY | Ordinals confuse parsers |
| `'24` | RISKY | Two-digit year may not be projected to full year |

**Current role:** Use "Present" (not "Current" or "Now").

**Overlapping dates:** List each position separately; ATS calculates non-overlapping total experience.

Sources: [Resumly](https://www.resumly.ai/blog/tips-for-formatting-resume-dates-consistently-to-improve-ats-compatibility), [ResumeAdapter](https://www.resumeadapter.com/blog/ats-resume-formatting-rules-2026)

### 1.6 Section Heading Recognition

**Universally recognized headings:**
- `Summary` or `Professional Summary`
- `Work Experience` or `Professional Experience` or `Experience`
- `Education`
- `Skills` or `Technical Skills`
- `Certifications` or `Licenses`
- `Projects`
- `Awards`
- `Publications`
- `Volunteer Experience`

**Heading formatting rules:**
- Use ALL CAPS or Bold to help parsers identify section boundaries
- Add a blank line before each section heading
- Keep headings consistent in style throughout the document
- Certifications must be in their own section (not buried in Skills)
- The Experience section is weighted most heavily; use the word "Experience" in that heading

**Never use:** "My Journey," "What I Bring," "Career Highlights," "Toolkit," or other creative alternatives.

Sources: [Indeed](https://www.indeed.com/career-advice/resumes-cover-letters/ats-resume-template), [Jobscan](https://www.jobscan.co/blog/ats-resume/), [Santa Clara University Career Center](https://www.scu.edu/careercenter/toolkit/job-scan-common-ats-resume-formatting-mistakes/)

### 1.7 Font Requirements

**Safe fonts:** Arial, Calibri, Garamond, Georgia, Helvetica, Times New Roman

**Size guidelines:**
- Name: 14–18pt
- Section headers: 12–14pt
- Body text: 10–12pt

**Never use:** Script fonts, decorative fonts, custom-installed fonts (may not embed properly and cause garbled text).

Sources: [CareerScribeAI](https://blog.careerscribeai.com/ats-friendly-resume-fonts/), [ATS Resume AI](https://atsresumeai.com/blog/ats-resume-formatting-guide/)

### 1.8 Platform-Specific Parsing Differences

| Platform | Two-Column Support | PDF Parsing | Date Sensitivity | Notes |
|----------|-------------------|-------------|-----------------|-------|
| **Greenhouse** | Reasonable | Good | Moderate | More formatting-tolerant |
| **Lever** | Reasonable | Good | Moderate | More formatting-tolerant |
| **Workday** | Poor | Improved since 2024 | High | Many employers run older versions |
| **iCIMS** | Poor | Improved since 2024 | High | Largest market share |
| **Taleo** | None | DOCX preferred | High | Strictest parser; legacy system |

**Safe strategy:** Format for the lowest common denominator (Taleo). Single-column, standard headers, text-based PDF or DOCX.

Sources: [ResumeGeni](https://resumegeni.com/blog/ats-system-guide-2026), [ResumeAdapter](https://www.resumeadapter.com/blog/ats-resume-formatting-rules-2026)

---

## 2. ATS Scoring Algorithms

### 2.1 Scoring Component Weights

| Component | Typical Weight | Description |
|-----------|---------------|-------------|
| **Keyword Match** | 40–50% | Primary scoring factor; exact, fuzzy, and semantic matching |
| **Experience Level** | 20–25% | Total years calculated from date ranges vs. job requirements |
| **Education** | 10–15% | Degree level, field of study, institution |
| **Skills Match** | 10–15% | Hard skills weighted higher than soft skills |
| **Recency** | 5–10% | How recently relevant skills/roles were held |

Sources: [Scale.jobs](https://scale.jobs/blog/understanding-ats-scoring-algorithms), [ResumeGyani](https://resumegyani.in/ats-guides/ats-scoring-factors-explained)

### 2.2 Keyword Matching Types

| Type | How It Works | ATS Adoption |
|------|-------------|--------------|
| **Exact Match** | Looks for the precise word/phrase from the JD. "machine learning" does NOT match "ML" | All ATS platforms |
| **Fuzzy Match** | Handles plurals, verb tenses, common abbreviations. "managed" matches "managing" | Most modern ATS |
| **Semantic Match** | NLP-based meaning understanding. "data visualization" recognized as related to "Tableau" | Advanced platforms only (Greenhouse, newer Workday) |

**Rule:** Never rely on semantic matching. Always include the exact keywords from the job description. Spell out acronyms on first use: "Project Management Professional (PMP)".

### 2.3 Keyword Optimization Targets

- Include at least **80% of required keywords** from the job description
- Include at least **50% of preferred/nice-to-have keywords**
- Target **15–25 relevant keywords** distributed naturally across sections
- Each keyword should appear **2–3 times** across different sections (summary, experience, skills)
- **Never keyword-stuff:** Modern ATS detects density anomalies and flags/penalizes

### 2.4 Keyword Placement Weighting

Some ATS systems weight keywords differently based on where they appear:

1. **Job titles** — Highest weight
2. **Professional summary** — High weight
3. **Skills section** — High weight
4. **Experience bullet points** — Standard weight
5. **Education section** — Lower weight

### 2.5 Years of Experience Calculation

- ATS subtracts start date from end date for each position
- Overlapping roles: System calculates total non-overlapping experience
- Experience scoring is bidirectional: too little = low score, significantly more than required = may flag overqualified
- If dates cannot be parsed, experience may calculate as **zero**

### 2.6 Education Matching Logic

- Degree level matching: PhD > Master's > Bachelor's > Associate's
- Field of study matching: "Computer Science" vs. job requirement
- Some systems match institution tier (top universities get bonus weight)
- GPA may be parsed if present but is rarely a scoring factor for experienced candidates

### 2.7 Job Title Matching

- Exact title matches score highest
- Related titles score based on semantic similarity
- Seniority level inference: "Senior", "Lead", "Principal", "Staff", "Director" are parsed as level indicators
- Title progression (Junior -> Mid -> Senior) demonstrates career growth

Sources: [ResumeOptimizerPro](https://resumeoptimizerpro.com/blog/how-to-optimize-resume-for-ATS), [MokaHR](https://www.mokahr.io/myblog/ats-candidate-ranking-job-criteria/)

---

## 3. Recruiter Screening Rules

### 3.1 The Initial Scan (Eye-Tracking Research)

| Study | Year | Average Scan Time | Sample |
|-------|------|------------------|--------|
| TheLadders (original) | 2012 | 6 seconds | 30 recruiters |
| TheLadders (follow-up) | 2018 | 7.4 seconds | Updated study |
| Wonsulting (Jerry Lee) | 2025 | ~6–8 seconds | Hidden eye-tracker |
| InterviewPal | 2025 | 11.2 seconds | AI-assisted review increases time |

**Median total review time** (if candidate passes initial scan): **1 minute 34 seconds**.

Sources: [TheLadders Eye-Tracking Study](https://www.theladders.com/static/images/basicSite/pdfs/TheLadders-EyeTracking-StudyC2.pdf), [InterviewPal](https://www.interviewpal.com/blog/how-long-recruiters-actually-spend-reading-your-resume-data-study), [Wonsulting](https://www.wonsulting.com/job-search-hub/hidden-eye-tracker-how-recruiters-actually-read-resumes)

### 3.2 The F-Pattern Scan

Recruiters read resumes in an **F-shaped pattern**:
1. Scan across the **top line** (name, title, summary)
2. Drop down the **left margin**
3. Scan across the **next prominent line** (most recent job title + company)
4. Continue scanning down the left margin

**Implication:** The top-left quadrant of your resume is the highest-value real estate. Place your most compelling information there.

### 3.3 What 80% of Scan Time Is Spent On

1. Name
2. Current title/company
3. Previous titles/companies
4. Start/stop dates of previous positions
5. Education

### 3.4 What Makes Recruiters Shortlist

- Clean, simple layout with clear sections and heading titles
- F-pattern compatible organization
- Bold titles and bulleted accomplishments
- **Quantified achievements** (80% of bullet points should contain numbers/results)
- Most recent and relevant experience near the top, aligned left
- White space that aids scannability

### 3.5 Red Flags That Trigger Rejection

| Red Flag | Severity | Stats |
|----------|----------|-------|
| **Typos/grammar errors** | CRITICAL | 77% of hiring managers dismiss; 59% of recruiters auto-reject |
| **Job hopping** (3+ jobs in 2 years) | HIGH | 50% of hiring managers see as red flag |
| **Unexplained employment gaps** | MEDIUM-HIGH | Not auto-disqualifying post-COVID but raises questions |
| **Non-tailored/generic resume** | HIGH | Recruiters spot mass-distributed resumes instantly |
| **Poor formatting/design** | HIGH | 40% of recruiters turned off (Zippia survey) |
| **Missing dates** | MEDIUM | Signals hiding gaps or age discrimination concern |
| **Dishonesty/misrepresentation** | CRITICAL | #1 way people get caught = misrepresenting education |
| **Current employer's email** | MEDIUM | Signals job searching on company time |
| **Unprofessional email address** | LOW-MEDIUM | partyanimal@gmail.com vs. firstname.lastname@gmail.com |

Sources: [ResumeWorded](https://resumeworded.com/resume-red-flags-2023-key-advice), [ResumeGenius](https://resumegenius.com/blog/resume-help/resume-red-flags), [NovoResume](https://novoresume.com/career-blog/resume-red-flags)

### 3.6 Volume Context

- Average job posting receives **300–500+ resumes**
- **83% of applications are disqualified** during initial screening
- Senior roles receive fewer applications, so recruiters spend more time per resume
- ATS pre-filtering means humans only see resumes that already passed keyword gates

Sources: [CloudApper](https://www.cloudapper.ai/talent-acquisition/how-to-screen-resumes-effectively/), [Tufts Career Center](https://careers.tufts.edu/)

---

## 4. Senior SWE Resume Best Practices

### 4.1 Resume Length

| Experience | Recommended Length |
|------------|-------------------|
| < 5 years | Strictly 1 page |
| 5–10 years | 1 page preferred; 2 pages acceptable if every line adds value |
| 10+ years | 2 pages acceptable |
| FAANG applications | 1 page preferred regardless of experience |

### 4.2 Optimal Structure (8+ years)

```
1. Contact Information (in body, not header)
2. Professional Summary (3–4 lines, customized per application)
3. Technical Skills (categorized, 10–12 items)
4. Professional Experience (reverse chronological, 3–4 most relevant roles)
5. Education
6. Certifications (if applicable)
```

### 4.3 Demonstrating Seniority

The narrative shifts from "I wrote code" to "I architected systems and multiplied team velocity."

**Key seniority signals:**
- Architectural decisions (monolith-to-microservices migrations, tech stack selection)
- Team/org impact (mentoring juniors, driving code review standards)
- Business metrics (revenue impact, cost reduction, user growth)
- Scale indicators (requests/sec, data volume, team size, services owned)
- Cross-functional leadership (working with product, design, stakeholders)
- System ownership (on-call, reliability improvements, incident response)

### 4.4 Action Verbs for Senior Engineers

**Architecture/Design:** Architected, Designed, Engineered, Spearheaded, Pioneered
**Leadership:** Led, Mentored, Directed, Championed, Drove
**Optimization:** Optimized, Reduced, Streamlined, Accelerated, Scaled
**Delivery:** Delivered, Shipped, Launched, Implemented, Migrated
**Strategy:** Defined, Established, Introduced, Standardized, Transformed

**Never use:** "Responsible for," "Helped with," "Participated in," "Was involved in"

### 4.5 Skills Section Format

**Use categorized format (not flat list):**

```
Languages:        Python, Go, TypeScript, Java
Frameworks:       React, Node.js, Django, Spring Boot
Infrastructure:   AWS (EC2, Lambda, S3, RDS), Kubernetes, Terraform, Docker
Data:             PostgreSQL, Redis, Kafka, Elasticsearch
Practices:        CI/CD, Microservices, System Design, Agile/Scrum
```

**Rules:**
- Maximum 10–12 items in primary categories
- Use proficiency tiers: "Proficient In" vs. "Familiar With"
- If you list it, assume you will be tested on it
- Place skills section near the top (high ATS keyword weight)

### 4.6 Bullet Point Formula

**Structure:** `[Action Verb] + [What You Did] + [Technology/Method] + [Quantified Result]`

**Examples:**
- "Architected event-driven microservices platform using Kafka and Kubernetes, reducing deployment time by 70% and supporting 50K req/sec"
- "Led migration from monolithic Rails app to Go microservices, improving API latency from 800ms to 120ms (p99)"
- "Mentored 6 junior engineers through structured code review program, improving team PR merge rate by 40%"

**Rules:**
- Every bullet should have a metric where possible
- Keep bullets under 2 lines
- 3–5 bullets per role
- Most recent role gets the most bullets; older roles get fewer

### 4.7 Projects Section

- For 8+ years experience, minimize the projects section
- Only include a side project if it surpasses your day job in scale (5,000+ GitHub stars, real MRR SaaS)
- Link to GitHub/portfolio instead of describing projects inline
- Open-source contributions are high signal at senior level

Sources: [Tech Interview Handbook](https://www.techinterviewhandbook.org/resume/), [BeamJobs](https://www.beamjobs.com/resumes/software-engineer-resume-examples), [ResumeWorded](https://resumeworded.com/senior-software-engineer-resume-example)

---

## 5. FAANG / Big Tech Specific Rules

### 5.1 General FAANG Screening

- Acceptance rates often **under 1%** (Google: ~0.2% in 2024 with 3M applications for ~6,000 positions)
- Recruiters spend **30–60 seconds** on initial resume pass
- Optimizing for **signal density**: right keywords, right company names/project scale, right metrics
- All FAANG companies use ATS before human review
- **Referrals matter significantly:** Referred candidates at Google are 4x more likely to be hired

### 5.2 High-Value FAANG Keywords

distributed systems, scalability, microservices, machine learning, data pipeline, CI/CD,
infrastructure, cloud (AWS/GCP/Azure), Kubernetes, API design, cross-functional,
technical roadmap, performance optimization, system design, reliability, observability

### 5.3 Google

**Evaluation dimensions (mirrors interview rubric):**
1. **General Cognitive Ability** — Complex problem-solving, analytical thinking
2. **Leadership** — Leading projects/teams without formal authority
3. **Googleyness** — Intellectual curiosity, comfort with ambiguity, autonomous impact
4. **Role-Related Knowledge** — Technical depth for the specific role

**Resume signals Google looks for:**
- Complex technical problems solved autonomously
- Cross-functional projects led
- Systems built at significant scale
- Evidence of intellectual curiosity and learning

### 5.4 Amazon

**Resume bullets must map to the 16 Leadership Principles (LPs).**

Key LP-to-bullet mappings:

| Leadership Principle | Resume Signal |
|---------------------|---------------|
| **Customer Obsession** | Mention end users and customer impact |
| **Ownership** | End-to-end project ownership, not just task completion |
| **Invent and Simplify** | Novel solutions, reducing complexity |
| **Bias for Action** | Decisions made under uncertainty or tight timelines |
| **Dive Deep** | Technical depth, root cause analysis |
| **Deliver Results** | Every bullet ends with a metric |
| **Think Big** | Ambitious scope, long-term vision |
| **Hire and Develop the Best** | Mentoring, raising the bar |
| **Earn Trust** | Cross-team collaboration, transparent communication |
| **Insist on the Highest Standards** | Code quality, testing, operational excellence |

### 5.5 Meta (Facebook)

- Heavy emphasis on **impact at scale** (billions of users)
- Balance between technical details and cultural fit
- Collaboration and shipping velocity are key signals
- Product sense matters even for engineering roles

### 5.6 Apple

- Attention to detail and design sensibility (even for engineering)
- Product intuition and user experience awareness
- Confidentiality culture (less public info about process)

### 5.7 Netflix

- "Freedom and Responsibility" culture
- High performers who operate independently
- Strong emphasis on judgment and communication
- Context over control

### 5.8 FAANG vs. Startup Resume Differences

| Aspect | FAANG | Startup |
|--------|-------|---------|
| **Length** | 1 page strict | 1–2 pages OK |
| **Focus** | Scale, systems, metrics | Versatility, speed, wearing many hats |
| **Keywords** | Distributed systems, large-scale | Full-stack, MVP, product-market fit |
| **Seniority signals** | Architectural decisions, team leadership | End-to-end ownership, scrappiness |
| **Company names** | Other FAANG/top-tier companies are strong signals | Startup names less recognized; emphasize outcomes |

Sources: [SWE Resume](https://www.sweresume.app/articles/faang-resume-guide/), [TechnCV](https://techncv.com/blog/faang-resume-guide), [Design Gurus](https://www.designgurus.io/blog/best-resume-formats-for-faang-and-top-tech-companies-2025)

---

## 6. Common Scoring Rubrics

### 6.1 Typical Resume Scoring Scale

**1–5 Scale (most common for resume screening):**

| Score | Label | Meaning |
|-------|-------|---------|
| 1 | Unqualified | Missing must-have requirements; auto-reject |
| 2 | Underqualified | Meets some requirements but significant gaps |
| 3 | Qualified | Meets minimum requirements; worth considering |
| 4 | Strong | Exceeds requirements in key areas; likely shortlisted |
| 5 | Exceptional | Perfect or near-perfect match; prioritize for interview |

**1–10 Scale (used in screening matrices):**
Evaluates across 4 columns: Qualification, Experience, Skill Set, Cultural Fit. Each scored 1–10; total used for ranking.

### 6.2 Weighted Scoring Categories

| Category | Typical Weight | What's Evaluated |
|----------|---------------|-----------------|
| Must-Have Skills | 30–40% | Required technical skills, certifications, clearances |
| Experience Relevance | 25–30% | Years, recency, and relevance of work history |
| Education | 10–15% | Degree level, field, institution |
| Nice-to-Have Skills | 10–15% | Preferred skills, bonus qualifications |
| Cultural Fit Indicators | 5–10% | Leadership, communication, values alignment |

### 6.3 Knockout Criteria (Binary Pass/Fail)

These are evaluated **before** any scoring takes place:

| Criterion | Type | Example |
|-----------|------|---------|
| **Work authorization** | Hard knockout | "Are you authorized to work in [country]?" |
| **Location/relocation** | Hard knockout | "Can you work from [city]?" or willingness to relocate |
| **Required certifications** | Hard knockout | Security clearance, medical license, PE license |
| **Minimum education** | Hard knockout | "Do you have a Bachelor's degree or equivalent?" |
| **Minimum experience** | Hard knockout | "Do you have 5+ years of experience in X?" |
| **Salary expectations** | Soft knockout | Expectations significantly above the range |

**Impact example:** In one case study, 350 of 500 candidates (70%) were auto-disqualified by knockout questions, saving ~7 hours of manual review.

### 6.4 Bonus Criteria (Instant Shortlist Signals)

| Signal | Why It Matters |
|--------|---------------|
| Referral from current employee | 4x more likely to be hired at Google |
| Previous FAANG/top-tier company experience | Signals pre-vetted quality |
| Open-source contributions with significant adoption | Demonstrates public technical skill |
| Published papers/patents | Demonstrates deep expertise |
| Exact job title match + years of experience match | Highest ATS score possible |
| Quantified achievements with significant business impact | Demonstrates value-driven thinking |

### 6.5 Screening Funnel Benchmarks

| Stage | Typical Pass Rate |
|-------|------------------|
| Application submitted | 100% |
| ATS keyword filter | ~25% pass |
| Knockout questions | ~30% of remaining pass |
| Recruiter initial scan (6–11 sec) | ~20% of remaining pass |
| Recruiter deep review (1–2 min) | ~50% of remaining pass |
| Phone screen invitation | ~3–5% of original applicants |

Sources: [CloudApper](https://www.cloudapper.ai/talent-acquisition/how-to-screen-resumes-effectively/), [ProspectX](https://getprospectx.com/blog/candidate-scoring-framework-filter-profiles-interviews), [Foundire](https://foundire.com/blog/how-to-design-perfect-knockout-criteria/)

---

## 7. Resume Tailoring Rules

### 7.1 Ethical Boundaries

#### ALLOWED (Ethical Reframing)
- Reordering bullet points to put the most relevant ones first
- Emphasizing certain skills/experiences over others based on the job description
- Using the job description's exact terminology for skills you genuinely have
- Adjusting your professional summary for each application
- Removing irrelevant experience to save space
- Reframing accomplishments to highlight aspects relevant to the target role
- Grouping short-term contract roles under a single heading

#### NOT ALLOWED (Misrepresentation)
- Claiming skills or expertise you do not have
- Fabricating job titles, companies, or dates
- Claiming degrees you did not complete
- Inflating metrics or achievements
- Listing certifications you have not earned
- Claiming proficiency in tools you have barely used
- Hidden white text with keywords (ATS detects this; instant rejection)

### 7.2 The Guiding Principle

> "Tailoring = making sure your real value is not lost in translation. The ATS opens the door; your actual experience walks through it."

### 7.3 Keyword Optimization Rules

**DO:**
- Mirror the exact phrases from the job description for skills you have
- Use each relevant keyword 2–3 times, placed naturally in summary, experience, and skills
- Spell out acronyms on first use with abbreviation in parentheses: "Continuous Integration/Continuous Deployment (CI/CD)"
- Use synonyms and variations to prevent over-optimization
- Treat keywords as narrative elements, not a checklist

**DO NOT:**
- Keyword-stuff (triggers ATS penalties and potential auto-rejection)
- Add hidden/white text with keywords
- Include irrelevant, vague, or outdated keywords
- List skills that lack any supporting experience in the resume

### 7.4 Reframing Experience Rules

- You can frame responsibilities to match the job's language, as long as the underlying work is truthful
- Acknowledge skill gaps briefly and highlight willingness/ability to learn
- Transferable skills are legitimate: managing a team of engineers IS leadership experience even if your title was not "Engineering Manager"
- Quantify differently for different audiences: a startup might care about "shipped MVP in 3 weeks"; FAANG cares about "served 10M daily active users"

### 7.5 Per-Application Customization Checklist

1. [ ] Professional summary rewritten for this specific role
2. [ ] Skills section reordered to match job description priority
3. [ ] Top 3–5 bullet points in most recent role aligned to job requirements
4. [ ] Job description keywords naturally integrated (aim for 80% of required, 50% of preferred)
5. [ ] Irrelevant experience condensed or removed
6. [ ] File named: `FirstName_LastName_Resume.pdf`

Sources: [AIApply](https://aiapply.co/blog/tailor-resume-to-job-description), [Reztune](https://www.reztune.com/blog/ats-optimization-context/), [LinkedIn Advice](https://www.linkedin.com/advice/3/how-do-you-keep-your-resume-from-being-over-optimized)

---

## 8. PDF/DOCX Technical Rules

### 8.1 PDF Requirements

| Specification | Requirement |
|--------------|-------------|
| **Format** | Text-based PDF (NOT image/scanned). Recommended: PDF/A-1b |
| **Text layer** | All text must be selectable (Ctrl+A, Ctrl+C should work) |
| **Font embedding** | Embed only used characters; prefer standard fonts that don't need embedding |
| **File size** | Target < 200 KB; absolute max < 5 MB (< 2 MB recommended for email) |
| **Security** | No password protection (blocks ATS parsing). Remove before submitting |
| **Export method** | File > Export > Create PDF/XPS (Word) or File > Download as PDF (Google Docs). Avoid "Print to PDF" |
| **Verification** | Open PDF, Ctrl+F to confirm text is searchable. Paste into Notepad to verify reading order |

### 8.2 DOCX Requirements

| Specification | Requirement |
|--------------|-------------|
| **Format** | .docx (not .doc). 100% ATS compatibility |
| **File size** | Target < 300 KB; max < 5 MB |
| **Font embedding** | Limit to used characters only; prefer Arial, Calibri, Times New Roman |
| **Structure** | Body text only; no text boxes, no content in headers/footers |
| **Compatibility** | Test on multiple versions of Word before submitting |

### 8.3 Margins and Spacing

| Element | Specification |
|---------|--------------|
| **Margins** | 0.5" to 1.0" on all sides (0.75"–1.0" safest). Default Word/Docs 1" is fine |
| **Line spacing** | 1.0 to 1.15 for body text (1.1 recommended) |
| **Section spacing** | One blank line before each section heading |
| **Bullet style** | Simple round bullets (&#8226;) or hyphens (-). No icons, arrows, or special characters |
| **Column layout** | Single column only |

### 8.4 File Naming Convention

**Format:** `FirstName_LastName_Resume.pdf` or `FirstName_LastName_Resume.docx`

**Rules:**
- No spaces (use underscores)
- No special characters
- Include your name (recruiters download hundreds of files)
- Do NOT include the company name (looks mass-produced if wrong)

### 8.5 Pre-Submission Verification Checklist

1. [ ] File opens in multiple PDF readers without errors
2. [ ] All text is selectable (not image-based)
3. [ ] Copy-paste into Notepad produces correctly ordered text
4. [ ] File size under 200 KB (PDF) or 300 KB (DOCX)
5. [ ] No password protection or security restrictions
6. [ ] File named correctly (FirstName_LastName_Resume.ext)
7. [ ] Single-column layout with standard section headings
8. [ ] Dates in consistent "Month Year" format throughout
9. [ ] Contact info in document body (not header/footer)
10. [ ] No tables, text boxes, images, or graphics in the document

Sources: [CVCraft](https://cvcraft.roynex.com/blog/ats-friendly-resume-format-guide-2025), [Resumly](https://www.resumly.ai/blog/optimizing-resume-file-formats-for-global-ats-compatibility-and-speed), [SmallPDF](https://smallpdf.com/blog/do-applicant-tracking-systems-prefer-resumes-in-pdf-format)

---

## Appendix A: Quick Reference — Universal ATS-Safe Resume Template

```
[FIRST NAME LAST NAME]
email@domain.com | (555) 123-4567 | linkedin.com/in/name | City, State

PROFESSIONAL SUMMARY
3–4 lines customized per application. Include target role keywords naturally.

TECHNICAL SKILLS
Languages:      [list]
Frameworks:     [list]
Infrastructure: [list]
Data:           [list]

PROFESSIONAL EXPERIENCE

[Job Title] | [Company Name] | [City, State]
[Month Year] – Present
- [Action Verb] + [What] + [How/Technology] + [Quantified Result]
- [Action Verb] + [What] + [How/Technology] + [Quantified Result]
- [Action Verb] + [What] + [How/Technology] + [Quantified Result]

[Job Title] | [Company Name] | [City, State]
[Month Year] – [Month Year]
- [Action Verb] + [What] + [How/Technology] + [Quantified Result]
- [Action Verb] + [What] + [How/Technology] + [Quantified Result]

EDUCATION
[Degree] in [Field] | [University Name] | [Year]

CERTIFICATIONS
[Certification Name] | [Issuing Body] | [Year]
```

---

## Appendix B: ATS Keyword Density Guidelines

| Keyword Type | Target Frequency | Placement |
|-------------|-----------------|-----------|
| Primary required skills | 2–3 times each | Summary + Experience + Skills |
| Secondary required skills | 1–2 times each | Experience + Skills |
| Preferred/nice-to-have skills | 1 time each | Skills or Experience |
| Job title keywords | 2 times | Summary + most recent title (if truthful) |
| Industry terms | 1–2 times | Summary + Experience |
| Total unique keywords | 15–25 | Distributed across all sections |

---

## Appendix C: Source Index

### ATS Parsing & Formatting
- [Jobscan — ATS Formatting Mistakes](https://www.jobscan.co/blog/ats-formatting-mistakes/)
- [Jobscan — ATS Resume Guide 2026](https://www.jobscan.co/blog/20-ats-friendly-resume-templates/)
- [ResumeAdapter — ATS Formatting Rules 2026](https://www.resumeadapter.com/blog/ats-resume-formatting-rules-2026)
- [ResumeGeni — 5 ATS Systems Comparison 2026](https://resumegeni.com/blog/ats-system-guide-2026)
- [Resumemate — Tables, Columns & Text Boxes](https://www.resumemate.io/blog/tables-columns-text-boxes-do-they-break-ats-safer-layouts/)
- [CVCraft — ATS-Friendly Resume Format Guide](https://cvcraft.roynex.com/blog/ats-friendly-resume-format-guide-2025)

### ATS Scoring
- [Scale.jobs — Understanding ATS Scoring Algorithms](https://scale.jobs/blog/understanding-ats-scoring-algorithms)
- [ResumeOptimizerPro — How to Optimize Resume for ATS](https://resumeoptimizerpro.com/blog/how-to-optimize-resume-for-ATS)
- [ResumeGyani — ATS Keyword Matching Algorithm](https://resumegyani.in/ats-guides/ats-keyword-matching-algorithm)
- [MokaHR — ATS Candidate Ranking](https://www.mokahr.io/myblog/ats-candidate-ranking-job-criteria/)

### Recruiter Screening
- [TheLadders — Eye-Tracking Study (PDF)](https://www.theladders.com/static/images/basicSite/pdfs/TheLadders-EyeTracking-StudyC2.pdf)
- [HR Dive — Eye-Tracking Study 7 Seconds](https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/)
- [InterviewPal — How Long Recruiters Spend Reading Resumes](https://www.interviewpal.com/blog/how-long-recruiters-actually-spend-reading-your-resume-data-study)
- [Wonsulting — Hidden Eye Tracker](https://www.wonsulting.com/job-search-hub/hidden-eye-tracker-how-recruiters-actually-read-resumes)
- [ResumeWorded — Resume Red Flags](https://resumeworded.com/resume-red-flags-2023-key-advice)

### Senior SWE Resumes
- [Tech Interview Handbook — Resume Guide](https://www.techinterviewhandbook.org/resume/)
- [BeamJobs — Software Engineer Resume Examples 2026](https://www.beamjobs.com/resumes/software-engineer-resume-examples)
- [ResumeWorded — Senior SWE Resume Examples](https://resumeworded.com/senior-software-engineer-resume-example)

### FAANG / Big Tech
- [SWE Resume — FAANG Resume Guide](https://www.sweresume.app/articles/faang-resume-guide/)
- [TechnCV — FAANG Resume Guide 2026](https://techncv.com/blog/faang-resume-guide)
- [Design Gurus — Best Resume Formats for FAANG 2025](https://www.designgurus.io/blog/best-resume-formats-for-faang-and-top-tech-companies-2025)
- [Exponent — Amazon Leadership Principles Guide 2026](https://www.tryexponent.com/blog/amazon-leadership-principles-interview)

### Scoring Rubrics
- [CloudApper — How to Screen Resumes Effectively](https://www.cloudapper.ai/talent-acquisition/how-to-screen-resumes-effectively/)
- [ProspectX — Candidate Scoring Framework](https://getprospectx.com/blog/candidate-scoring-framework-filter-profiles-interviews)
- [Foundire — Knockout Criteria Design](https://foundire.com/blog/how-to-design-perfect-knockout-criteria/)
- [Indeed — Interview Scoring Sheet](https://www.indeed.com/hire/c/info/scoring-sheet)

### Resume Tailoring Ethics
- [AIApply — Tailor Resume to Job Description](https://aiapply.co/blog/tailor-resume-to-job-description)
- [Reztune — ATS Keyword Optimization Context](https://www.reztune.com/blog/ats-optimization-context/)

### Technical Specs
- [CareerScribeAI — ATS-Friendly Fonts 2026](https://blog.careerscribeai.com/ats-friendly-resume-fonts/)
- [ATS Resume AI — Formatting Guide 2025](https://atsresumeai.com/blog/ats-resume-formatting-guide/)
- [Resumly — Optimizing Resume File Formats](https://www.resumly.ai/blog/optimizing-resume-file-formats-for-global-ats-compatibility-and-speed)
- [SmallPDF — Can ATS Read PDF Resumes](https://smallpdf.com/blog/do-applicant-tracking-systems-prefer-resumes-in-pdf-format)
