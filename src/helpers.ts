import { Ontology } from './types'

export function packageTSIndexFile(ontology: Ontology) {
  return `packages/${ontology.symbol}/index.ts`
}

export function packageJSModuleIndexFile(ontology: Ontology) {
  return `packages/${ontology.symbol}/index.js`
}
