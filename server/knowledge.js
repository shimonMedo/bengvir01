import { readFile } from 'node:fs/promises';

let cached;

export async function loadKnowledgeSnapshot() {
  if (!cached) {
    cached = readFile(new URL('./data/ben-gvir-knowledge-example.json', import.meta.url), 'utf8')
      .then(JSON.parse)
      .then((snapshot) => {
        if (snapshot?.profile?.id !== 'otzma') throw new Error('Invalid knowledge snapshot.');
        return Object.freeze(snapshot);
      });
  }
  return cached;
}

/**
 * Future integrations should return a bounded, reviewed string here.
 * The standalone release deliberately returns no dynamic information.
 */
export async function loadOptionalKnowledgeExtension() {
  return '';
}
