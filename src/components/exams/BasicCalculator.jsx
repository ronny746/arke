"use client";

import { useMemo, useState } from 'react';
import { Calculator, Delete, X } from 'lucide-react';

const keys = [
  '7', '8', '9', '÷',
  '4', '5', '6', '×',
  '1', '2', '3', '−',
  '0', '.', '=', '+'
];

const operatorMap = { '÷': '/', '×': '*', '−': '-' };

function evaluate(expression) {
  const rawNormalized = expression.replace(/[÷×−]/g, key => operatorMap[key]);
  const normalized = rawNormalized.startsWith('-') ? `0${rawNormalized}` : rawNormalized;
  if (!normalized || !/^[0-9.+\-*/\s]+$/.test(normalized) || /[+\-*/.]$/.test(normalized)) return null;

  const tokens = normalized.match(/\d*\.?\d+|[+\-*/]/g);
  if (!tokens?.length) return null;
  const values = [];
  const operators = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const apply = () => {
    const right = values.pop();
    const left = values.pop();
    const operator = operators.pop();
    if (!Number.isFinite(left) || !Number.isFinite(right) || (operator === '/' && right === 0)) return false;
    const result = operator === '+' ? left + right : operator === '-' ? left - right : operator === '*' ? left * right : left / right;
    if (!Number.isFinite(result)) return false;
    values.push(result);
    return true;
  };

  for (const token of tokens) {
    if (/^\d|^\./.test(token)) values.push(Number(token));
    else {
      if (values.length === 0) return null;
      while (operators.length && precedence[operators.at(-1)] >= precedence[token]) {
        if (!apply()) return null;
      }
      operators.push(token);
    }
  }
  while (operators.length && !apply()) return null;
  return values.length === 1 ? values[0] : null;
}

export default function BasicCalculator({ open, onToggle }) {
  const [expression, setExpression] = useState('');
  const [error, setError] = useState(false);
  const display = useMemo(() => expression || '0', [expression]);

  const press = (key) => {
    setError(false);
    if (key === '=') {
      const result = evaluate(expression);
      if (result === null) return setError(true);
      return setExpression(String(Number(result.toFixed(10))));
    }
    const last = expression.at(-1);
    const isOperator = ['+', '−', '×', '÷'].includes(key);
    if (isOperator && (!expression || ['+', '−', '×', '÷'].includes(last))) {
      if (key === '−' && !expression) setExpression('−');
      return;
    }
    if (key === '.' && expression.split(/[+−×÷]/).at(-1)?.includes('.')) return;
    setExpression(value => value.length < 32 ? `${value}${key}` : value);
  };

  return (
    <section className="border-b border-gray-300 bg-white" aria-label="Basic calculator">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex items-center gap-2 text-[12px] font-bold text-gray-700 uppercase tracking-wide">
          <Calculator size={16} className="text-[#31708f]" aria-hidden="true" />
          Basic calculator
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="min-h-8 rounded-[3px] border border-[#8dbbd1] bg-[#e4f3f9] px-2.5 text-[11px] font-bold text-[#31708f] transition-colors hover:bg-[#cfe8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c75b8]"
        >
          {open ? 'Calculator off' : 'Calculator on'}
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3">
          <div aria-live="polite" className={`mb-2 min-h-11 rounded-[3px] border px-3 py-2 text-right font-mono text-lg font-bold ${error ? 'border-red-300 bg-red-50 text-red-700' : 'border-[#bce8f1] bg-[#f5fbfe] text-gray-800'}`}>
            {error ? 'Invalid calculation' : display}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button type="button" onClick={() => { setExpression(''); setError(false); }} className="col-span-2 min-h-10 rounded-[3px] border border-[#dca7a4] bg-[#fbe9e7] text-xs font-bold text-[#a94442] transition-colors hover:bg-[#f7d8d4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9534f]">Clear</button>
            <button type="button" onClick={() => { setExpression(value => value.slice(0, -1)); setError(false); }} aria-label="Delete last calculator entry" className="min-h-10 rounded-[3px] border border-[#e7c67d] bg-[#fcf8e3] text-[#8a6d3b] transition-colors hover:bg-[#f8efc8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0ad4e]"><Delete size={16} className="mx-auto" aria-hidden="true" /></button>
            <button type="button" onClick={onToggle} aria-label="Close calculator" className="min-h-10 rounded-[3px] border border-gray-300 bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c75b8]"><X size={16} className="mx-auto" aria-hidden="true" /></button>
            {keys.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                className={`min-h-10 rounded-[3px] border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c75b8] ${['÷', '×', '−', '+'].includes(key) ? 'border-[#bce8f1] bg-[#e4f3f9] text-[#31708f] hover:bg-[#cfe8f2]' : key === '=' ? 'border-[#4cae4c] bg-[#5cb85c] text-white hover:bg-[#4cae4c]' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100'}`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
