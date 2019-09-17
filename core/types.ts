
export interface RDFObject {
  termType: "NamedNode" | "BlankNode" | "Literal" | "Quad"
}

/**
 * The overarching interface for RDF components (or terms).
 */
export interface Term extends RDFObject {
  termType: "NamedNode" | "BlankNode" | "Literal"
  value: string
}

/**
 * Any resource (node) whether with a known IRI (named) or a resource which is yet to be assigned an
 *   IRI (blank, or unnamed).
 */
export type Node = NamedNode | BlankNode

/**
 * A resource (node) of which the IRI is known.
 *
 * The IRI is an assigned global identifier which ideally can be resolved to its authoritative
 *   representation.
 *
 * @see https://tools.ietf.org/html/rfc3987
 * @see https://www.w3.org/TR/rdf11-concepts/#section-IRIs
 */
export interface NamedNode extends Term {
  termType: "NamedNode"
  value: string
}

/**
 * A resource (node) of which the IRI is not known yet.
 *
 * In RDF blank nodes can be used to say; "I know this resource exists and has these properties, but
 *  it's identifier is not known to me at this time."
 *
 * @see https://www.w3.org/TR/rdf11-concepts/#section-blank-nodes
 * @see https://www.w3.org/TR/rdf11-concepts/#section-skolemization
 */
export interface BlankNode extends Term {
  termType: "BlankNode"
  value: string
}

/**
 * An RDF Literal object. Maps to a value within some given domain.
 *
 * We require all fields to exist (albeit undefined) and the datatype to always be set (defaults to
 *   xsd:string) to simplify code consuming the objects and improve performance.
 *
 * @see https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal
 * @see https://www.w3.org/TR/rdf-schema/#ch_literal
 */
export interface Literal extends Term {
  termType: "Literal"
  datatype: NamedNode
  language: string | undefined
  value: string
}

export interface Quad extends RDFObject {
  termType: "Quad"
  subject: Node
  predicate: NamedNode
  object: Term
  graph: NamedNode | undefined
}

/**
 * A quad formatted as an array.
 */
export type Quadruple = [ Node, NamedNode, Term, NamedNode ]

export type Comparable = RDFObject | Quadruple

/**
 * Defines a strict subset of the DataFactory as defined in the RDF/JS: Data model specification
 *
 * Non RDF-native features have been removed (e.g. no Variable, no Literal as predicate, etc.).
 *
 * bnIndex is optional but useful.
 */
export interface DataFactory {
  bnIndex?: number

  namedNode (value: string): NamedNode

  blankNode (value?: string): BlankNode

  literal (value: string, languageOrDatatype: string | NamedNode): Literal

  defaultGraph (): NamedNode

  quad (subject: Node, predicate: NamedNode, object: Term, graph?: NamedNode): Quad

  quadruple (subject: Node, predicate: NamedNode, object: Term, graph?: NamedNode): Quadruple

  fromTerm (original: Literal | Term): Term

  fromQuad (original: Quad): Quad

  equals (a: Comparable, b: Comparable): boolean
}
