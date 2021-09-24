import { Package } from './types';

export function packageFolder (ontology: Package) {
  return `packages/${ontology.info.symbol}`
}

export function packageTSIndexFile(ontology: Package) {
  return `${packageFolder(ontology)}/index.ts`
}

export function packageJSModuleIndexFile(ontology: Package) {
  return `${packageFolder(ontology)}/index.js`
}

export function packagePackageJSON(ontology: Package) {
  return `${packageFolder(ontology)}/package.json`
}
