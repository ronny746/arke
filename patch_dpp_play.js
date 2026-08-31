const fs = require('fs');
const file = 'src/app/student/dpp/[id]/play/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add timeSpentPerQuestion to state
content = content.replace(
  `const [timeSpent, setTimeSpent] = useState(0);`,
  `const [timeSpent, setTimeSpent] = useState(0);\n  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState({});`
);

// 2. Update Stopwatch to track per question
const stopwatch = `  // Stopwatch
  useEffect(() => {
    if (loading || submitted) return;
    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, submitted]);`;

const newStopwatch = `  // Stopwatch
  useEffect(() => {
    if (loading || submitted) return;
    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
      
      // Also increment for current question
      if (session && session.questions && session.questions.length > 0) {
        const qId = session.questions[currentQIdx]?.questionId;
        if (qId) {
          setTimeSpentPerQuestion(prevMap => ({
            ...prevMap,
            [qId]: (prevMap[qId] || 0) + 1
          }));
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, submitted, session, currentQIdx]);`;
content = content.replace(stopwatch, newStopwatch);

// 3. handleOptionSelect -> pass timeSpentSeconds
content = content.replace(
  `        questionId,
        selectedOptionId: optionId,
        status: 'ANSWERED'`,
  `        questionId,
        selectedOptionId: optionId,
        status: 'ANSWERED',
        timeSpentSeconds: timeSpentPerQuestion[questionId] || 0`
);

// 4. handleSubmit -> pass payload
content = content.replace(
  `const res = await studentAPI.submitPracticeSession(id);`,
  `const res = await studentAPI.submitPracticeSession(id, { totalTimeSpentSeconds: timeSpent, timeSpentPerQuestion });`
);

// 5. Solution/Explanation UI -> Add Time spent
const solutionBlock = `                {/* Solution/Explanation (Only visible when submitted) */}
                {submitted && (
                  <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-bold text-blue-900 mb-2 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" /> Solution & Explanation
                    </h3>
                    <div className="prose max-w-none text-blue-800" dangerouslySetInnerHTML={{ __html: currentAnswer?.explanation || currentQuestion?.explanation || '<p>No explanation provided.</p>' }} />
                  </div>
                )}`;

const newSolutionBlock = `                {/* Solution/Explanation (Only visible when submitted) */}
                {submitted && (
                  <div className="mt-8 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h3 className="font-bold text-blue-900 mb-2 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" /> Solution & Explanation
                      </h3>
                      <div className="prose max-w-none text-blue-800" dangerouslySetInnerHTML={{ __html: currentAnswer?.explanation || currentQuestion?.explanation || '<p>No explanation provided.</p>' }} />
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <span className="font-semibold">Time Spent on this Question:</span>
                      </div>
                      <div className="font-bold text-gray-900">
                        {formatTime(currentAnswer?.timeSpentSeconds || 0)}
                      </div>
                    </div>
                  </div>
                )}`;
content = content.replace(solutionBlock, newSolutionBlock);

// 6. Header when submitted -> Show total time spent
const submittedHeader = `              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500 font-semibold">Your Score</div>
                  <div className="text-xl font-bold text-primary-600">{session.score} / {session.totalMarks}</div>
                </div>
                <Button variant="outline" onClick={() => router.push('/student/dpp')}>Exit</Button>
              </div>`;

const newSubmittedHeader = `              <div className="flex items-center gap-6">
                <div className="text-right border-r pr-4">
                  <div className="text-sm text-gray-500 font-semibold flex items-center gap-1 justify-end"><Clock className="w-4 h-4"/> Total Time</div>
                  <div className="text-xl font-bold text-gray-800">{formatTime(session.totalTimeSpentSeconds || timeSpent)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 font-semibold">Your Score</div>
                  <div className="text-xl font-bold text-primary-600">{session.score} / {session.totalMarks}</div>
                </div>
                <Button variant="outline" onClick={() => router.push('/student/dpp')}>Exit</Button>
              </div>`;
content = content.replace(submittedHeader, newSubmittedHeader);

fs.writeFileSync(file, content);
