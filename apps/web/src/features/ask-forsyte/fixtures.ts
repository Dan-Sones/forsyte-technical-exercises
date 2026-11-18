import { WIRED_AGENT_SLUG } from './config';
import type { Agent, AgentMessageContent } from './types';

// Copied from apps/api: the seeded agents and organisation (prisma/seed.ts)
// and the scripted journey (modules/agent/application/agent.service.ts).

export const ORGANISATION_ID = 'org_forsyte';

const MODEL = 'forsyte.ask-forsyte-mock-1-alpha-v5';
const SEEDED_AT = '2026-01-01T00:00:00.000Z';

export const AGENTS: Agent[] = [
  {
    id: 'agt_anthropic_sonnet',
    name: 'Anthropic Sonnet Agent',
    slug: 'unwired-agent',
    description: 'Placeholder agent that is not wired yet.',
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: 'agt_wired_compliance',
    name: 'Wired Compliance Agent',
    slug: WIRED_AGENT_SLUG,
    description: 'Mock agent wired for demo conversation.',
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];

export type JourneyStep = {
  /** The question as a user would type it; its slug is what the API matches. */
  question: string;
  answers: AgentMessageContent[];
};

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    question: 'Do I have matters in high risk jurisdictions?',
    answers: [
      {
        text: 'Yes, you have 3 matters on your Forsyte book. Two of those matters have indicators that they may involve higher-risk jurisdictions based on their risk assessments.',
        meta: { model: MODEL, finishReason: 'stop' },
      },
    ],
  },
  {
    question: 'How many of those have outstanding risk assessments?',
    answers: [
      {
        text: 'Out of your 3 seeded matters, 2 currently have risk assessments in progress and 1 has a completed high-risk assessment.\n\nYou can review the outstanding matters and their assessments using the link below.',
        resources: [
          {
            rel: 'mattersWithOutstandingRiskAssessments',
            href: '/v1/matters?organisationSlug=forsyte&riskAssessmentStatus=in_progress',
          },
        ],
        meta: { model: MODEL, finishReason: 'stop' },
      },
    ],
  },
  {
    question:
      'Show the risk assessment flags for the Beekeeper employment contract',
    answers: [
      {
        text: 'Here are the seeded risk assessment flags for the Beekeeper employment contract:\n\n- Remote identity verification: accepted\n- Identity confidence: accepted\n- Sanctions screening: accepted\n- Adverse media: pending\n- High-risk third country residence: pending\n\nI will summarise what this means and suggested next steps next.',
        resources: [
          {
            rel: 'riskAssessmentFlags',
            href: '/v1/risk-assessments/{beekeeperRiskId}/flags',
          },
        ],
        meta: { model: MODEL, finishReason: 'length' },
      },
      {
        text: 'Overall, the Beekeeper employment contract has a completed, high-risk assessment driven mainly by remote onboarding and outstanding screening checks. Typical next steps would include resolving the pending identity and adverse media checks and documenting a clear risk-based rationale before proceeding.',
        resources: [
          {
            rel: 'riskAssessmentDetails',
            href: '/v1/risk-assessments/{beekeeperRiskId}',
          },
        ],
        meta: { model: MODEL, finishReason: 'stop' },
      },
    ],
  },
  {
    question:
      'Summarise the matters with outstanding items and suggest next steps',
    answers: [
      {
        text: 'Across your seeded Forsyte matters, there are outstanding items on 2 in-progress risk assessments and one completed high-risk assessment on the Beekeeper employment contract. I will summarise the overall position and suggested next steps next.',
        resources: [
          {
            rel: 'mattersWithOutstandingRiskAssessments',
            href: '/v1/matters?organisationSlug=forsyte&riskAssessmentStatus=in_progress',
          },
        ],
        meta: { model: MODEL, finishReason: 'length' },
      },
      {
        text: 'In summary, you should (1) prioritise clearing outstanding risk assessment actions on the 2 in-progress matters, (2) review and document your position on the completed high-risk Beekeeper employment contract, and (3) ensure ownership of each matter is clear so follow-up reviews happen promptly.',
        resources: [
          {
            rel: 'allSeededRiskAssessments',
            href: '/v1/risk-assessments?organisationSlug=forsyte',
          },
        ],
        meta: { model: MODEL, finishReason: 'stop' },
      },
    ],
  },
];

export const SUGGESTED_QUESTIONS = JOURNEY_STEPS.map((step) => step.question);
