import {
  BlankNode,
  Comparable,
  DataFactory,
  Literal,
  NamedNode,
  Node,
  Quad, Quadruple,
  RDFObject,
  Term,
} from './types'

/**
 * Plain JS/functional implementation of the RDF/JS: Data model specification, limited to a strict
 * rdf subset (no Variable, no Literal as predicate, etc.).
 */
export const PlainFactory: DataFactory = {
  bnIndex: 0,

  namedNode(value: string): NamedNode {
    return {
      termType: "NamedNode",
      value,
    }
  },

  blankNode(value?: string): BlankNode {
    return {
      termType: "BlankNode",
      value: value || `b${++this.bnIndex!}`,
    }
  },

  literal(value: string, languageOrDatatype: string | NamedNode): Literal {
    // Perf: Always set all properties to prevent the creation of unnecessary HiddenClass objects.
    return {
      termType: "Literal",
      language: typeof languageOrDatatype === "string" ? languageOrDatatype : undefined,
      datatype: typeof languageOrDatatype === "string"
        ? this.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#langString")
        : languageOrDatatype || this.namedNode("http://www.w3.org/2001/XMLSchema#string"),
      value,
    }
  },

  defaultGraph(): NamedNode {
    return this.namedNode("")
  },

  /**
   * Create an RDF statement in object form.
   * @param subject The subject of the statement
   * @param predicate The predicate of the statement
   * @param object The object of the statement
   * @param graph The graph of the statement
   */
  quad(subject: Node, predicate: NamedNode, object: Term, graph?: NamedNode): Quad {
    return {
      termType: "Quad",
      subject,
      predicate,
      object,
      graph: graph || this.defaultGraph()
    }
  },

  /**
   * * Returns an RDF statement in array form.
   * @param subject The subject of the statement
   * @param predicate The predicate of the statement
   * @param object The object of the statement
   * @param graph The graph of the statement
   */
  quadruple(subject: Node, predicate: NamedNode, object: Term, graph?: NamedNode): Quadruple {
    return [
      subject,
      predicate,
      object,
      graph || this.defaultGraph(),
    ]
  },

  fromTerm(original: Literal | Term): Term {
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
  },

  fromQuad(original: Quad): Quad {
    return {
      termType: "Quad",
      subject: original.subject,
      predicate: original.predicate,
      object: original.object,
      graph: original.graph,
    }
  },

  /**
   * Compare if two RDF objects are the same.
   *
   * Should work with non-standard rdf libraries as well (e.g. supporting Variable and Collection).
   */
  equals(a: Comparable, b: Comparable): boolean {
    if (a === b) {
      return true
    }

    if (a && !b || !a && b) {
      return false
    }

    if (a instanceof Array || b instanceof Array) {
      if (!(a instanceof Array && b instanceof Array)) {
        return false
      }

      return this.equals(a[0], b[0])
        && this.equals(a[1], b[1])
        && this.equals(a[2], b[2])
        && this.equals(a[3], b[3])
    }

    switch ((a as RDFObject).termType) {
      case 'Literal': {
        return a.termType === a.termType
          && (a as Term).value === (b as Term).value
          && (b as Literal).datatype === (b as Literal).datatype
          && (b as Literal).language === (b as Literal).language
      }
      case 'Quad': {
        return (a as Quad).subject === (b as Quad).subject
          && (a as Quad).predicate === (b as Quad).predicate
          && (a as Quad).object === (b as Quad).object
          && (a as Quad).graph === (b as Quad).graph
      }
      default:
        return a.termType === b.termType
          && (a as Term).value === (a as Term).value
    }
  }
}
