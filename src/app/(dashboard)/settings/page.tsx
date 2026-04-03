'use client';

import { useState, useEffect } from 'react';

interface AutoQueueConfig {
  enabled: boolean;
  search: {
    keywords: string;
    location: string;
    workType: string;
    experienceLevel: string;
    datePosted: string;
    salary: string;
    externalOnly: boolean;
  };
  filter: {
    maxJobsPerRun: number;
    minKeywordMatchPercent: number;
    excludeCompanies: string[];
    excludeTitlePatterns: string[];
    requireTitlePatterns: string[];
  };
  autoRun: {
    enabled: boolean;
  };
}

export default function SettingsPage() {
  const [config, setConfig] = useState<AutoQueueConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Temp string states for array fields
  const [excludeCompanies, setExcludeCompanies] = useState('');
  const [excludeTitles, setExcludeTitles] = useState('');
  const [requireTitles, setRequireTitles] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setConfig(data.autoQueue);
        setExcludeCompanies(data.autoQueue.filter.excludeCompanies.join(', '));
        setExcludeTitles(data.autoQueue.filter.excludeTitlePatterns.join(', '));
        setRequireTitles(data.autoQueue.filter.requireTitlePatterns.join(', '));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    const updated = {
      ...config,
      filter: {
        ...config.filter,
        excludeCompanies: excludeCompanies.split(',').map(s => s.trim()).filter(Boolean),
        excludeTitlePatterns: excludeTitles.split(',').map(s => s.trim()).filter(Boolean),
        requireTitlePatterns: requireTitles.split(',').map(s => s.trim()).filter(Boolean),
      },
    };

    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoQueue: updated }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading || !config) {
    return <div className="text-sm text-gray-400 py-12 text-center">Loading settings...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure auto-queue and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Auto-Queue Search Criteria */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Auto-Queue — Search Criteria</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Keywords</label>
              <input
                type="text"
                value={config.search.keywords}
                onChange={e => setConfig({ ...config, search: { ...config.search, keywords: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
              <input
                type="text"
                value={config.search.location}
                onChange={e => setConfig({ ...config, search: { ...config.search, location: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Work Type</label>
              <select
                value={config.search.workType}
                onChange={e => setConfig({ ...config, search: { ...config.search, workType: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Any</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Experience</label>
              <select
                value={config.search.experienceLevel}
                onChange={e => setConfig({ ...config, search: { ...config.search, experienceLevel: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Any</option>
                <option value="entry">Entry Level</option>
                <option value="associate">Associate</option>
                <option value="mid-senior">Mid-Senior</option>
                <option value="director">Director</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Salary Range</label>
              <select
                value={config.search.salary}
                onChange={e => setConfig({ ...config, search: { ...config.search, salary: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Any</option>
                <option value="4">$100,000+</option>
                <option value="5">$120,000+</option>
                <option value="6">$140,000+</option>
                <option value="7">$160,000+</option>
                <option value="8">$180,000+</option>
                <option value="9">$200,000+</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.search.externalOnly}
                onChange={e => setConfig({ ...config, search: { ...config.search, externalOnly: e.target.checked } })}
                className="w-4 h-4 rounded border-gray-300 text-orange-600"
              />
              <span className="text-sm text-gray-700">External Apply Only</span>
            </label>
          </div>
        </div>

        {/* Filtering Rules */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Auto-Queue — Filtering</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Jobs Per Run</label>
              <input
                type="number"
                min={1}
                max={50}
                value={config.filter.maxJobsPerRun}
                onChange={e => setConfig({ ...config, filter: { ...config.filter, maxJobsPerRun: parseInt(e.target.value) || 10 } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Min Keyword Match %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.filter.minKeywordMatchPercent}
                onChange={e => setConfig({ ...config, filter: { ...config.filter, minKeywordMatchPercent: parseInt(e.target.value) || 0 } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">% of your resume skills found in job description</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Required Title Patterns (comma-separated)</label>
              <input
                type="text"
                value={requireTitles}
                onChange={e => setRequireTitles(e.target.value)}
                placeholder="senior, staff, lead, principal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Title must contain at least one</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Exclude Companies</label>
              <p className="text-xs text-gray-400 mb-2">Manage in the Company Blacklist section below</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Exclude Title Patterns (comma-separated)</label>
              <input
                type="text"
                value={excludeTitles}
                onChange={e => setExcludeTitles(e.target.value)}
                placeholder="intern, junior, associate, entry"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Auto-Run */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Auto-Run</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoRun.enabled}
              onChange={e => setConfig({ ...config, autoRun: { ...config.autoRun, enabled: e.target.checked } })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">Auto-run queue after adding jobs</span>
          </label>
          <p className="text-xs text-gray-400 mt-1">When enabled, the queue will automatically start processing after auto-queue adds jobs</p>
        </div>

        {/* Company Blacklist Editor */}
        <CompanyBlacklistEditor
          companies={excludeCompanies.split(',').map(s => s.trim()).filter(Boolean)}
          onChange={(list) => setExcludeCompanies(list.join(', '))}
        />

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
            }`}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Company Blacklist Editor ---

function CompanyBlacklistEditor({ companies, onChange }: { companies: string[]; onChange: (list: string[]) => void }) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    // Support comma-separated batch add
    const newCompanies = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    const unique = newCompanies.filter(c => !companies.some(existing => existing.toLowerCase() === c.toLowerCase()));
    if (unique.length > 0) {
      onChange([...companies, ...unique]);
    }
    setInput('');
  };

  const handleRemove = (company: string) => {
    onChange(companies.filter(c => c !== company));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const filtered = search
    ? companies.filter(c => c.toLowerCase().includes(search.toLowerCase()))
    : companies;

  // Common outsourcing/staffing companies
  const suggestions = [
    'Accenture', 'Infosys', 'Wipro', 'TCS', 'Cognizant', 'HCL Technologies',
    'Tech Mahindra', 'Capgemini', 'DXC Technology', 'NTT Data',
    'Randstad', 'Robert Half', 'Hays', 'ManpowerGroup', 'Adecco',
    'Staffigo', 'Revature', 'Syntel', 'Mphasis', 'LTIMindtree',
  ].filter(s => !companies.some(c => c.toLowerCase() === s.toLowerCase()));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Company Blacklist</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Jobs from these companies will be automatically skipped ({companies.length} blocked)
          </p>
        </div>
      </div>

      {/* Add Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add company name (or comma-separated list)..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          Block
        </button>
      </div>

      {/* Quick Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Quick add (common staffing/outsourcing):</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 12).map(s => (
              <button
                key={s}
                onClick={() => onChange([...companies, s])}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + List */}
      {companies.length > 0 && (
        <>
          {companies.length > 5 && (
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search blacklist..."
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm mb-3 outline-none focus:ring-1 focus:ring-gray-300"
            />
          )}

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.map(company => (
              <div key={company} className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg group">
                <span className="text-sm text-red-800 font-medium">{company}</span>
                <button
                  onClick={() => handleRemove(company)}
                  className="text-xs text-red-400 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {filtered.length === 0 && search && (
            <p className="text-xs text-gray-400 text-center py-2">No matches for &ldquo;{search}&rdquo;</p>
          )}

          {/* Bulk Actions */}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-400">{companies.length} companies blocked</span>
            <button
              onClick={() => { if (confirm('Remove all companies from blacklist?')) onChange([]); }}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Clear All
            </button>
          </div>
        </>
      )}

      {companies.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No companies blacklisted yet</p>
      )}
    </div>
  );
}
