import axios from 'axios';

const MOCK_MODE = !process.env.ANTHROPIC_API_KEY;

if (MOCK_MODE) {
  console.warn('⚠️  ANTHROPIC_API_KEY not set — running AI interviewer in MOCK MODE (fake responses, no cost).');
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

async function callClaude(systemPrompt, messages) {
  const response = await axios.post(
    ANTHROPIC_URL,
    {
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    }
  );

  const text = response.data.content.map((block) => block.text || '').join('\n');
  const cleaned = text.replace(/```json|```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`AI response was not valid JSON: ${text}`);
  }
  return JSON.parse(jsonMatch[0]);
}

function fakeDelay(ms = 900) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateFollowUp({ problem, userCode, language, transcript }) {
  if (MOCK_MODE) {
    await fakeDelay();
    return {
      follow_up_question: `[MOCK] Your solution passes the visible tests — can you walk me through the time complexity of your approach, and is there a way to reduce it?`,
      reasoning: 'mock response',
    };
  }

  const systemPrompt = `You are a senior software engineer conducting a live technical interview.
You have just watched the candidate write a solution. Ask exactly ONE sharp,
specific follow-up question — the kind a real interviewer asks to probe
depth: time/space complexity, an edge case they may have missed, or how
they'd extend the solution. Do NOT be generic ("can you optimize this?" is
too vague — instead say WHAT part looks optimizable and why).

Respond with ONLY this JSON shape, nothing else:
{
  "follow_up_question": "string",
  "reasoning": "one sentence on why you're asking this — for internal logging, not shown to the user verbatim"
}`;

  const messages = [
    ...transcript,
    {
      role: 'user',
      content: `Problem: ${problem.title}\n${problem.description}\n\nCandidate's ${language} solution:\n${userCode}\n\nAsk your follow-up question now.`,
    },
  ];

  return callClaude(systemPrompt, messages);
}

export async function evaluateResponse({ problem, transcript, candidateReply }) {
  if (MOCK_MODE) {
    await fakeDelay();
    return {
      action: 'wrap_up',
      message: `[MOCK] Good explanation — that covers what I wanted to check. Let's wrap up here.`,
    };
  }

  const systemPrompt = `You are continuing a live technical interview. The candidate just
responded to your last follow-up question. Either:
(a) ask ONE more focused follow-up if there's a genuinely important gap left, or
(b) decide the discussion is sufficient and signal it's time to wrap up.

Respond with ONLY this JSON shape:
{
  "action": "follow_up" | "wrap_up",
  "message": "your next question, OR a brief closing remark if wrapping up"
}`;

  const messages = [...transcript, { role: 'user', content: candidateReply }];

  return callClaude(systemPrompt, messages);
}

export async function generateFinalReport({ problem, userCode, transcript, testResults }) {
  const passedCount = testResults.filter((r) => r.passed).length;

  if (MOCK_MODE) {
    await fakeDelay();
    return {
      correctness: testResults.length ? Math.round((passedCount / testResults.length) * 10) : 5,
      efficiency: 7,
      communication: 7,
      summary: `[MOCK REPORT] Passed ${passedCount}/${testResults.length} tests. This is a fake AI report — set ANTHROPIC_API_KEY in your .env to get real interview feedback.`,
    };
  }

  const systemPrompt = `You are a senior engineer wrapping up a technical interview. Based on
the full conversation and test results, rate the candidate on three
dimensions from 0-10 and give a short written summary of their performance
(2-3 sentences, direct and specific, like real interview feedback — not
generic praise).

Respond with ONLY this JSON shape:
{
  "correctness": 0-10,
  "efficiency": 0-10,
  "communication": 0-10,
  "summary": "string"
}`;

  const messages = [
    ...transcript,
    {
      role: 'user',
      content: `Test results: ${passedCount}/${testResults.length} passed.\nFinal code:\n${userCode}\n\nProvide your final rating now.`,
    },
  ];

  return callClaude(systemPrompt, messages);
}