import { Project } from "ts-morph"
import {
  Ontology,
  OntologyItem,
  OntologyItemPropType,
} from './types'
import defaults from './defaults.package.json';

const firstValue = (obj: OntologyItem, property: string): OntologyItemPropType => {
  if (obj && Object.prototype.hasOwnProperty.call(obj, property)) {
    const prop = obj[property]

    return Array.isArray(prop) ? prop[0] : prop
  }

  return undefined
}

export async function generate(ontologies: Ontology[]) {
  const packages = new Project()

  for (const ontology of ontologies) {
    const packageJSON = Object.assign(
      {},
      defaults,
      {
        name: `@ontologies/${ontology.symbol}`,
        description: firstValue(ontology, 'label'),
      }
    )
    packages.createSourceFile(
      `packages/${ontology.symbol}/package.json`,
      JSON.stringify(packageJSON, null, 2)
    )
  }

  await packages.save()
}
