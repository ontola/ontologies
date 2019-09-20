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
  /** Location where the ontology is officially specified */
  spec: string,
  /** Preferred shortening symbol for the namespace */
  symbol: string
  /** The filename of the ontology file */
  ontologyFile?: string
  /** The datatype of the ontology file */
  ontologyType?: string
}

export type OntologyItemPropType = undefined | string | SomeTerm | OntologyTerm | OntologyClass | OntologyProperty
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
  otherTerms: OntologyTerm[]
  properties: OntologyProperty[]
  source: string
  spec: string
  symbol: string
  ns: NamedNode
}

export interface OntologyTerm extends OntologyItem {
  label: SomeTerm[]
  term: string
}

export interface OntologyProperty extends OntologyTerm {
  domain: NamedNode[]
  range: NamedNode[]
}

export interface OntologyClass extends OntologyTerm {
  subClassOf: NamedNode[]
}
