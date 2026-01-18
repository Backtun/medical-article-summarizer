/**
 * Job Queue Service
 *
 * Provides async job processing for PDF uploads.
 * Uses in-memory queue for development.
 * Can be replaced with BullMQ/Redis for production.
 */

import {
  randomUUID
} from 'crypto';

// Job statuses
const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// In-memory job store
const jobs = new Map();

// Job expiration (1 hour)
const JOB_TTL_MS = 60 * 60 * 1000;

/**
 * Create a new job
 * @param {string} type - Job type (e.g., 'pdf_process')
 * @param {Object} data - Job data
 * @returns {string} - Job ID
 */
export function createJob(type, data) {
  const jobId = randomUUID();

  const job = {
    id: jobId,
    type,
    data,
    status: JOB_STATUS.PENDING,
    progress: 0,
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  };

  jobs.set(jobId, job);

  // Schedule cleanup
  setTimeout(() => {
    jobs.delete(jobId);
  }, JOB_TTL_MS);

  return jobId;
}

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 * @returns {Object|null} - Job object or null
 */
export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

/**
 * Update job status
 * @param {string} jobId - Job ID
 * @param {Object} updates - Updates to apply
 */
export function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (!job) return null;

  Object.assign(job, {
    ...updates,
    updatedAt: new Date().toISOString()
  });

  if (updates.status === JOB_STATUS.COMPLETED || updates.status === JOB_STATUS.FAILED) {
    job.completedAt = new Date().toISOString();
  }

  jobs.set(jobId, job);
  return job;
}

/**
 * Set job progress
 * @param {string} jobId - Job ID
 * @param {number} progress - Progress percentage (0-100)
 */
export function setJobProgress(jobId, progress) {
  return updateJob(jobId, {
    progress,
    status: JOB_STATUS.PROCESSING
  });
}

/**
 * Complete job with result
 * @param {string} jobId - Job ID
 * @param {Object} result - Job result
 */
export function completeJob(jobId, result) {
  return updateJob(jobId, {
    status: JOB_STATUS.COMPLETED,
    progress: 100,
    result
  });
}

/**
 * Fail job with error
 * @param {string} jobId - Job ID
 * @param {string} error - Error message
 */
export function failJob(jobId, error) {
  return updateJob(jobId, {
    status: JOB_STATUS.FAILED,
    error
  });
}

/**
 * Get all jobs (for debugging)
 * @returns {Object[]} - Array of jobs
 */
export function getAllJobs() {
  return Array.from(jobs.values());
}

/**
 * Get job statistics
 * @returns {Object} - Job stats
 */
export function getJobStats() {
  const allJobs = getAllJobs();

  return {
    total: allJobs.length,
    pending: allJobs.filter(j => j.status === JOB_STATUS.PENDING).length,
    processing: allJobs.filter(j => j.status === JOB_STATUS.PROCESSING).length,
    completed: allJobs.filter(j => j.status === JOB_STATUS.COMPLETED).length,
    failed: allJobs.filter(j => j.status === JOB_STATUS.FAILED).length
  };
}

/**
 * Clear all jobs
 */
export function clearJobs() {
  jobs.clear();
}

export {
  JOB_STATUS
};

export default {
  createJob,
  getJob,
  updateJob,
  setJobProgress,
  completeJob,
  failJob,
  getAllJobs,
  getJobStats,
  clearJobs,
  JOB_STATUS
};