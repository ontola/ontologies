import {
  BlankNode,
  Comparable,
  DataFactory,
  DataFactoryOpts,
  Feature,
  Indexable,
  Literal,
  NamedNode,
  Node,
  Quad,
  QuadPosition,
  Quadruple,
  SomeTerm,
  Term,
  TermType,
} from "./types"

const datatypes = {
  boolean: "http://www.w3.org/2001/XMLSchema#boolean",
  dateTime: "http://www.w3.org/2001/XMLSchema#dateTime",
  double: "http://www.w3.org/2001/XMLSchema#double",
  decimal: "http://www.w3.org/2001/XMLSchema#decimal",
  integer: "http://www.w3.org/2001/XMLSchema#integer",
  langString: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
  string: "http://www.w3.org/2001/XMLSchema#string",
}

function equals(a: Comparable, b: Comparable): boolean {
  if (a === b) {
    return true
  }

  if (!a || !b) {
    return a === b
  }

  if (Object.prototype.hasOwnProperty.call(a, 'equals')) {
    return (a as any).equals(b)
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!(Array.isArray(a) && Array.isArray(b))) {
      return false
    }

    return equals(a[0], b[0])
      && equals(a[1], b[1])
      && equals(a[2], b[2])
      && equals(a[3], b[3])
  }

  if (PlainFactory.isQuad(a) || PlainFactory.isQuad(b)) {
    if (!PlainFactory.isQuad(a) || !PlainFactory.isQuad(b)) {
      return false
    }

    return equals(a.subject, b.subject)
      && equals(a.predicate, b.predicate)
      && equals(a.object, b.object)
      && equals(a.graph, b.graph)
  }

  switch (a.termType) {
    case 'Literal': {
      return a.termType === b.termType
        && (a as SomeTerm).value === (b as SomeTerm).value
        && (b as Literal).datatype === (b as Literal).datatype
        && (b as Literal).language === (b as Literal).language
    }
    default:
      if (!a.termType || !b.termType) {
        return false
      }

      return a.termType === b.termType
        && (a as SomeTerm).value === (b as SomeTerm).value
  }
}

const RDFBase = {
  equals(other: Comparable) {
    return equals(this as any, other)
  },

  /* rdflib compat */
  toCanonical() {
    return this
  },
}

/**
 * Plain JS/functional implementation of the RDF/JS: Data model specification, limited to a strict
 * rdf subset (no Variable, no Literal as predicate, etc.).
 */
export class PlainFactory implements DataFactory {
  public bnIndex: number
  public supports: Record<Feature, boolean>

  constructor(opts: DataFactoryOpts = {}) {
    this.bnIndex = opts.bnIndex || 0
    this.supports = opts.supports || {
      [Feature.collections]: false,
      [Feature.defaultGraphType]: false,
      [Feature.equalsMethod]: false,
      [Feature.identity]: false,
      [Feature.nodeLookup]: false,
      [Feature.variableType]: false,
    }
  }

  /**
   * Checks if the object {obj} is a Quad.
   */
  public static isQuad(obj: any): obj is Quad {
    if (Array.isArray(obj) || !obj) {
      return false
    }

    return !!(Object.prototype.hasOwnProperty.call(obj, "subject")
      && Object.prototype.hasOwnProperty.call(obj, "predicate")
      && Object.prototype.hasOwnProperty.call(obj, "object"))
  }

  public namedNode(value: string): NamedNode {
    const term = Object.create(RDFBase)
    term.termType = TermType.NamedNode
    term.value = value

    return term
  }

  public blankNode(value?: string): BlankNode {
    const term = Object.create(RDFBase)
    term.termType = TermType.BlankNode
    term.value = value || `b${++this.bnIndex!}`

    return term
  }

  public literal(value: string | unknown, languageOrDatatype?: string | NamedNode): Literal {
    if (typeof value !== "string") {
      return this.parseLiteral(value)
    }
    const term = Object.create(RDFBase)
    term.termType = TermType.Literal
    // Perf: Always set all properties to prevent the creation of unnecessary HiddenClass objects.
    term.language = typeof languageOrDatatype === "string" ? languageOrDatatype : undefined
    term.datatype = typeof languageOrDatatype === "string"
      ? this.namedNode(datatypes.langString)
      : languageOrDatatype || this.namedNode(datatypes.string)
    term.value = value

    return term
  }

  public defaultGraph(): NamedNode {
    return this.namedNode("")
  }

  /**
   * Create an RDF statement in object form.
   * @param subject The subject of the statement
   * @param predicate The predicate of the statement
   * @param object The object of the statement
   * @param graph The graph of the statement
   */
  public quad(subject: Node, predicate: NamedNode, object: SomeTerm, graph?: NamedNode): Quad {
    return {
      subject,
      predicate,
      object,
      graph: graph || this.defaultGraph()
    }
  }

  public isQuad(obj: any): obj is Quad {
    return PlainFactory.isQuad(obj)
  }

