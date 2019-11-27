export const enum TermType {
  NamedNode = "NamedNode",
  BlankNode = "BlankNode",
  Literal = "Literal",
}
export type TermTypes = "NamedNode" | "BlankNode" | "Literal"

export type Indexable = number | string | unknown

export interface RDFObject {
  id?: Indexable
  termType?: TermType | TermTypes | string
}

/**
 * The overarching interface for RDF components (or terms).
 */
export interface Term extends RDFObject {
  termType: TermType | TermTypes | string
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

export interface Quad {
  subject: Node
  predicate: NamedNode
  object: SomeTerm
  graph: Node
}

export interface Variable extends Term {
  termType: "Variable"
  value: string
}

export type SomeTerm = NamedNode | BlankNode | Literal

/**
 * A quad formatted as an array.
 */
export type Quadruple = [ Node, NamedNode, SomeTerm, Node ]

export const enum QuadPosition {
  subject = 0,
  predicate = 1,
  object = 2,
  graph = 3,
}

export const enum Feature {
  /** Whether the factory supports termType:Collection terms */
  collections = "COLLECTIONS",
  /** Whether the factory supports termType:DefaultGraph terms */
  defaultGraphType = "DEFAULT_GRAPH_TYPE",
  /** Whether the factory supports equals on produced instances */
  equalsMethod = "EQUALS_METHOD",
  /**
   * Whether the factory is an {IdentityFactory}, so it allows reverse lookups to be done with
   * {fromId}.
   */
  identity = "IDENTITY",
  /** Whether the factory supports mapping ids back to instances */
  nodeLookup = "NODE_LOOKUP",
  /** Whether the factory supports termType:Variable terms */
  variableType = "VARIABLE_TYPE",
}

export type Comparable = NamedNode | BlankNode | Literal | Quad | Quadruple | undefined | null

export type SupportTable = Record<Feature, boolean>

export interface DataFactoryOpts {
  bnIndex?: number
  supports?: SupportTable
}

export interface LowLevelStore {
  rdfFactory: DataFactory

  add(subject: Node, predicate: NamedNode, object: Term, graph?: Node): void

  addQuad(quad: Quad): Quad
  addQuads(quad: Quad[]): Quad[]

  addQuadruple(quadruple: Quadruple): Quadruple
  addQuadruples(quadruple: Quadruple[]): Quadruple[]

  removeQuad(quad: Quad): void
  removeQuads(quad: Quad[]): void

  match(subj: Node | undefined | null,
        pred?: NamedNode | undefined | null,
        obj?: Term | undefined | null,
        why?: Node | undefined | null): Quad[]
}

/**
 * Data factory interface based RDF/JS: Data model specification.
 *
 * Non RDF-native features have been removed (e.g. no Variable, no Literal as predicate, etc.),
 * though might be added back via generics.
 *
 * bnIndex is optional but useful.
 */
export interface DataFactory<FactoryTypes = NamedNode | BlankNode | Literal | Quad | Quadruple> {
  bnIndex?: number

  supports: SupportTable

  namedNode(value: string): NamedNode

  blankNode(value?: string): BlankNode

  literal(value: string, languageOrDatatype?: string | NamedNode): Literal

  literal(value: unknown): Literal

  defaultGraph(): NamedNode

  quad(
    subject: Node,
    predicate: NamedNode,
    object: Term,
    graph?: NamedNode
  ): Quad

  isQuad(obj: any): obj is Quad

  quadruple(
    subject: Node,
    predicate: NamedNode,
    object: Term,
    graph?: NamedNode,
  ): Quadruple

  fromTerm(original: Literal | Term): Term

  fromQuad(original: Quad): Quad

  fromQdr(original: Quadruple): Quad

  qdrFromQuad(original: Quad): Quadruple

  qdrFromQdr(original: Quadruple): Quadruple

  equals(a: Comparable, b: Comparable): boolean

  /**
   * Generates a unique session-idempotent identifier for the given object.
   *
   * @example NQ serialization (reversible from value)
   * @example MD5 hash of termType + value (irreversible from value, map needed)
   *
   * @return {Indexable} A unique value which must also be a valid JS object key type.
   */
  id(obj: FactoryTypes): Indexable | unknown

  /**
   * Inverse function of {id}.
   * Should be able to resolve terms back, may be able to resolve quads/quadruples, but should
   * throw an exception if not possible.
   *
   * It should be able to resolve the value for any given id which it handed out. Passing an id not
   * generated by the same instance might result in a value or an exception depending on the
   * implementation.
   */
  fromId(id: Indexable | unknown): FactoryTypes;

  toNQ(term: FactoryTypes): string

  termFromNQ(nq: string): BlankNode | NamedNode | Literal
}

export type Namespace = (term:string) => NamedNode
export type NamespaceCreator = (ns: string) => Namespace
