'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function TailorProgress() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    'Parsing job description...',
    'Scoring base resume...',
    'Analyzing skill gaps...',
    'Rewriting experience bullets...',
    'Generating targeted summary...',
    'Injecting keywords...',
    'Cleaning AI phrases...',
    'Validating truthfulness...',
    'Final scoring...',
  ];

  // Estimate current step based on elapsed time (rough 10s per step)
  const currentStep = Math.min(Math.floor(elapsed / 10), steps.length - 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <LoadingSpinner size="lg" />
      <h3 className="text-lg font-semibold mt-4 mb-2">Tailoring your resume...</h3>
      <p className="text-sm text-gray-500 mb-6">This typically takes 60~180 seconds</p>

      <div className="max-w-md mx-auto space-y-2 text-left">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-center gap-2 text-sm ${
            i < currentStep ? 'text-green-600' :
            i === currentStep ? 'text-blue-600 font-medium' :
            'text-gray-300'
          }`}>
            <span>{i < currentStep ? '\u2713' : i === currentStep ? '\u25CF' : '\u25CB'}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6">Elapsed: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</p>
    </div>
  );
}
