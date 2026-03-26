// ============================================================================
// Skills Taxonomy — Synonym mapping for ATS keyword matching
// Focused on IT/Software Engineering roles
// ============================================================================

/**
 * Maps a skill to its known synonyms/abbreviations
 * Key: lowercase canonical name
 * Value: array of alternative forms (also lowercase)
 */
export const SKILLS_TAXONOMY: Record<string, string[]> = {
  // --- Programming Languages ---
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'es2020', 'es2022'],
  'typescript': ['ts'],
  'python': ['python3', 'py'],
  'golang': ['go', 'go lang'],
  'rust': ['rustlang'],
  'c++': ['cpp', 'c plus plus'],
  'c#': ['csharp', 'c sharp', '.net'],
  'java': ['jdk', 'jvm'],
  'ruby': ['rb'],
  'swift': ['swiftui'],
  'kotlin': ['kt'],
  'php': ['laravel', 'symfony'],
  'scala': ['akka'],
  'elixir': ['phoenix'],

  // --- Frontend Frameworks ---
  'react': ['react.js', 'reactjs', 'react 18', 'react 19'],
  'next.js': ['nextjs', 'next js', 'next'],
  'angular': ['angular.js', 'angularjs', 'ng'],
  'vue': ['vue.js', 'vuejs', 'vue 3'],
  'svelte': ['sveltekit'],
  'react native': ['rn', 'react-native'],
  'flutter': ['dart'],

  // --- Backend Frameworks ---
  'node.js': ['nodejs', 'node js', 'node'],
  'express': ['express.js', 'expressjs'],
  'fastapi': ['fast api'],
  'django': ['django rest framework', 'drf'],
  'spring': ['spring boot', 'springboot'],
  'rails': ['ruby on rails', 'ror'],
  'nest.js': ['nestjs', 'nest js'],
  'fastify': [],
  'hono': [],

  // --- Databases ---
  'postgresql': ['postgres', 'psql', 'pg'],
  'mysql': ['mariadb'],
  'mongodb': ['mongo', 'mongoose'],
  'redis': ['elasticache'],
  'elasticsearch': ['elastic', 'elk', 'opensearch'],
  'dynamodb': ['dynamo db', 'dynamo'],
  'cassandra': ['scylladb'],
  'sqlite': ['sqlite3'],
  'supabase': [],
  'prisma': ['prisma orm'],
  'drizzle': ['drizzle orm'],

  // --- Cloud & Infrastructure ---
  'aws': ['amazon web services', 'amazon cloud'],
  'gcp': ['google cloud', 'google cloud platform'],
  'azure': ['microsoft azure', 'ms azure'],
  'kubernetes': ['k8s', 'kube'],
  'docker': ['containers', 'containerization', 'dockerfile'],
  'terraform': ['iac', 'infrastructure as code', 'hcl'],
  'ansible': [],
  'cloudformation': ['cfn'],
  'pulumi': [],

  // --- CI/CD ---
  'ci/cd': ['ci cd', 'cicd', 'continuous integration', 'continuous deployment', 'continuous delivery'],
  'github actions': ['gh actions'],
  'jenkins': [],
  'gitlab ci': ['gitlab-ci'],
  'circleci': ['circle ci'],
  'argo cd': ['argocd'],

  // --- Messaging & Streaming ---
  'kafka': ['apache kafka', 'confluent'],
  'rabbitmq': ['rabbit mq', 'amqp'],
  'sqs': ['amazon sqs'],
  'sns': ['amazon sns'],
  'nats': [],
  'pulsar': ['apache pulsar'],

  // --- Monitoring & Observability ---
  'datadog': [],
  'grafana': ['grafana + prometheus'],
  'prometheus': ['prom'],
  'new relic': ['newrelic'],
  'splunk': [],
  'elk stack': ['elasticsearch logstash kibana'],
  'opentelemetry': ['otel'],

  // --- API & Architecture ---
  'rest': ['restful', 'rest api', 'restful api'],
  'graphql': ['gql', 'apollo graphql'],
  'grpc': ['g rpc', 'protocol buffers', 'protobuf'],
  'microservices': ['micro-services', 'micro services', 'service-oriented architecture', 'soa'],
  'monorepo': ['mono repo', 'mono-repo', 'nx', 'turborepo'],
  'event-driven': ['event driven architecture', 'eda', 'event sourcing', 'cqrs'],
  'serverless': ['lambda', 'cloud functions', 'faas'],

  // --- Testing ---
  'unit testing': ['unit tests', 'jest', 'vitest', 'pytest', 'junit'],
  'integration testing': ['integration tests'],
  'e2e testing': ['end-to-end testing', 'cypress', 'playwright', 'selenium'],
  'tdd': ['test-driven development', 'test driven development'],

  // --- Methodologies ---
  'agile': ['scrum', 'kanban', 'sprint', 'sprints'],
  'devops': ['dev ops', 'sre', 'site reliability'],
  'system design': ['systems design', 'architecture design', 'distributed systems'],

  // --- Soft Skills ---
  'leadership': ['team lead', 'tech lead', 'leading teams'],
  'mentoring': ['mentorship', 'coaching', 'onboarding'],
  'cross-functional': ['cross functional', 'stakeholder management', 'collaboration'],
  'communication': ['presenting', 'documentation', 'technical writing'],
};

/**
 * Find all synonyms for a given skill (bidirectional)
 */
export function findSynonyms(skill: string): string[] {
  const lower = skill.toLowerCase();

  // Direct lookup
  if (SKILLS_TAXONOMY[lower]) {
    return [lower, ...SKILLS_TAXONOMY[lower]];
  }

  // Reverse lookup — find which canonical skill this is a synonym of
  for (const [canonical, synonyms] of Object.entries(SKILLS_TAXONOMY)) {
    if (synonyms.includes(lower)) {
      return [canonical, ...synonyms];
    }
  }

  return [lower];
}

/**
 * Normalize a skill name to its canonical form
 */
export function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase();

  if (SKILLS_TAXONOMY[lower]) return lower;

  for (const [canonical, synonyms] of Object.entries(SKILLS_TAXONOMY)) {
    if (synonyms.includes(lower)) return canonical;
  }

  return lower;
}
