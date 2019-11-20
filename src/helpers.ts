import { Ontology } from "./types"

export function packageFolder (ontology: Ontology) {
  return `packages/${ontology.symbol}`
}

export function packageTSIndexFile(ontology: Ontology) {
  return `${packageFolder(ontology)}/index.ts`
}

export function packageJSModuleIndexFile(ontology: Ontology) {
  return `${packageFolder(ontology)}/index.js`
}

export function packagePackageJSON(ontology: Ontology) {
  return `${packageFolder(ontology)}/package.json`
}
