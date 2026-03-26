/**
 * Format a timestamp ID to a readable date string
 * Input: "2026-03-24T08-21-03" → "Mar 24, 2026 8:21 AM"
 */
export function formatDate(id: string): string {
  try {
    const isoString = id.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return id;
  }
}

/**
 * Get score color class based on threshold
 */
export function scoreColor(score: number): string {
  if (score >= 85) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get score background class
 */
export function scoreBgColor(score: number): string {
  if (score >= 85) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Format score improvement as "+14" or "-3"
 */
export function formatImprovement(before: number, after: number): string {
  const diff = after - before;
  return diff >= 0 ? `+${diff}` : `${diff}`;
}

/**
 * Extract ID from filename: "tailored-2026-03-24T08-21-03.json" → "2026-03-24T08-21-03"
 */
export function filenameToId(filename: string): string {
  return filename.replace('tailored-', '').replace('.json', '');
}

/**
 * Convert ID back to filename
 */
export function idToFilename(id: string): string {
  return `tailored-${id}.json`;
}
