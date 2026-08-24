import http from 'node:http';
import { createReadStream } from 'node:fs';
import { access, copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(STUDIO_DIR, '..', '..');
const APP_DIR = path.join(STUDIO_DIR, 'app');
const DATA_FILE = path.join(ROOT_DIR, 'src', 'data', 'writings.json');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const BACKUP_DIR = path.join(ROOT_DIR, '.writing-studio', 'backups');
const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.WRITING_STUDIO_PORT || '4177', 10);
const ORIGIN = `http://${HOST}:${PORT}`;
const DATA_RELATIVE_PATH = 'src/data/writings.json';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, value) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(value);
}

function isTrustedRequest(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  return origin === ORIGIN || origin === `http://localhost:${PORT}`;
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error('La solicitud supera el límite de 2 MB.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function stringValue(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function stringList(value) {
  return Array.isArray(value) ? value.map((item) => stringValue(item)).filter(Boolean) : [];
}

function dateLabel(date) {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed).replaceAll('.', '').toUpperCase();
}

function normalizeWritings(input) {
  if (!Array.isArray(input) || !input.length) throw new Error('Debe existir al menos un escrito.');
  const categories = new Set(['Estudio', 'Nota técnica', 'Ensayo']);
  const statuses = new Set(['Borrador', 'En revisión', 'Publicado']);
  const seenSlugs = new Set();

  return input.map((rawWriting, writingIndex) => {
    const title = stringValue(rawWriting?.title);
    if (!title) throw new Error(`El escrito ${writingIndex + 1} necesita un título.`);
    const slug = slugify(rawWriting?.slug || title);
    if (!slug) throw new Error(`No se pudo generar la URL del escrito “${title}”.`);
    if (seenSlugs.has(slug)) throw new Error(`La URL “${slug}” está repetida.`);
    seenSlugs.add(slug);

    const rawSections = Array.isArray(rawWriting.sections) ? rawWriting.sections : [];
    if (!rawSections.length) throw new Error(`“${title}” necesita al menos una sección.`);
    const sectionIds = new Set();
    const sections = rawSections.map((rawSection, sectionIndex) => {
      const sectionTitle = stringValue(rawSection?.title, `${String(sectionIndex + 1).padStart(2, '0')}. Sección`);
      let id = slugify(rawSection?.id || sectionTitle.replace(/^\d+[.)]?\s*/, '')) || `seccion-${sectionIndex + 1}`;
      if (sectionIds.has(id)) id = `${id}-${sectionIndex + 1}`;
      sectionIds.add(id);
      const body = stringList(rawSection?.body);
      if (!body.length) throw new Error(`La sección “${sectionTitle}” necesita al menos un párrafo.`);
      const section = { id, title: sectionTitle, body };
      const bullets = stringList(rawSection?.bullets);
      const note = stringValue(rawSection?.note);
      if (bullets.length) section.bullets = bullets;
      if (note) section.note = note;
      return section;
    });

    const date = /^\d{4}-\d{2}-\d{2}$/.test(rawWriting.date || '')
      ? rawWriting.date
      : new Date().toISOString().slice(0, 10);
    const readingMinutes = Math.max(1, Math.min(120, Number.parseInt(rawWriting.readingMinutes, 10) || 5));
    const sources = Array.isArray(rawWriting.sources)
      ? rawWriting.sources
          .map((source) => ({ label: stringValue(source?.label), href: stringValue(source?.href) }))
          .filter((source) => source.label && /^https?:\/\//i.test(source.href))
      : [];

    const writing = {
      slug,
      title,
      excerpt: stringValue(rawWriting.excerpt),
      abstract: stringValue(rawWriting.abstract),
      category: categories.has(rawWriting.category) ? rawWriting.category : 'Estudio',
      status: statuses.has(rawWriting.status) ? rawWriting.status : 'Borrador',
      date,
      dateLabel: dateLabel(date),
      readingMinutes,
      tags: stringList(rawWriting.tags),
      accent: /^#[0-9a-f]{6}$/i.test(rawWriting.accent || '') ? rawWriting.accent : '#00f5ff',
      sections,
    };
    const image = stringValue(rawWriting.image);
    const imageAlt = stringValue(rawWriting.imageAlt);
    if (image.startsWith('/')) writing.image = image;
    if (imageAlt) writing.imageAlt = imageAlt;
    if (sources.length) writing.sources = sources;
    return writing;
  });
}

