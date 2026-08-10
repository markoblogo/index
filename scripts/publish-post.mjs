import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function parseArgs(argv) {
  const args = { surface: '', packet: '', dryRun: false, write: false };
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--surface') args.surface = argv[++index] || '';
    else if (token === '--packet') args.packet = argv[++index] || '';
    else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--write') args.write = true;
  }
  if (!args.surface || !args.packet) {
    throw new Error('Usage: node scripts/publish-post.mjs --surface <ssi|1d3x|pop> --packet <path> [--dry-run|--write]');
  }
  if (!args.dryRun && !args.write) args.dryRun = true;
  return args;
}

export function loadPacket(packetPath) {
  return JSON.parse(readFileSync(packetPath, 'utf8'));
}

export function targetFor(surface) {
  if (surface === 'ssi') {
    return {
      file: path.join(process.cwd(), 'src', 'lib', 'blog-posts.ts'),
      arrayName: 'spikeBlogPosts',
    };
  }
  if (surface === '1d3x') {
    return {
      file: path.join(process.cwd(), 'src', 'lib', 'platform-blog-posts.ts'),
      arrayName: 'platformBlogPosts',
    };
  }
  if (surface === 'pop') {
    throw new Error('POP fast path remains blocked pending stable editorial surface.');
  }
  throw new Error(`Unsupported surface: ${surface}`);
}

export function estimateReadingMinutes(bodyLines) {
  const words = bodyLines.join(' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function postObject(surface, packet) {
  const base = {
    body: packet.payload.body_lines,
    coverImage: packet.payload.cover_image || '/brand/operational-model.webp',
    excerpt: packet.payload.excerpt,
    publishedAt: packet.enrichment.date_published,
    readingMinutes: estimateReadingMinutes(packet.payload.body_lines),
    seoDescription: packet.enrichment.meta_description,
    seoTitle: packet.enrichment.seo_title,
    slug: packet.slug,
    tags: packet.enrichment.tags,
    title: packet.title,
  };

  if (surface === 'ssi') {
    return {
      ...base,
      language: packet.payload.language || (packet.locales?.includes?.('uk') ? 'uk' : 'en'),
      resourceLinks: packet.payload.external_links || [],
      subtitle: packet.payload.subtitle || packet.payload.excerpt,
      videoAfterParagraph: packet.payload.video_after_paragraph || null,
      videoLabel: packet.payload.video_label || null,
      videoUrl: packet.payload.video_url || null,
    };
  }

  return base;
}

export function insertIntoArray(source, arrayName, objectLiteral) {
  const marker = `export const ${arrayName}`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Array export not found: ${arrayName}`);
  const arrayStart = source.indexOf('[', start);
  const arrayEnd = source.indexOf('\n];', arrayStart);
  if (arrayStart === -1 || arrayEnd === -1) throw new Error(`Array boundaries not found: ${arrayName}`);
  const before = source.slice(0, arrayEnd);
  const after = source.slice(arrayEnd);
  const trimmed = before.trimEnd();
  const prefix = trimmed.endsWith('[') || trimmed.endsWith(',') ? '\n' : ',\n';
  return `${before}${prefix}${objectLiteral}${after}`;
}

export function objectLiteral(value, indent = 2) {
  const lines = JSON.stringify(value, null, indent).split('\n');
  return lines.map((line) => `  ${line}`).join('\n');
}

export function buildReport(args, packet, target, source) {
  const exists = source.includes(`slug: "${packet.slug}"`) || source.includes(`"slug": "${packet.slug}"`);
  return {
    operation: 'index.publish-post',
    mode: args.write ? 'WRITE' : 'DRY_RUN',
    surface: args.surface,
    targetFile: target.file,
    exists,
    slug: packet.slug,
    title: packet.title,
    validationTier: packet.validation_tier,
  };
}

export function main(argv = process.argv) {
  const args = parseArgs(argv);
  const packet = loadPacket(args.packet);
  const target = targetFor(args.surface);
  const source = readFileSync(target.file, 'utf8');
  const report = buildReport(args, packet, target, source);

  if (args.dryRun) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  if (report.exists) {
    throw new Error(`Refusing to overwrite existing post slug: ${packet.slug}`);
  }

  if (!existsSync(target.file)) {
    throw new Error(`Target file not found: ${target.file}`);
  }

  const updated = insertIntoArray(source, target.arrayName, objectLiteral(postObject(args.surface, packet)));
  writeFileSync(target.file, updated);
  const written = { ...report, written: true };
  console.log(JSON.stringify(written, null, 2));
  return written;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
