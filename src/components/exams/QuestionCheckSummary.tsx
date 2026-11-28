"use client";

import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface QuestionCheck {
  total: number;
  totalMarks: number;
  byType: Record<string, number>;
  issueCount: number;
  issues: { number: number; questionId: string | null; type: string; problems: string[]; snippet: string }[];
  ok: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  MCQ: 'MCQ',
  MULTIPLE_CORRECT: 'Multiple correct',
  INTEGER: 'Integer',
  NUMERICAL: 'Numerical',
  TRUE_FALSE: 'True/False',
  SUBJECTIVE: 'Subjective',
  ASSERTION_REASON: 'Assertion-Reason',
  MATCH_THE_COLUMN: 'Match the column',
  STATEMENT_BASED: 'Statement based',
  FILL_BLANKS: 'Fill in the blanks',
  PARAGRAPH: 'Paragraph',
};

// Upload summary shown to the admin after any question upload or save.
export function QuestionCheckSummary({ check, title = 'Upload check', onClose }: { check: QuestionCheck | null | undefined; title?: string; onClose?: () => void }) {
  if (!check) return null;
  return (
    <div
      role="status"
      className={`rounded-xl border p-4 space-y-3 ${check.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {check.ok
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            : <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />}
          <div>
            <h4 className="font-semibold text-gray-900">{title}: {check.total} question{check.total === 1 ? '' : 's'}, {check.totalMarks} marks</h4>
            <p className={`text-sm ${check.ok ? 'text-emerald-800' : 'text-amber-900'}`}>
              {check.ok ? 'No problems found.' : `${check.issueCount} question${check.issueCount === 1 ? ' needs' : 's need'} fixing.`}
            </p>
          </div>
        </div>
        {onClose && (
          <button type="button" aria-label="Close upload check" onClick={onClose} className="p-1 rounded-md text-gray-500 hover:bg-white/60">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(check.byType || {}).map(([type, count]) => (
          <span key={type} className="text-xs font-medium px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
            {TYPE_LABELS[type] || type}: {count}
          </span>
        ))}
      </div>

      {!check.ok && (
        <ul className="divide-y divide-amber-200 max-h-80 overflow-y-auto rounded-lg bg-white border border-amber-200">
          {check.issues.map((issue) => (
            <li key={`${issue.number}-${issue.questionId || ''}`} className="p-3 text-sm">
              <div className="font-semibold text-gray-900">
                Q{issue.number} <span className="font-normal text-gray-500">({TYPE_LABELS[issue.type] || issue.type})</span>
              </div>
              {issue.snippet && <div className="text-gray-500 truncate">{issue.snippet}</div>}
              <ul className="mt-1 list-disc pl-5 text-amber-900">
                {issue.problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default QuestionCheckSummary;
