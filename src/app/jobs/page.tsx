'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import JobSearchForm, { type SearchFilters } from '@/components/jobs/JobSearchForm';
import JobCard from '@/components/jobs/JobCard';
import JobDetailPanel from '@/components/jobs/JobDetailPanel';

interface JobResult {
  jobId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  postedDate: string;
  salary?: string;
  jobUrl: string;
  applyType?: string;
  applyUrl?: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lastFilters, setLastFilters] = useState<SearchFilters | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (filters: SearchFilters, pageNum = 0) => {
    setLoading(true);
    setError(null);
    if (pageNum === 0) {
      setJobs([]);
      setSelectedJobId(null);
    }

    try {
      const params = new URLSearchParams({
        keywords: filters.keywords,
        location: filters.location,
        datePosted: filters.datePosted,
        page: String(pageNum),
      });

      if (filters.workType) params.set('workType', filters.workType);
      if (filters.experienceLevel) params.set('experienceLevel', filters.experienceLevel);
      if (filters.salary) params.set('salary', filters.salary);
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.externalOnly) params.set('externalOnly', 'true');

      const res = await fetch(`/api/jobs/search?${params}`);
      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();

      if (pageNum === 0) {
        setJobs(data.jobs);
      } else {
        setJobs(prev => [...prev, ...data.jobs]);
      }

      setHasMore(data.hasMore);
      setPage(pageNum);
      setLastFilters(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (lastFilters) {
      handleSearch(lastFilters, page + 1);
    }
  };

  const handleTailor = (jobDetail: any) => {
    // Store job detail in sessionStorage and navigate to tailor page
    sessionStorage.setItem('tailorJob', JSON.stringify({
      title: jobDetail.title,
      company: jobDetail.company,
      location: jobDetail.location,
      description: jobDetail.description,
      jobUrl: jobDetail.jobUrl,
      jobId: jobDetail.jobId,
    }));
    router.push('/tailor?fromJob=true');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Search LinkedIn jobs and tailor your resume for any position
        </p>
      </div>

      {/* Search Form */}
      <JobSearchForm onSearch={handleSearch} loading={loading} />

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {jobs.length > 0 && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Job List (2/5) */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-sm text-gray-500 font-medium">
              {jobs.length} jobs found
            </p>

            {jobs.map(job => (
              <JobCard
                key={job.jobId}
                {...job}
                selected={selectedJobId === job.jobId}
                onSelect={setSelectedJobId}
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full py-2.5 text-sm text-blue-600 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading...' : 'Load More Jobs'}
              </button>
            )}
          </div>

          {/* Job Detail (3/5) */}
          <div className="lg:col-span-3 lg:sticky lg:top-8 lg:self-start">
            <JobDetailPanel
              jobId={selectedJobId}
              externalOnly={lastFilters?.externalOnly}
              onTailor={handleTailor}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && jobs.length === 0 && lastFilters && (
        <div className="mt-8 text-center text-gray-500 text-sm">
          No jobs found. Try adjusting your search filters.
        </div>
      )}
    </div>
  );
}
