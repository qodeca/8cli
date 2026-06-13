// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { Command } from 'commander';
import { resolve, relative, join, dirname } from 'node:path';
import { readdirSync, mkdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { resolveConfig } from '../config.js';
import { InternalApiClient } from '../client/internal-api.js';
import type { InternalWorkflow } from '../client/internal-api.js';
import type { Folder, Config } from '../types.js';
import { outputError, outputJson } from '../formatters/index.js';

// ── Types ──────────────────────────────────────────────────────────────────

interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderTreeNode[];
}

interface SyncMove {
  workflowId: string;
  workflowName: string;
  from: string;
  to: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create an authenticated InternalApiClient from resolved config.
 */
async function createInternalClient(config: Config): Promise<InternalApiClient> {
  if (!config.email || !config.password) {
    outputError(
      'Email and password required for folder operations. Use `auth set-credentials` or N8N_EMAIL/N8N_PASSWORD env vars.',
      'ERR_NO_CREDENTIALS',
    );
  }
  if (!config.url) {
    outputError('n8n URL is required. Use --url flag or N8N_URL env var.', 'ERR_NO_URL');
  }

  const client = new InternalApiClient(config.url, config.verbose);
  await client.login(config.email, config.password);
  return client;
}

/**
 * Build nested tree from flat folder list.
 */
function buildTree(folders: Folder[]): FolderTreeNode[] {
  const byId = new Map<string, FolderTreeNode>();

  for (const f of folders) {
    byId.set(f.id, {
      id: f.id,
      name: f.name,
      parentId: f.parentFolderId ?? null,
      children: [],
    });
  }

  const roots: FolderTreeNode[] = [];

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children alphabetically at each level
  const sortChildren = (nodes: FolderTreeNode[]): void => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };
  sortChildren(roots);

  return roots;
}

/**
 * Print indented tree to stdout.
 */
function printTree(nodes: FolderTreeNode[], indent = 0): void {
  for (const node of nodes) {
    process.stdout.write(`${'  '.repeat(indent)}${node.name}/\n`);
    if (node.children.length > 0) {
      printTree(node.children, indent + 1);
    }
  }
}

/**
 * Find a folder by name (case-insensitive).
 */
function findFolderByName(folders: Folder[], name: string): Folder | undefined {
  return folders.find((f) => f.name.toLowerCase() === name.toLowerCase());
}

/**
 * Build the full path for a folder by walking up parents.
 */
function folderPath(folderId: string, byId: Map<string, Folder>): string {
  const parts: string[] = [];
  let currentId: string | undefined = folderId;
  const seen = new Set<string>();

  while (currentId && byId.has(currentId)) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const node: Folder = byId.get(currentId)!;
    parts.push(node.name);
    currentId = node.parentFolderId;
  }

  parts.reverse();
  return parts.join('/');
}

/**
 * Get the folder path for a workflow.
 */
function workflowFolderPath(wf: InternalWorkflow, byId: Map<string, Folder>): string {
  const parent = wf.parentFolder;
  if (parent && typeof parent === 'object' && parent.id) {
    return folderPath(parent.id, byId);
  }
  return '';
}

/**
 * Recursively find all JSON files in a directory.
 */