  /**
   * * Returns an RDF statement in array form.
   * @param subject The subject of the statement
   * @param predicate The predicate of the statement
   * @param object The object of the statement
   * @param graph The graph of the statement
   */
  public quadruple(subject: Node,
                   predicate: NamedNode,
                   object: SomeTerm,
                   graph?: NamedNode): Quadruple {
    return [
      subject,
      predicate,
      object,
      graph || this.defaultGraph(),
    ]
  }

  public fromTerm(original: Literal | Term): Term {
    if (original.termType === "Literal") {
      return this.literal(
        original.value,
        (original as Literal).language || (original as Literal).datatype
      )
    }

    return {
      termType: original.termType,
      value: original.value,
    }
  }

  public fromQuad(original: Quad): Quad {
    return {
      subject: original.subject,
      predicate: original.predicate,
      object: original.object,
      graph: original.graph || this.defaultGraph(),
    }
  }

  public fromQdr(original: Quadruple): Quad {
    return {
      subject: original[0],
      predicate: original[1],
      object: original[2],
      graph: original[3] || this.defaultGraph(),
    }
  }

  public qdrFromQuad(original: Quad): Quadruple {
    return [
      original.subject,
      original.predicate,
      original.object,
      original.graph || this.defaultGraph(),
    ]
  }

  public qdrFromQdr(original: Quadruple): Quadruple {
    return [
      original[0],
      original[1],
      original[2],
      original[3] || this.defaultGraph(),
    ]
  }

  /**
   * Compare if two RDF objects are the same.
   *
   * Should work with non-standard rdf libraries as well (e.g. supporting Variable and Collection).
   */
  public equals(a: Comparable, b: Comparable): boolean {
    return equals(a, b)
  }

  public id(obj: SomeTerm | Quad | Quadruple): Indexable {
    return this.toNQ(obj)
  }

  public toNQ(term: SomeTerm | Quadruple | Quad): string {
    if (Array.isArray(term)) {
      const graph = term[3] === this.defaultGraph() ? '' : (this.toNQ(term[3]) + ' ')
      return `${this.toNQ(term[0])} ${this.toNQ(term[1])} ${this.toNQ(term[2])} ${graph}.`
    } else if (this.isQuad(term)) {
      return this.quadToNQ(term)
    }

    return this.termToNQ(term)
  }

  protected parseLiteral(value: unknown): Literal {
    let literalValue: string | undefined = undefined
    let datatype: string | undefined = undefined

    if (typeof value === "number" || value instanceof Number) {
      // From rdflib; https://github.com/linkeddata/rdflib.js/blob/master/src/literal.js#L104
      if (value.toString().indexOf('e') < 0 && Math.ceil(value as number) <= Number.MAX_SAFE_INTEGER) {
        datatype = Number.isInteger(value as number) ? datatypes.integer : datatypes.decimal
      } else {
        datatype = datatypes.double
      }
      literalValue = value.toString()
    } else if (typeof value === "boolean" || value instanceof Boolean) {
      literalValue = value.toString()
      datatype = datatypes.boolean
    } else if (typeof value === "bigint") {
      datatype = datatypes.integer
      literalValue = value.toString()
    } else if (typeof value === "object") {
      if (value instanceof Date) {
        if (isNaN(value.getTime())) {
          throw new Error('Invalid date given')
        }

        literalValue = value.toISOString();
        datatype = datatypes.dateTime
      }
    }

    if (typeof datatype !== "undefined") {
      return this.literal(literalValue, this.namedNode(datatype))
    }

    throw new Error(`Can't parse value '${value}'`)
  }

  protected termToNQ(term: BlankNode | NamedNode | Literal): string {
    switch (term.termType) {
      case TermType.BlankNode:
        return `_:${term.value}`
      case TermType.NamedNode:
        return `<${term.value}>`
      case TermType.Literal:
        if (term.datatype) {
          if (term.datatype.value === datatypes.string) {
            return `"${term.value}"`
          }

          return `"${term.value}"^^${this.termToNQ(term.datatype)}`
        }

        if (term.language) {
          return `"${term.value}"@${term.language}`
        }

        return `"${term.value}"`

      default:
        throw new Error(`Nonstandard termtype '${(term as any).termType}' given`)
    }
  }

  protected quadrupleToNQ(quad: Quadruple): string {
    const graph = !quad[QuadPosition.graph] || quad[QuadPosition.graph] === this.defaultGraph()
      ? ''
      : (this.toNQ(quad[QuadPosition.graph]) + ' ')

    return `${this.toNQ(quad[QuadPosition.subject])} ${this.toNQ(quad[QuadPosition.predicate])} ${this.toNQ(quad[QuadPosition.object])} ${graph}.\n`
  }

  protected quadToNQ(quad: Quad): string {
    return this.quadrupleToNQ([
      quad.subject,
      quad.predicate,
      quad.object,
      quad.graph || this.defaultGraph(),
    ])
  }
}

/**
 * Plain JS/functional implementation of the RDF/JS: Data model specification, limited to a strict
 * rdf subset (no Variable, no Literal as predicate, etc.).
 */
export const DefaultFactory = new PlainFactory()
