import assert from 'node:assert/strict';
import test from 'node:test';
import { loadKnowledgeSnapshot, loadOptionalKnowledgeExtension } from '../server/knowledge.js';
import { buildPrompt } from '../server/prompt.js';

test('snapshot contains only the Ben Gvir profile', async () => {
  const snapshot = await loadKnowledgeSnapshot();
  assert.equal(snapshot.profile.id, 'otzma');
  assert.equal(snapshot.profile.name, 'איתמר בן גביר');
  assert.equal(snapshot.profile.factions.length, 0);
  assert.equal(snapshot.knowledgeType, 'example-profile');
  assert.match(snapshot.updatedAt, /^2026-/);
});

test('runtime has no automatic knowledge extension', async () => {
  assert.equal(await loadOptionalKnowledgeExtension(), '');
  const prompt = await buildPrompt();
  assert.match(prompt, /FIXED KNOWLEDGE SNAPSHOT/);
  assert.match(prompt, /איתמר בן גביר/);
  assert.doesNotMatch(prompt, /טלי גוטליב/);
});
