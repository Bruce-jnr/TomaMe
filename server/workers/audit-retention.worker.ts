import { logger } from '../config/logger.js';
import { prisma } from '../db/prisma.js';

const ACTIVE_RETENTION_DAYS = 90;
const ARCHIVE_RETENTION_DAYS = 365;
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

let timer: NodeJS.Timeout | undefined;
let running = false;

export function auditRetentionCutoffs(now = new Date()) {
  return {
    archiveBefore: new Date(now.getTime() - ACTIVE_RETENTION_DAYS * DAY_MS),
    deleteBefore: new Date(now.getTime() - ARCHIVE_RETENTION_DAYS * DAY_MS),
  };
}

export async function enforceAuditRetention(now = new Date()) {
  const { archiveBefore, deleteBefore } = auditRetentionCutoffs(now);
  const deleted = await prisma.auditLog.deleteMany({
    where: { archivedAt: { lte: deleteBefore } },
  });
  const archived = await prisma.auditLog.updateMany({
    where: { archivedAt: null, createdAt: { lte: archiveBefore } },
    data: { archivedAt: now },
  });
  return { archived: archived.count, deleted: deleted.count };
}

async function run() {
  if (running) return;
  running = true;
  try {
    const result = await enforceAuditRetention();
    if (result.archived || result.deleted) logger.info(result, 'Audit log retention completed');
  } catch (error) {
    logger.error({ err: error }, 'Audit log retention failed');
  } finally {
    running = false;
  }
}

export function startAuditRetentionWorker() {
  timer = setInterval(() => void run(), RUN_INTERVAL_MS);
  timer.unref();
  void run();
}

export function stopAuditRetentionWorker() {
  if (timer) clearInterval(timer);
}
