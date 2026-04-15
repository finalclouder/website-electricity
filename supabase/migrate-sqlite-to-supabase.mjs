#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`One-time SQLite -> Supabase migration script

Usage:
  node supabase/migrate-sqlite-to-supabase.mjs
  node supabase/migrate-sqlite-to-supabase.mjs --db ./data/patctc.db

Environment:
  SUPABASE_URL=https://<project-ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

Notes:
- Defaults to ./data/patctc.db first, then ./patctc.db if not found.
- Uses upsert so rerunning the script updates existing rows by primary key.
- Migration order: users -> landing_config -> posts -> documents -> comments -> likes -> shares
`);
  process.exit(0);
}

function getArgValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function resolveSqlitePath() {
  const explicitPath = getArgValue('--db');
  const candidates = explicitPath
    ? [explicitPath]
    : [
        path.resolve(process.cwd(), 'data', 'patctc.db'),
        path.resolve(process.cwd(), 'patctc.db'),
      ];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) return resolved;
  }

  throw new Error(
    `Could not find a SQLite database. Checked: ${candidates.map(candidate => path.resolve(candidate)).join(', ')}`
  );
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function chunk(array, size = 500) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL in .env');
  }

  if (supabaseUrl.includes('supabase.com/dashboard')) {
    throw new Error('SUPABASE_URL must be the project API URL (https://<project-ref>.supabase.co), not the dashboard URL');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function readTable(sqlite, tableName, orderBy = 'rowid') {
  return sqlite.prepare(`SELECT * FROM ${tableName} ORDER BY ${orderBy}`).all();
}

function buildCommentLevels(rows) {
  const allById = new Map(rows.map(row => [row.id, row]));
  const remaining = new Map(allById);
  const insertedIds = new Set();
  const levels = [];

  while (remaining.size > 0) {
    const level = [];

    for (const [id, row] of remaining) {
      const parentId = row.parent_id;
      if (!parentId || insertedIds.has(parentId) || !allById.has(parentId)) {
        level.push(row);
      }
    }

    if (level.length === 0) {
      throw new Error(`Could not resolve comment parent dependencies for ${remaining.size} rows`);
    }

    levels.push(level);

    for (const row of level) {
      insertedIds.add(row.id);
      remaining.delete(row.id);
    }
  }

  return levels;
}

async function upsertRows(supabase, tableName, rows, onConflict, batchSize = 500) {
  if (rows.length === 0) {
    console.log(`[skip] ${tableName}: 0 rows`);
    return;
  }

  const batches = chunk(rows, batchSize);
  console.log(`[migrate] ${tableName}: ${rows.length} rows in ${batches.length} batch(es)`);

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict, ignoreDuplicates: false });

    if (error) {
      throw new Error(`[${tableName}] batch ${index + 1}/${batches.length} failed: ${error.message}`);
    }
  }
}

function mapUsers(rows) {
  return rows.map(row => ({
    id: String(row.id),
    name: row.name,
    email: String(row.email).trim().toLowerCase(),
    password: row.password,
    avatar: row.avatar || '',
    bio: row.bio || '',
    role: row.role || 'user',
    status: row.status || 'approved',
    created_at: row.created_at || null,
  }));
}

function mapPosts(rows) {
  return rows.map(row => ({
    id: String(row.id),
    author_id: String(row.author_id),
    content: row.content,
    images: parseJson(row.images, []),
    attachment_name: row.attachment_name || '',
    category: row.category || 'general',
    shares: Number(row.shares || 0),
    created_at: row.created_at || null,
  }));
}

function mapDocuments(rows) {
  return rows.map(row => ({
    id: String(row.id),
    title: row.title,
    description: row.description || '',
    author_id: String(row.author_id),
    data_snapshot: row.data_snapshot,
    status: row.status || 'draft',
    tags: parseJson(row.tags, []),
    created_at: row.created_at || null,
    updated_at: row.updated_at || row.created_at || null,
  }));
}

function mapComments(rows) {
  return rows.map(row => ({
    id: String(row.id),
    post_id: String(row.post_id),
    author_id: String(row.author_id),
    content: row.content,
    parent_id: row.parent_id ? String(row.parent_id) : null,
    edited_at: row.edited_at || null,
    created_at: row.created_at || null,
  }));
}

function mapLikes(rows) {
  return rows.map(row => ({
    user_id: String(row.user_id),
    target_type: row.target_type,
    target_id: String(row.target_id),
    created_at: row.created_at || null,
  }));
}

function mapShares(rows) {
  return rows.map(row => ({
    user_id: String(row.user_id),
    post_id: String(row.post_id),
    created_at: row.created_at || null,
  }));
}

function mapLandingConfig(rows) {
  return rows.map(row => ({
    id: Number(row.id),
    config_json: parseJson(row.config_json, {}),
    updated_at: row.updated_at || null,
  }));
}

async function main() {
  const sqlitePath = resolveSqlitePath();
  const supabase = createSupabaseClient();

  console.log(`Using SQLite source: ${sqlitePath}`);
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });

  try {
    const users = mapUsers(readTable(sqlite, 'users', 'created_at ASC, id ASC'));
    const landingConfig = mapLandingConfig(readTable(sqlite, 'landing_config', 'id ASC'));
    const posts = mapPosts(readTable(sqlite, 'posts', 'created_at ASC, id ASC'));
    const documents = mapDocuments(readTable(sqlite, 'documents', 'created_at ASC, id ASC'));
    const comments = mapComments(readTable(sqlite, 'comments', 'created_at ASC, id ASC'));
    const likes = mapLikes(readTable(sqlite, 'likes', 'created_at ASC, user_id ASC, target_type ASC, target_id ASC'));
    const shares = mapShares(readTable(sqlite, 'shares', 'created_at ASC, user_id ASC, post_id ASC'));

    console.log('Source counts:', {
      users: users.length,
      landing_config: landingConfig.length,
      posts: posts.length,
      documents: documents.length,
      comments: comments.length,
      likes: likes.length,
      shares: shares.length,
    });

    await upsertRows(supabase, 'users', users, 'id');
    await upsertRows(supabase, 'landing_config', landingConfig, 'id');
    await upsertRows(supabase, 'posts', posts, 'id');
    await upsertRows(supabase, 'documents', documents, 'id');

    const commentLevels = buildCommentLevels(comments);
    for (let index = 0; index < commentLevels.length; index += 1) {
      console.log(`[migrate] comments level ${index + 1}/${commentLevels.length}: ${commentLevels[index].length} rows`);
      await upsertRows(supabase, 'comments', commentLevels[index], 'id');
    }

    await upsertRows(supabase, 'likes', likes, 'user_id,target_type,target_id');
    await upsertRows(supabase, 'shares', shares, 'user_id,post_id');

    console.log('Migration completed successfully.');
  } finally {
    sqlite.close();
  }
}

main().catch(error => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
