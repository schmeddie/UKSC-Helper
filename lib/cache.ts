/**
 * Judgment caching system to avoid re-processing
 * Saves money by storing formatted judgments on disk
 */

import fs from 'fs';
import path from 'path';

interface CachedJudgment {
  citation: string;
  blocks: Array<{
    type: 'h2' | 'h3' | 'p' | 'quote';
    text: string;
  }>;
  cachedAt: string;
  version: string; // Cache version for invalidation if format changes
}

const CACHE_VERSION = '1.0';
const CACHE_DIR = path.join(process.cwd(), '.cache', 'judgments');

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Get cache file path for a citation
 */
function getCachePath(citation: string): string {
  // Sanitize citation for filename (replace / with -)
  const filename = citation.replace(/\//g, '-') + '.json';
  return path.join(CACHE_DIR, filename);
}

/**
 * Check if a formatted judgment exists in cache
 */
export function hasCachedJudgment(citation: string): boolean {
  try {
    const cachePath = getCachePath(citation);
    return fs.existsSync(cachePath);
  } catch (error) {
    console.error('Error checking cache:', error);
    return false;
  }
}

/**
 * Get a formatted judgment from cache
 * Returns null if not found or invalid
 */
export function getCachedJudgment(citation: string): CachedJudgment['blocks'] | null {
  try {
    const cachePath = getCachePath(citation);

    if (!fs.existsSync(cachePath)) {
      return null;
    }

    const data = fs.readFileSync(cachePath, 'utf-8');
    const cached: CachedJudgment = JSON.parse(data);

    // Validate cache version
    if (cached.version !== CACHE_VERSION) {
      console.log(`Cache version mismatch for ${citation}, invalidating`);
      fs.unlinkSync(cachePath);
      return null;
    }

    console.log(`✅ Cache HIT for ${citation} (cached at ${cached.cachedAt})`);
    return cached.blocks;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Save a formatted judgment to cache
 */
export function setCachedJudgment(
  citation: string,
  blocks: Array<{
    type: 'h2' | 'h3' | 'p' | 'quote';
    text: string;
  }>
): void {
  try {
    ensureCacheDir();

    const cached: CachedJudgment = {
      citation,
      blocks,
      cachedAt: new Date().toISOString(),
      version: CACHE_VERSION,
    };

    const cachePath = getCachePath(citation);
    fs.writeFileSync(cachePath, JSON.stringify(cached, null, 2), 'utf-8');

    console.log(`💾 Cached judgment ${citation} (${blocks.length} blocks)`);
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

/**
 * Clear all cached judgments
 */
export function clearCache(): void {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
      console.log(`🗑️  Cleared ${files.length} cached judgments`);
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  count: number;
  totalSize: number;
} {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      return { count: 0, totalSize: 0 };
    }

    const files = fs.readdirSync(CACHE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const stats = fs.statSync(path.join(CACHE_DIR, file));
      totalSize += stats.size;
    }

    return {
      count: files.length,
      totalSize,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { count: 0, totalSize: 0 };
  }
}
