'use client';

import { useState } from 'react';

export interface SearchFilters {
  keywords: string;
  location: string;
  workType: string;
  experienceLevel: string;
  datePosted: string;
  salary: string;
  limit: number;
  externalOnly: boolean;
}

const defaultFilters: SearchFilters = {
  keywords: 'senior software engineer',
  location: 'United States',
  workType: 'remote',
  experienceLevel: 'mid-senior',
  datePosted: '24hr',
  salary: '',
  limit: 25,
  externalOnly: true,
};

interface JobSearchFormProps {
  onSearch: (filters: SearchFilters) => void;
  loading: boolean;
  initialFilters?: SearchFilters | null;
}

export default function JobSearchForm({ onSearch, loading, initialFilters }: JobSearchFormProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || defaultFilters);
  const [initialized, setInitialized] = useState(false);

  // Update filters when initialFilters arrives (from cache restore)
  if (initialFilters && !initialized) {
    setFilters(initialFilters);
    setInitialized(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Keywords */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Keywords</label>
          <input
            type="text"
            value={filters.keywords}
            onChange={e => setFilters({ ...filters, keywords: e.target.value })}
            placeholder="senior software engineer, react, typescript..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
          <input
            type="text"
            value={filters.location}
            onChange={e => setFilters({ ...filters, location: e.target.value })}
            placeholder="United States"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Work Type */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Work Type</label>
          <select
            value={filters.workType}
            onChange={e => setFilters({ ...filters, workType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Any</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Experience</label>
          <select
            value={filters.experienceLevel}
            onChange={e => setFilters({ ...filters, experienceLevel: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Any</option>
            <option value="entry">Entry Level</option>
            <option value="associate">Associate</option>
            <option value="mid-senior">Mid-Senior</option>
            <option value="director">Director</option>
            <option value="executive">Executive</option>
          </select>
        </div>

        {/* Date Posted */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date Posted</label>
          <select
            value={filters.datePosted}
            onChange={e => setFilters({ ...filters, datePosted: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="24hr">Last 24 hours</option>
            <option value="week">Past week</option>
            <option value="month">Past month</option>
            <option value="any">Any time</option>
          </select>
        </div>

        {/* Salary Range */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Salary Range</label>
          <select
            value={filters.salary}
            onChange={e => setFilters({ ...filters, salary: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Any</option>
            <option value="1">$40,000+</option>
            <option value="2">$60,000+</option>
            <option value="3">$80,000+</option>
            <option value="4">$100,000+</option>
            <option value="5">$120,000+</option>
            <option value="6">$140,000+</option>
            <option value="7">$160,000+</option>
            <option value="8">$180,000+</option>
            <option value="9">$200,000+</option>
          </select>
        </div>

        {/* Job Count Limit */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Max Results</label>
          <select
            value={filters.limit}
            onChange={e => setFilters({ ...filters, limit: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value={10}>10 jobs</option>
            <option value={25}>25 jobs</option>
            <option value={50}>50 jobs</option>
            <option value={100}>100 jobs</option>
          </select>
        </div>
      </div>

      {/* Bottom row: External Only toggle + Search button */}
      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.externalOnly}
            onChange={e => setFilters({ ...filters, externalOnly: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <span className="text-sm text-gray-700 font-medium">External Apply Only</span>
          <span className="text-xs text-gray-400">(skip Easy Apply)</span>
        </label>

        <button
          type="submit"
          disabled={loading || !filters.keywords.trim()}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Searching...' : 'Search Jobs'}
        </button>
      </div>
    </form>
  );
}