function findJsonFiles(dir: string): string[] {
  const results: string[] = [];

  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Remove empty directories recursively (bottom-up).
 */
function removeEmptyDirs(dir: string, rootDir: string): void {
  if (!existsSync(dir) || dir === rootDir) return;

  const entries = readdirSync(dir);
  if (entries.length === 0) {
    rmSync(dir);
    // Try parent too
    removeEmptyDirs(dirname(dir), rootDir);
  }
}

// ── Commands ───────────────────────────────────────────────────────────────

export function registerFolderCommands(program: Command): void {
  const folderCmd = program
    .command('folder')
    .description('Manage folders (uses internal API with cookie auth)');

  // ── tree ──────────────────────────────────────────────────────────────

  folderCmd
    .command('tree')
    .description('Show folder tree')
    .action(async () => {
      const parentOpts = program.opts();
      const config = await resolveConfig(parentOpts);
      const client = await createInternalClient(config);

      const folders = await client.getFolders();

      if (folders.length === 0) {
        outputJson([]);
        return;
      }

      const tree = buildTree(folders);

      if (config.table) {
        printTree(tree);
      } else {
        outputJson(tree);
      }
    });

  // ── create ────────────────────────────────────────────────────────────

  folderCmd
    .command('create <name>')
    .description('Create a new folder')
    .option('--parent <name>', 'Parent folder name')
    .action(async (name: string, opts: { parent?: string }) => {
      const parentOpts = program.opts();
      const config = await resolveConfig(parentOpts);
      const client = await createInternalClient(config);

      let parentFolderId: string | undefined;

      if (opts.parent) {
        const folders = await client.getFolders();
        const parent = findFolderByName(folders, opts.parent);
        if (!parent) {
          outputError(`Parent folder '${opts.parent}' not found`, 'ERR_FOLDER_NOT_FOUND');
        }
        parentFolderId = parent.id;
      }

      const result = await client.createFolder(name, parentFolderId);
      outputJson({
        id: result.id,
        name: result.name,
        parentFolderId: result.parentFolderId ?? null,
      });
    });

  // ── delete ────────────────────────────────────────────────────────────

  folderCmd
    .command('delete <name>')
    .description('Delete an empty folder')
    .action(async (name: string) => {
      const parentOpts = program.opts();
      const config = await resolveConfig(parentOpts);
      const client = await createInternalClient(config);

      const folders = await client.getFolders();
      const target = findFolderByName(folders, name);
      if (!target) {
        outputError(`Folder '${name}' not found`, 'ERR_FOLDER_NOT_FOUND');
      }

      await client.deleteFolder(target.id);
      outputJson({ deleted: { id: target.id, name: target.name } });
    });

  // ── move ──────────────────────────────────────────────────────────────

  folderCmd
    .command('move <workflow-name>')
    .description('Move a workflow to a folder')
    .requiredOption('--to <folder>', 'Target folder name (or "(root)" for no folder)')
    .action(async (workflowName: string, opts: { to: string }) => {
      const parentOpts = program.opts();
      const config = await resolveConfig(parentOpts);
      const client = await createInternalClient(config);

      // Find workflow by name (case-insensitive)
      const workflows = await client.getWorkflows();
      const wf = workflows.find((w) => w.name.toLowerCase() === workflowName.toLowerCase());
      if (!wf) {
        outputError(`Workflow '${workflowName}' not found`, 'ERR_WORKFLOW_NOT_FOUND');
      }

      // Find target folder
      let folderId: string | null = null;
      if (opts.to.toLowerCase() !== '(root)') {
        const folders = await client.getFolders();
        const target = findFolderByName(folders, opts.to);
        if (!target) {
          outputError(`Folder '${opts.to}' not found`, 'ERR_FOLDER_NOT_FOUND');
        }
        folderId = target.id;
      }

      await client.moveWorkflow(wf.id, folderId);
      outputJson({
        moved: {
          workflowId: wf.id,
          workflowName: wf.name,
          toFolder: opts.to,
        },
      });
    });

  // ── sync ──────────────────────────────────────────────────────────────

  folderCmd
    .command('sync')
    .description('Sync local files to match n8n folder structure')
    .option('--dir <path>', 'Workflow files directory (default: from config)')
    .action(async (opts: { dir?: string }) => {
      const parentOpts = program.opts();
      const config = await resolveConfig(parentOpts);
      const client = await createInternalClient(config);
      const dry = config.dry;

      const workflowDir = resolve(opts.dir ?? config.workflowDir);

      if (!existsSync(workflowDir)) {
        outputError(`Workflow directory not found: ${workflowDir}`, 'ERR_DIR_NOT_FOUND');
      }

      // Fetch folders and workflows from server
      const folders = await client.getFolders();
      const byId = new Map<string, Folder>(folders.map((f) => [f.id, f]));

      const workflows = await client.getWorkflows();
      if (workflows.length === 0) {
        outputJson({ moved: [], created: [] });
        return;
      }

      // Build expected folder path for each workflow
      const expected = new Map<string, { folder: string; name: string }>();
      for (const wf of workflows) {
        const fpath = workflowFolderPath(wf, byId);
        expected.set(wf.id, { folder: fpath, name: wf.name });
      }

      // Find existing files by workflow ID prefix (everything before first _)
      const existingFiles = new Map<string, string>();
      const jsonFiles = findJsonFiles(workflowDir);
      const idPattern = /^([A-Za-z0-9]+)_/;

      for (const filePath of jsonFiles) {
        const fileName = filePath.split('/').pop() ?? '';
        const match = fileName.match(idPattern);
        if (match) {
          existingFiles.set(match[1], filePath);
        }
      }

      // Calculate moves
      const moves: SyncMove[] = [];
      const createdDirs: string[] = [];

      for (const [wfId, info] of expected.entries()) {
        const currentPath = existingFiles.get(wfId);
        if (!currentPath) continue;

        const fileName = currentPath.split('/').pop() ?? '';
        const targetDir = info.folder ? join(workflowDir, info.folder) : workflowDir;
        const targetPath = join(targetDir, fileName);

        if (currentPath !== targetPath) {
          // Track directories that need creating
          if (!existsSync(targetDir) && !createdDirs.includes(targetDir)) {
            createdDirs.push(targetDir);
          }

          moves.push({
            workflowId: wfId,
            workflowName: info.name,
            from: relative(workflowDir, currentPath),
            to: relative(workflowDir, targetPath),
          });
        }
      }

      if (moves.length === 0) {
        outputJson({ moved: [], created: [] });
        return;
      }

      if (!dry) {
        // Create directories
        for (const dir of createdDirs) {
          mkdirSync(dir, { recursive: true });
        }

        // Move files
        for (const move of moves) {
          const srcPath = join(workflowDir, move.from);
          const dstPath = join(workflowDir, move.to);
          const dstDir = dirname(dstPath);
          if (!existsSync(dstDir)) {
            mkdirSync(dstDir, { recursive: true });
          }
          renameSync(srcPath, dstPath);
        }

        // Clean up empty directories
        for (const move of moves) {
          const srcDir = dirname(join(workflowDir, move.from));
          removeEmptyDirs(srcDir, workflowDir);
        }
      }

      const createdRelative = createdDirs.map((d) => relative(workflowDir, d));

      outputJson({
        dry,
        moved: moves.map((m) => ({ from: m.from, to: m.to })),
        created: createdRelative,
      });
    });
}
