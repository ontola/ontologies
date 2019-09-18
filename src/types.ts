import { NamedNode, SomeTerm } from "rdflib"

export interface OntologyInfo {
  /** Human readable name */
  name: string
  /** The namespace IRI */
  ns: string
  /** The Linked Open Vocabularies URL */
  lov: string
  /** Location where the ontology can be fetched */
  source: string
  /** Preferred shortening symbol for the namespace */
  symbol: string
  /** The filename of the ontology file */
  ontologyFile?: string
  /** The datatype of the ontology file */
  ontologyType?: string
}

export type OntologyItemPropType = undefined | string | SomeTerm | OntologyClass | OntologyProperty
export type OntologyItemProp = OntologyItemPropType | Array<OntologyItemPropType>

export interface OntologyItem {
  [k: string]: OntologyItemProp
  name?: string
  iri?: SomeTerm
  label?: SomeTerm[]
  comment?: SomeTerm[]
  isDefinedBy?: SomeTerm[]
  seeAlso?: SomeTerm[]
}

export interface Ontology extends OntologyItem {
  classes: OntologyClass[]
  lov: string
  name: string
  properties: OntologyProperty[]
  source: string
  symbol: string
  ns: NamedNode
}

export interface OntologyProperty extends OntologyItem {
  domain: NamedNode[]
  label: SomeTerm[]
  range: NamedNode[]
  term: string
}

export interface OntologyClass extends OntologyItem {
  label: SomeTerm[]
  subClassOf: NamedNode[]
}
