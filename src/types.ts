import { NamedNode, SomeTerm } from 'rdflib'

export interface OntologyInfo {
  /** Human readable name */
  name: string
  /** The namespace IRI */
  ns: string
  /** Location where the ontology can be fetched */
  source: string
  /** Preferred shortening symbol for the namespace */
  symbol: string
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
  name: string
  properties: OntologyProperty[]
  symbol: string
  ns: NamedNode
}

export interface OntologyProperty extends OntologyItem {
  domain: NamedNode[]
  range: NamedNode[]
}

export interface OntologyClass extends OntologyItem {
  subClassOf: NamedNode[]
}
