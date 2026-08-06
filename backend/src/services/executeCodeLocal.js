import vm from 'node:vm';

// ============================================================
// DEV-ONLY LOCAL EXECUTOR
// ============================================================
// This runs JavaScript submissions locally using Node's built-in `vm`
// module instead of calling out to Judge0. `vm` gives *basic* isolation
// (the code can't directly touch your outer variables), but it is NOT
// a real security sandbox — it doesn't stop infinite loops, doesn't
// limit memory, and determined code can still escape it in various
// documented ways.
//
// This is acceptable ONLY because:
// 1. You are running your own code, on your own machine, right now.
// 2. This app is not deployed publicly / no strangers submit code here.
//
// THE MOMENT this app is deployed for other people to use, swap this
// back to the real executeCode.js (Judge0 version) — that file is
// still in your project, untouched.
// ============================================================

function buildDriverCode(userCode, functionName, testInput) {
  return `
${userCode}
${functionName}(...${JSON.stringify(testInput)});
`;
}

export async function runTestCase({ language, userCode, functionName, testCase }) {
  if (language !== 'javascript') {
    return {
      passed: false,
      actual: null,
      expected: testCase.expected,
      error: 'Local executor only supports JavaScript. Add JUDGE0_API_KEY to .env for Python support.',
    };
  }

  try {
    const source = buildDriverCode(userCode, functionName, testCase.input);

    const sandbox = {};
    const context = vm.createContext(sandbox);

    const script = new vm.Script(source);
    const actual = script.runInContext(context, { timeout: 3000 });

    const passed = JSON.stringify(actual) === JSON.stringify(testCase.expected);
    return { passed, actual, expected: testCase.expected, error: null };
  } catch (err) {
    return {
      passed: false,
      actual: null,
      expected: testCase.expected,
      error: err.message,
    };
  }
}

export async function runAllTestCases({ language, userCode, functionName, testCases }) {
  const results = [];
  for (const tc of testCases) {
    const result = await runTestCase({ language, userCode, functionName, testCase: tc });
    results.push({ ...result, hidden: tc.hidden });
  }
  return results;
}