async function loadWritings() {
  return JSON.parse(await readFile(DATA_FILE, 'utf8'));
}

async function trimBackups() {
  const backups = (await readdir(BACKUP_DIR)).filter((name) => name.endsWith('.json')).sort().reverse();
  await Promise.all(backups.slice(30).map((name) => unlink(path.join(BACKUP_DIR, name))));
}

async function saveWritings(input) {
  const normalized = normalizeWritings(input);
  await mkdir(BACKUP_DIR, { recursive: true });
  const backupName = `writings-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}.json`;
  await copyFile(DATA_FILE, path.join(BACKUP_DIR, backupName));
  await writeFile(DATA_FILE, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  await trimBackups();
  return normalized;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      shell: false,
      windowsHide: true,
      env: { ...process.env, FORCE_COLOR: '0' },
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

async function gitStatus() {
  const [branchResult, statusResult] = await Promise.all([
    run('git', ['branch', '--show-current']),
    run('git', ['status', '--short']),
  ]);
  return {
    branch: branchResult.stdout.trim() || 'detached',
    hasChanges: Boolean(statusResult.stdout.trim()),
    changes: statusResult.stdout.trim().split(/\r?\n/).filter(Boolean).slice(0, 20),
  };
}

async function buildPortfolio() {
  const astroCli = path.join(ROOT_DIR, 'node_modules', 'astro', 'astro.js');
  const result = await run(process.execPath, [astroCli, 'build']);
  if (result.code !== 0) {
    const details = (result.stderr || result.stdout).trim().split(/\r?\n/).slice(-16).join('\n');
    throw new Error(`El portfolio no compiló. No se creó ningún commit.\n${details}`);
  }
  return result;
}

async function publishWriting(message) {
  await buildPortfolio();
  const status = await gitStatus();
  if (status.branch === 'detached') throw new Error('Git no está en una rama. Abre una rama antes de publicar.');

  const diffResult = await run('git', ['diff', '--quiet', '--', DATA_RELATIVE_PATH]);
  const untrackedResult = await run('git', ['ls-files', '--others', '--exclude-standard', '--', DATA_RELATIVE_PATH]);
  const hasWritingChanges = diffResult.code === 1 || Boolean(untrackedResult.stdout.trim());
  if (!hasWritingChanges) return { published: false, branch: status.branch, message: 'No hay cambios nuevos en los escritos.' };

  const commitMessage = stringValue(message, 'Update portfolio writings').replace(/[\r\n]+/g, ' ').slice(0, 100);
  const addResult = await run('git', ['add', '--', DATA_RELATIVE_PATH]);
  if (addResult.code !== 0) throw new Error(addResult.stderr || 'No se pudo preparar el escrito para Git.');

  const commitResult = await run('git', ['commit', '--only', '-m', commitMessage, '--', DATA_RELATIVE_PATH]);
  if (commitResult.code !== 0) throw new Error(commitResult.stderr || commitResult.stdout || 'No se pudo crear el commit.');

  const pushResult = await run('git', ['push', 'origin', status.branch]);
  if (pushResult.code !== 0) throw new Error(pushResult.stderr || pushResult.stdout || 'El commit se creó, pero GitHub rechazó el push.');

  const shaResult = await run('git', ['rev-parse', '--short', 'HEAD']);
  return { published: true, branch: status.branch, commit: shaResult.stdout.trim(), message: 'Commit creado y enviado a GitHub.' };
}

function safeChildPath(base, relativePath) {
  const target = path.resolve(base, relativePath);
  return target === base || target.startsWith(`${base}${path.sep}`) ? target : null;
}

async function sendFile(response, filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': filePath.startsWith(APP_DIR) ? 'no-store' : 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    });
    createReadStream(filePath).pipe(response);
    return true;
  } catch {
    return false;
  }
}

async function serveStudio(response, pathname) {
  const relative = pathname === '/studio/' ? 'index.html' : pathname.replace(/^\/studio\//, '');
  const target = safeChildPath(APP_DIR, decodeURIComponent(relative));
  if (!target || !(await sendFile(response, target))) sendText(response, 404, 'Archivo del estudio no encontrado.');
}

async function servePreview(response, pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  let target = safeChildPath(DIST_DIR, relative);
  if (!target) return sendText(response, 404, 'Ruta no válida.');
  try {
    const info = await stat(target);
    if (info.isDirectory()) target = path.join(target, 'index.html');
  } catch {
    if (!path.extname(target)) target = path.join(target, 'index.html');
  }
  if (!(await sendFile(response, target))) sendText(response, 404, 'Primero usa “Vista previa” para generar esta página.');
}

async function handleApi(request, response, pathname) {
  if (request.method !== 'GET' && !isTrustedRequest(request)) {
    return sendJson(response, 403, { ok: false, error: 'Solicitud bloqueada: origen no autorizado.' });
  }

  try {
    if (request.method === 'GET' && pathname === '/api/writings') {
      return sendJson(response, 200, { ok: true, writings: await loadWritings(), git: await gitStatus() });
    }
    if (request.method === 'GET' && pathname === '/api/status') {
      return sendJson(response, 200, { ok: true, git: await gitStatus() });
    }
    if (request.method === 'PUT' && pathname === '/api/writings') {
      const body = await readJsonBody(request);
      return sendJson(response, 200, { ok: true, writings: await saveWritings(body.writings), message: 'Borrador guardado con copia de seguridad.' });
    }
    if (request.method === 'POST' && pathname === '/api/build') {
      await buildPortfolio();
      return sendJson(response, 200, { ok: true, message: 'Vista previa actualizada.' });
    }
    if (request.method === 'POST' && pathname === '/api/publish') {
      const body = await readJsonBody(request);
      return sendJson(response, 200, { ok: true, ...(await publishWriting(body.message)) });
    }
    return sendJson(response, 404, { ok: false, error: 'Acción no encontrada.' });
  } catch (error) {
    return sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', ORIGIN);
  if (url.pathname.startsWith('/api/')) return handleApi(request, response, url.pathname);
  if (url.pathname === '/studio') {
    response.writeHead(302, { Location: '/studio/' });
    return response.end();
  }
  if (url.pathname.startsWith('/studio/')) return serveStudio(response, url.pathname);
  if (url.pathname === '/') {
    response.writeHead(302, { Location: '/studio/' });
    return response.end();
  }
  return servePreview(response, url.pathname);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está ocupado. Cierra la otra ventana de Writing Studio e inténtalo de nuevo.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(PORT, HOST, async () => {
  await access(DATA_FILE);
  console.log(`\nCDE Writing Studio listo en ${ORIGIN}/studio/`);
  console.log('Cierra esta ventana para detenerlo.\n');
  if (process.env.STUDIO_SELF_TEST === '1') {
    try {
      const studioResponse = await fetch(`${ORIGIN}/studio/`);
      const writingsResponse = await fetch(`${ORIGIN}/api/writings`);
      const writingsPayload = await writingsResponse.json();
      const previewSlug = writingsPayload.writings?.[0]?.slug;
      const previewResponse = await fetch(`${ORIGIN}/escritos/${previewSlug}/`);
      const buildResponse = await fetch(`${ORIGIN}/api/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: '{}',
      });
      const buildPayload = await buildResponse.json();
      console.log(JSON.stringify({
        studioStatus: studioResponse.status,
        writingCount: writingsPayload.writings?.length,
        branch: writingsPayload.git?.branch,
        previewStatus: previewResponse.status,
        buildOk: buildPayload.ok,
        buildError: buildPayload.error,
      }, null, 2));
      if (!studioResponse.ok || !writingsResponse.ok || !previewResponse.ok || !buildResponse.ok) process.exitCode = 1;
    } finally {
      server.close();
    }
    return;
  }
  if (process.env.STUDIO_NO_OPEN !== '1') {
    const command = process.platform === 'win32' ? 'cmd.exe' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', `${ORIGIN}/studio/`] : [`${ORIGIN}/studio/`];
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
  }
});

function stop() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
