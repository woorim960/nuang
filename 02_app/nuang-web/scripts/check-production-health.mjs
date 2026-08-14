import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import {
  createHealthReport,
  evaluateDatabaseSnapshot,
  formatHealthReport,
  runHttpProbes,
} from "./lib/production-health-monitor.mjs";

const args = new Set(process.argv.slice(2));
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
  ...process.env,
};
const httpOnly = args.has("--http-only");
const json = args.has("--json");
const origin =
  readArgument("--origin=") ??
  env.NUANG_MONITOR_APP_ORIGIN ??
  "https://nuang.app";
const connectionString = env.NUANG_DATABASE_URL ?? env.DATABASE_URL;
const databaseCaPath = env.NUANG_DATABASE_CA_FILE
  ? resolve(env.NUANG_DATABASE_CA_FILE)
  : new URL(
      "../config/certificates/supabase-prod-ca-2021.crt",
      import.meta.url,
    );
const lookbackMinutes = 90;
const feedMediaR2MaxManagedBytes = parseIntegerInRange(
  env.FEED_MEDIA_R2_MAX_MANAGED_BYTES,
  1_000_000_000,
  9_500_000_000,
  8_000_000_000,
);
const checks = [];

try {
  checks.push(...(await runHttpChecks(origin)));
} catch (error) {
  checks.push({
    detail: `HTTP probe setup failed (${safeErrorCode(error)})`,
    id: "http:setup",
    status: "fail",
  });
}

if (!httpOnly) {
  if (!connectionString) {
    checks.push({
      detail: "DATABASE_URL or NUANG_DATABASE_URL is required",
      id: "database:configuration",
      status: "fail",
    });
  } else {
    try {
      const databaseCa = readFileSync(databaseCaPath, "utf8");
      const snapshot = await readDatabaseSnapshot(
        connectionString,
        lookbackMinutes,
        databaseCa,
        feedMediaR2MaxManagedBytes,
      );
      checks.push(...evaluateDatabaseSnapshot(snapshot));
    } catch (error) {
      checks.push({
        detail: `read-only database probe failed (${safeErrorCode(error)})`,
        id: "database:probe",
        status: "fail",
      });
    }
  }
}

const report = createHealthReport(checks);
console.log(json ? JSON.stringify(report) : formatHealthReport(report));
if (report.status === "fail") process.exitCode = 1;

async function runHttpChecks(targetOrigin) {
  return runHttpProbes({ origin: targetOrigin });
}

