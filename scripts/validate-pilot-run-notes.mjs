#!/usr/bin/env node

import fs from 'node:fs/promises';

const files = [
  'docs/pilots/find-partners/run-notes.md',
  'docs/fallback-provider-pool.md',
];

const requiredRunNoteKeys = [
  'run_id',
  'date',
  'initiator',
  'domain',
  'output_count',
];

const requiredChecks = ['schema_valid', 'count_target_met', 'min_confidence_met'];

function isBlank(value) {
  return !value || !value.trim() || value.includes(':') && value.split(':')[1].trim() === '';
}

function normalizeLine(line) {
  return line.trimEnd();
}

async function validateRunNotes(file) {
  const text = await fs.readFile(file, 'utf8');
  const lines = text.split('\n').map(normalizeLine);

  const errors = [];
  const map = {};
  const checks = {};

  for (const line of lines) {
    for (const key of requiredRunNoteKeys) {
      const prefix = `- ${key}:`;
      if (line.startsWith(prefix)) {
        map[key] = line.slice(prefix.length).trim();
      }
    }
    const checkMatch = line.match(/^\s*-\s*([^:]+):\s*(.*)$/);
    if (checkMatch && requiredChecks.includes(checkMatch[1].trim())) {
      checks[checkMatch[1].trim()] = checkMatch[2].trim();
      continue;
    }

    const checkPrefix = '  - ';
    if (line.startsWith(checkPrefix)) {
      const [rawKey, ...rest] = line.slice(checkPrefix.length).split(':');
      const key = rawKey?.trim();
      const value = rest.join(':').trim();
      if (key && requiredChecks.includes(key)) {
        checks[key] = value;
      }
    }
  }

  for (const key of requiredRunNoteKeys) {
    if (!map[key] || isBlank(map[key])) {
      errors.push(`Missing or empty run note field: ${key}`);
    }
  }

  for (const key of requiredChecks) {
    if (!checks[key] || !checks[key].trim()) {
      errors.push(`Missing or empty run check field: ${key}`);
    }
  }

  return errors;
}

function validateFallbackFile(text, file) {
  const errors = [];
  const requiredSections = [
    '## 1) Candidate scan (quick)',
    '## 2) Validation checks (before use)',
    '## 3) Decision record (required)',
  ];

  for (const section of requiredSections) {
    if (!text.includes(section)) {
      errors.push(`Missing required section in ${file}: ${section}`);
    }
  }

  return errors;
}

async function main() {
  const target = process.argv[2] || 'docs/pilots/find-partners/run-notes.md';
  const filesToCheck = process.argv.includes('--all') ? files : [target];

  let hasErrors = false;

  for (const file of filesToCheck) {
    try {
      const text = await fs.readFile(file, 'utf8');

      let errors = [];
      if (file.endsWith('run-notes.md')) {
        errors = await validateRunNotes(file);
      } else {
        errors = validateFallbackFile(text, file);
      }

      if (errors.length > 0) {
        hasErrors = true;
        console.error(`\n[FAIL] ${file}`);
        errors.forEach((error) => console.error(`- ${error}`));
      } else {
        console.log(`\n[PASS] ${file}`);
      }
    } catch (error) {
      hasErrors = true;
      console.error(`\n[FAIL] ${file}: ${error.message}`);
    }
  }

  process.exitCode = hasErrors ? 1 : 0;
}

main();
