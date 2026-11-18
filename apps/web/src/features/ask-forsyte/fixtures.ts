import { WIRED_AGENT_SLUG } from './config';
import type { Agent, AgentMessageContent } from './types';

// Copied from apps/api: the seeded agents and organisation (prisma/seed.ts)
// and the scripted journey (modules/agent/application/agent.service.ts).
// The answers the chat shows (the last part of each) add markdown that the
// API's plain text lacks, so the stub exercises the renderer. The last one
// also carries unsafe input (raw HTML, a javascript: link, an image).

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
        text: "Yes, you have 3 matters on your **Forsyte** book. Two of them have indicators of *higher-risk jurisdictions*:\n\n1. **Beekeeper employment contract**\n   - Remote onboarding\n   - High-risk third country residence\n2. **Hive acquisition**\n   - Counterparty in a monitored jurisdiction\n\n> Jurisdiction risk comes from each matter's latest risk assessment.\n\nFor context, see the [FATF high-risk jurisdictions list](https://www.fatf-gafi.org/en/countries/black-and-grey-lists.html).",
        meta: { model: MODEL, finishReason: 'stop' },
      },
    ],
  },
  {
    question: 'How many of those have outstanding risk assessments?',
    answers: [
      {
        text: '## Outstanding risk assessments\n\nOut of your 3 seeded matters:\n\n- **2** have risk assessments `in_progress`\n- **1** has a completed **high-risk** assessment\n\n| Status | Matters |\n| --- | --- |\n| In progress | 2 |\n| Completed (high risk) | 1 |\n\nYou can review the outstanding matters and their assessments using the link below.',
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
        text: 'Overall, the Beekeeper employment contract has a completed, **high-risk** assessment driven mainly by:\n\n- remote onboarding\n- outstanding screening checks\n\n### Typical next steps\n\n1. Resolve the pending *identity* and *adverse media* checks.\n2. Document a clear risk-based rationale before proceeding.\n\n```\nriskAssessment: beekeeper-employment-contract\nstatus: completed\nrisk: high\npending: [adverseMedia, highRiskThirdCountryResidence]\n```',
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
        text: 'In summary, you should:\n\n1. Prioritise clearing outstanding risk assessment actions on the **2** in-progress matters.\n2. Review and document your position on the completed high-risk *Beekeeper employment contract*.\n3. Ensure ownership of each matter is clear so follow-up reviews happen promptly.\n\n---\n\n**Safety checks (stub only):** raw HTML <b onclick="alert(1)">should show as text</b>, an [unsafe link](javascript:alert(1)), a [relative link](/matters), an image ![Risk chart](https://example.com/chart.png), and a long token: `riskAssessmentStatus=in_progress&organisationSlug=forsyte&includeFlags=true&sort=-updatedAt`.',
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