async function readDatabaseSnapshot(
  databaseUrl,
  recentMinutes,
  databaseCa,
  mediaMaxManagedBytes,
) {
  const client = new pg.Client({
    application_name: "nuang-production-monitor",
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    ssl: { ca: databaseCa, rejectUnauthorized: true },
  });

  try {
    await client.connect();
    await client.query("begin read only");
    await client.query("set local statement_timeout = '5s'");
    const capacity = await client.query(`
        select
          pg_database_size(current_database())::text as "databaseBytes",
          (
            select count(*)::integer
            from pg_stat_activity
            where datname = current_database()
          ) as "connectionCount",
          current_setting('max_connections')::integer as "maxConnections",
          current_setting('transaction_read_only')::boolean as "transactionReadOnly",
          pg_total_relation_size('cron.job_run_details'::regclass)::text as "cronHistoryBytes"
      `);
    const cronJobs = await client.query(
      `
          with recent_run as (
            select *
            from cron.job_run_details
            order by runid desc
            limit 10000
          )
          select
            job.jobname,
            job.schedule,
            job.active,
            count(run.*) filter (
              where run.start_time >= now() - make_interval(mins => $1)
            )::integer as "recentRuns",
            count(run.*) filter (
              where run.start_time >= now() - make_interval(mins => $1)
                and run.end_time is not null
                and run.status <> 'succeeded'
            )::integer as "recentFailures",
            count(run.*) filter (
              where run.end_time is null
                and run.start_time < now() - interval '5 minutes'
            )::integer as "stuckRuns",
            max(run.end_time) filter (
              where run.status = 'succeeded'
            ) as "lastSuccessAt",
            (array_agg(run.status order by run.runid desc) filter (
              where run.runid is not null
            ))[1] as "lastRunStatus",
            (array_agg(run.start_time order by run.runid desc) filter (
              where run.runid is not null
            ))[1] as "lastRunAt",
            coalesce(max(
              extract(epoch from (run.end_time - run.start_time)) * 1000
            ) filter (
              where run.start_time >= now() - make_interval(mins => $1)
                and run.end_time is not null
            ), 0)::double precision as "maxDurationMs"
          from cron.job as job
          left join recent_run as run on run.jobid = job.jobid
          where job.jobname like 'nuang-%'
          group by job.jobid, job.jobname, job.schedule, job.active
          order by job.jobname
        `,
      [recentMinutes],
    );
    const queues = await client.query(
      `
          select
            (
              (now() at time zone 'Asia/Seoul')::time >= time '08:00'
              and (now() at time zone 'Asia/Seoul')::time < time '21:00'
            ) as "marketingWindowOpen",
            exists (
              select 1
              from consent.marketing_channel_control
              where channel = 'email' and emergency_paused = true
            ) as "marketingEmergencyPaused",
            (select count(*) from public.advertising_mail_outbox
              where status in ('pending', 'retry')
                and next_attempt_at <= now()
                and attempt_count < 5
            )::integer as "advertisingDue",
            (select min(next_attempt_at) from public.advertising_mail_outbox
              where status in ('pending', 'retry')
                and next_attempt_at <= now()
                and attempt_count < 5
            ) as "advertisingOldestDueAt",
            (select count(*) from public.advertising_mail_outbox
              where (
                status = 'sending'
                and claimed_at < now() - interval '15 minutes'
              ) or (
                status in ('pending', 'retry', 'sending')
                and attempt_count >= 5
              )
            )::integer as "advertisingStale",
            (select count(*) from public.advertising_mail_outbox
              where status = 'dead'
                and updated_at >= now() - make_interval(mins => $1)
            )::integer as "advertisingRecentDead",
            (select count(*)
              from consent.marketing_campaign_recipient as recipient
              join consent.marketing_campaign as campaign on campaign.id = recipient.campaign_id
              where campaign.status in ('queued', 'sending')
                and recipient.control_version = campaign.control_version
                and coalesce(campaign.scheduled_at, now()) <= now()
                and recipient.status in ('queued', 'retry')
                and recipient.next_attempt_at <= now()
                and recipient.attempt_count < 5
            )::integer as "marketingCampaignDue",
            (select min(recipient.next_attempt_at)
              from consent.marketing_campaign_recipient as recipient
              join consent.marketing_campaign as campaign on campaign.id = recipient.campaign_id
              where campaign.status in ('queued', 'sending')
                and recipient.control_version = campaign.control_version
                and coalesce(campaign.scheduled_at, now()) <= now()
                and recipient.status in ('queued', 'retry')
                and recipient.next_attempt_at <= now()
                and recipient.attempt_count < 5
            ) as "marketingCampaignOldestDueAt",
            (select count(*)
              from consent.marketing_campaign_recipient as recipient
              join consent.marketing_campaign as campaign on campaign.id = recipient.campaign_id
              where campaign.status in ('queued', 'sending')
                and recipient.control_version = campaign.control_version
                and coalesce(campaign.scheduled_at, now()) <= now()
                and (
                  (
                    recipient.status = 'sending'
                    and recipient.claimed_at < now() - interval '15 minutes'
                  ) or (
                    recipient.status in ('queued', 'retry', 'sending')
                    and recipient.attempt_count >= 5
                  )
                )
            )::integer as "marketingCampaignStale",
            (select count(*) from consent.marketing_campaign_recipient
              where status = 'failed'
                and updated_at >= now() - make_interval(mins => $1)
            )::integer as "marketingCampaignRecentFailed",
            (select count(*) from consent.marketing_consent_confirmation_outbox
              where status in ('queued', 'retry')
                and next_attempt_at <= now()
                and attempt_count < 5
            )::integer as "marketingConfirmationDue",
            (select min(next_attempt_at) from consent.marketing_consent_confirmation_outbox
              where status in ('queued', 'retry')
                and next_attempt_at <= now()
                and attempt_count < 5
            ) as "marketingConfirmationOldestDueAt",
            (select count(*) from consent.marketing_consent_confirmation_outbox
              where (
                status = 'sending'
                and claimed_at < now() - interval '15 minutes'
              ) or (
                status in ('queued', 'retry', 'sending')
                and attempt_count >= 5
              )
            )::integer as "marketingConfirmationStale",
            (select count(*) from consent.marketing_consent_confirmation_outbox
              where status = 'failed'
                and updated_at >= now() - make_interval(mins => $1)
            )::integer as "marketingConfirmationRecentFailed",
            (select count(*) from feed.official_community_content
              where lifecycle_status = 'scheduled'
                and scheduled_for <= now()
            )::integer as "communityPublishDue",
            (select min(scheduled_for) from feed.official_community_content
              where lifecycle_status = 'scheduled'
                and scheduled_for <= now()
            ) as "communityPublishOldestDueAt",
            (select count(*) from feed.official_community_content
              where lifecycle_status = 'published'
                and response_closes_at is not null
                and response_closes_at <= now()
            )::integer as "communityCloseDue",
            (select min(response_closes_at) from feed.official_community_content
              where lifecycle_status = 'published'
                and response_closes_at is not null
                and response_closes_at <= now()
            ) as "communityCloseOldestDueAt"
        `,
      [recentMinutes],
    );
    const tombstones = await client.query(
      `
          select
            count(*)::integer as total,
            count(*) filter (
              where deleted_at >= now() - make_interval(mins => $1)
            )::integer as recent
          from assessment.result_deletion_tombstone
        `,
      [recentMinutes],
    );
    const mediaSchema = await client.query(`
      select
        to_regclass('feed.feed_media_storage_reservation') is not null
        and to_regclass('feed.media_storage_cleanup_queue') is not null
        and exists (
          select 1 from pg_attribute
          where attrelid = to_regclass('feed.feed_post_media')
            and attname in ('storage_provider', 'storage_accounted')
            and attnum > 0
            and not attisdropped
          group by attrelid
          having count(*) = 2
        ) as ready
    `);
    const mediaStorage = mediaSchema.rows[0]?.ready
      ? await client.query(
          `
        select
          $1::bigint::text as "maxManagedBytes",
          coalesce((
            select sum(media.byte_size::bigint)
            from feed.feed_post_media media
            where media.storage_provider = 'cloudflare_r2'
              and media.storage_accounted
          ), 0)::text as "activeBytes",
          coalesce((
            select sum(reservation.byte_size)
            from feed.feed_media_storage_reservation reservation
            where reservation.storage_provider = 'cloudflare_r2'
              and reservation.expires_at > now()
          ), 0)::text as "reservedBytes",
          coalesce((
            select sum(cleanup.byte_size)
            from feed.media_storage_cleanup_queue cleanup
            where cleanup.storage_provider = 'cloudflare_r2'
              and cleanup.resolved_at is null
          ), 0)::text as "cleanupBytes",
          (select count(*)::integer
            from feed.media_storage_cleanup_queue cleanup
            where cleanup.resolved_at is null
              and cleanup.guard_account_id is null
              and cleanup.next_attempt_at <= now()
          ) as "cleanupPending",
          (select min(cleanup.next_attempt_at)
            from feed.media_storage_cleanup_queue cleanup
            where cleanup.resolved_at is null
              and cleanup.guard_account_id is null
              and cleanup.next_attempt_at <= now()
          ) as "cleanupOldestAt",
          (select count(*)::integer
            from feed.feed_post_media media
            where media.storage_accounted
              and media.deleted_at is not null
              and media.optimized_at is not null
          ) as "pendingUploadCount",
          (select min(media.optimized_at)
            from feed.feed_post_media media
            where media.storage_accounted
              and media.deleted_at is not null
              and media.optimized_at is not null
          ) as "pendingUploadOldestAt"
          `,
          [mediaMaxManagedBytes],
        )
      : {
          rows: [
            {
              activeBytes: "0",
              cleanupBytes: "0",
              cleanupOldestAt: null,
              cleanupPending: 0,
              maxManagedBytes: String(mediaMaxManagedBytes),
              pendingUploadCount: 0,
              pendingUploadOldestAt: null,
              reservedBytes: "0",
            },
          ],
        };

    await client.query("rollback");
    return {
      capacity: capacity.rows[0],
      cronJobs: cronJobs.rows,
      queues: queues.rows[0],
      mediaStorage: mediaStorage.rows[0],
      tombstones: tombstones.rows[0],
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

function readArgument(prefix) {
  const argument = process.argv
    .slice(2)
    .find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function readEnvFile(fileName) {
  const path = resolve(fileName);
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator === -1) return [line, ""];
        const key = line.slice(0, separator).trim();
        const rawValue = line.slice(separator + 1).trim();
        const value =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;
        return [key, value];
      }),
  );
}

function safeErrorCode(error) {
  if (typeof error?.code === "string") return error.code;
  if (typeof error?.name === "string") return error.name;
  return "unavailable";
}

function parseIntegerInRange(value, minimum, maximum, fallback) {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  if (!/^\d+$/.test(value.trim())) return fallback;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}
