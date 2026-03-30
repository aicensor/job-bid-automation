'use client';

interface ResumeFile {
  name: string;
  size: number;
}

interface ResumeSelectorProps {
  resumes: ResumeFile[];
  selected: string;
  onSelect: (name: string) => void;
  disabled?: boolean;
}

export default function ResumeSelector({ resumes, selected, onSelect, disabled }: ResumeSelectorProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        Select Resume
      </label>
      <div className="space-y-2">
        {resumes.map((resume) => (
          <label
            key={resume.name}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              disabled
                ? 'opacity-50 cursor-not-allowed border-gray-100'
                : selected === resume.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="resume"
              value={resume.name}
              checked={selected === resume.name}
              onChange={() => onSelect(resume.name)}
              disabled={disabled}
              className="text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{resume.name}</p>
              <p className="text-xs text-gray-500">{(resume.size / 1024).toFixed(0)} KB</p>
            </div>
            {selected === resume.name && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Selected</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
