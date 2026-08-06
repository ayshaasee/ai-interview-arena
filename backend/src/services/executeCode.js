import axios from 'axios';

const JUDGE0_URL = process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_KEY = process.env.JUDGE0_API_KEY;

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
};

function buildDriverCode(language, userCode, functionName, testInput) {
  const inputJson = JSON.stringify(testInput);

  if (language === 'javascript') {
    return `
${userCode}
const args = ${inputJson};
const result = ${functionName}(...args);
console.log(JSON.stringify(result));
`;
  }

  if (language === 'python') {
    return `
${userCode}
import json
args = json.loads('${inputJson}')
result = ${functionName}(*args)
print(json.dumps(result))
`;
  }

  throw new Error(`Unsupported language: ${language}`);
}

export async function runTestCase({ language, userCode, functionName, testCase }) {
  const source = buildDriverCode(language, userCode, functionName, testCase.input);

  const submission = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    {
      source_code: source,
      language_id: LANGUAGE_IDS[language],
      cpu_time_limit: 5,
      memory_limit: 128000,
    },
    {
      headers: JUDGE0_KEY
        ? { 'X-RapidAPI-Key': JUDGE0_KEY, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' },
    }
  );

  const { stdout, stderr, compile_output, status } = submission.data;

  if (stderr || compile_output || status?.description !== 'Accepted') {
    return {
      passed: false,
      actual: null,
      expected: testCase.expected,
      error: stderr || compile_output || status?.description || 'Unknown execution error',
    };
  }

  let actual;
  try {
    actual = JSON.parse(stdout.trim());
  } catch {
    actual = stdout.trim();
  }

  const passed = JSON.stringify(actual) === JSON.stringify(testCase.expected);

  return { passed, actual, expected: testCase.expected, error: null };
}

export async function runAllTestCases({ language, userCode, functionName, testCases }) {
  const results = [];
  for (const tc of testCases) {
    const result = await runTestCase({ language, userCode, functionName, testCase: tc });
    results.push({ ...result, hidden: tc.hidden });
  }
  return results;
}