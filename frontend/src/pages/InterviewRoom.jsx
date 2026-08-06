import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../api/client.js';

// The interview has phases we track explicitly rather than inferring
// state from scattered booleans — this makes the UI logic much easier
// to reason about ("what do I show right now?" always maps to one enum).
const PHASE = {
  CODING: 'coding',
  INTERVIEWING: 'interviewing', // AI chat back-and-forth in progress
  COMPLETED: 'completed', // final report shown
};

export default function InterviewRoom() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [code, setCode] = useState('');
  const [language] = useState('javascript'); // hardcode for MVP; add a picker later
  const [testResults, setTestResults] = useState(null);
  const [running, setRunning] = useState(false);

  const [phase, setPhase] = useState(PHASE.CODING);
  const [transcript, setTranscript] = useState([]); // [{role, content}] for rendering the chat
  const [replyDraft, setReplyDraft] = useState('');
  const [aiThinking, setAiThinking] = useState(false);

  const [finalReport, setFinalReport] = useState(null);

  // Ref to the function name we extract from starter code, so /run and
  // /complete know what function to actually invoke inside the sandbox.
  const functionNameRef = useRef('solution');

  // Load the problem, then immediately create a session row in the DB
  // so we have a sessionId to attach all subsequent actions (run, chat,
  // complete) to. One session = one full interview attempt, start to finish.
  useEffect(() => {
    async function init() {
      const { data: problemData } = await api.get(`/problems/${slug}`);
      setProblem(problemData);

      const starter = problemData.starter_code[language] || '';
      setCode(starter);
      functionNameRef.current = extractFunctionName(starter);

      const { data: session } = await api.post('/sessions', {
        problemId: problemData.id,
        language,
      });
      setSessionId(session.id);
    }
    init();
  }, [slug, language]);

  async function handleRun() {
    setRunning(true);
    setTestResults(null);
    try {
      const { data } = await api.post(`/sessions/${sessionId}/run`, {
        code,
        functionName: functionNameRef.current,
      });
      setTestResults(data);

      // Once all VISIBLE tests pass, prompt them to start the AI
      // follow-up round rather than auto-triggering it — the user
      // should feel in control of when the "interview" part begins.
    } finally {
      setRunning(false);
    }
  }

  async function startInterview() {
    setPhase(PHASE.INTERVIEWING);
    setAiThinking(true);
    try {
      const { data } = await api.post(`/sessions/${sessionId}/interview`);
      setTranscript([{ role: 'assistant', content: data.question }]);
    } finally {
      setAiThinking(false);
    }
  }

  async function sendReply() {
    if (!replyDraft.trim()) return;
    const myReply = replyDraft;
    setReplyDraft('');
    setTranscript((prev) => [...prev, { role: 'user', content: myReply }]);
    setAiThinking(true);

    try {
      const { data } = await api.post(`/sessions/${sessionId}/reply`, { reply: myReply });
      setTranscript((prev) => [...prev, { role: 'assistant', content: data.message }]);

      if (data.action === 'wrap_up') {
        // Give the user a beat to read the closing remark before we
        // jump straight to the scored report.
        setTimeout(finishInterview, 1500);
      }
    } finally {
      setAiThinking(false);
    }
  }

  async function finishInterview() {
    setAiThinking(true);
    try {
      const { data } = await api.post(`/sessions/${sessionId}/complete`, {
        functionName: functionNameRef.current,
      });
      setFinalReport(data);
      setPhase(PHASE.COMPLETED);
    } finally {
      setAiThinking(false);
    }
  }

  if (!problem) return <p className="page">Loading problem...</p>;

  const allVisiblePassed =
    testResults && testResults.results.filter((r) => !r.hidden).every((r) => r.passed);

  return (
    <div className="interview-room">
      <div className="problem-pane">
        <h2>{problem.title}</h2>
        <span className={`badge badge-${problem.difficulty}`}>{problem.difficulty}</span>
        <p>{problem.description}</p>
      </div>

      <div className="editor-pane">
        <Editor
          height="400px"
          language={language}
          value={code}
          onChange={(value) => setCode(value ?? '')}
          theme="vs-dark"
          options={{ fontSize: 14, minimap: { enabled: false } }}
        />

        <div className="editor-actions">
          <button onClick={handleRun} disabled={running || phase !== PHASE.CODING}>
            {running ? 'Running...' : 'Run Tests'}
          </button>
        </div>

        {testResults && (
          <div className="test-results">
            <p>
              {testResults.passedCount}/{testResults.total} tests passed
            </p>
            {testResults.results.map((r, i) => (
              <div key={i} className={`test-row ${r.passed ? 'pass' : 'fail'}`}>
                {r.hidden ? 'Hidden test' : `Test ${i + 1}`}: {r.passed ? '✅ Passed' : '❌ Failed'}
                {!r.hidden && !r.passed && (
                  <span>
                    {' '}
                    (expected {JSON.stringify(r.expected)}, got {JSON.stringify(r.actual)})
                  </span>
                )}
              </div>
            ))}

            {allVisiblePassed && phase === PHASE.CODING && (
              <button className="start-interview-btn" onClick={startInterview}>
                Start AI Follow-up Interview →
              </button>
            )}
          </div>
        )}
      </div>

      {phase !== PHASE.CODING && (
        <div className="chat-pane">
          <h3>AI Interviewer</h3>
          <div className="chat-log">
            {transcript.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <strong>{msg.role === 'assistant' ? 'Interviewer' : 'You'}:</strong> {msg.content}
              </div>
            ))}
            {aiThinking && <div className="chat-msg assistant thinking">Thinking...</div>}
          </div>

          {phase === PHASE.INTERVIEWING && (
            <div className="chat-input">
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Type your response..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
              />
              <button onClick={sendReply} disabled={aiThinking}>
                Send
              </button>
            </div>
          )}

          {phase === PHASE.COMPLETED && finalReport && (
            <div className="final-report">
              <h3>Interview Report</h3>
              <p>Correctness: {finalReport.correctness}/10</p>
              <p>Efficiency: {finalReport.efficiency}/10</p>
              <p>Communication: {finalReport.communication}/10</p>
              <p>{finalReport.summary}</p>
              <button onClick={() => navigate('/problems')}>Back to problems</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Pulls the function name out of starter code like
// "function twoSum(nums, target) {" → "twoSum"
// This is a simple regex, good enough for our seeded problems' starter
// code format. If you add problems with a different starter code shape,
// you'll need to make this smarter (or store function_name explicitly
// in the problems table instead of parsing it — worth revisiting).
function extractFunctionName(starterCode) {
  const match = starterCode.match(/function\s+(\w+)\s*\(/);
  return match ? match[1] : 'solution';
}
