'use client';

import { useState } from 'react';
import CopyButton from '@/components/shared/CopyButton';

interface ResumePreviewProps {
  html: string;
  resumeJson: string;
  resumeText: string;
}

export default function ResumePreview({ html, resumeJson, resumeText }: ResumePreviewProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const resumeData = (() => {
    try { return JSON.parse(resumeJson); } catch { return null; }
  })();

  // --- DOCX Download ---
  const handleDocxDownload = async () => {
    if (!resumeData) return;
    setDownloading('docx');
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeData, format: 'docx' }),
      });
      if (!res.ok) throw new Error('DOCX export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tailored-resume.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DOCX download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  // --- PDF Download (server-side via Puppeteer from HTML) ---
  const handlePdfDownload = async () => {
    if (!resumeData) return;
    setDownloading('pdf');
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeData, format: 'pdf' }),
      });
      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tailored-resume.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  // --- HTML Download ---
  const handleHtmlDownload = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailored-resume.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Tailored Resume</h3>
        <div className="flex gap-2">
          <CopyButton text={resumeText} label="Copy Text" />

          {/* DOCX Download — primary */}
          <button
            onClick={handleDocxDownload}
            disabled={downloading === 'docx'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors font-medium"
          >
            {downloading === 'docx' ? 'Generating...' : 'DOCX'}
          </button>

          {/* PDF Download */}
          <button
            onClick={handlePdfDownload}
            disabled={downloading === 'pdf'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors font-medium"
          >
            {downloading === 'pdf' ? 'Generating...' : 'PDF'}
          </button>

          {/* HTML Download */}
          <button
            onClick={handleHtmlDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors font-medium"
          >
            HTML
          </button>
        </div>
      </div>

      {/* HTML Preview — markdown **bold** is rendered as <strong> */}
      <div
        className="p-6 max-h-[800px] overflow-y-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
