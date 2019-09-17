import { PlainFactory } from './PlainFactory'
import {
  BlankNode,
  Comparable,
  DataFactory,
  Literal,
  NamedNode,
  Namespace,
  Node,
  Quad,
  Quadruple,
  Term,
} from './types'

let setup: (factory?: DataFactory) => void
let globalFactory: DataFactory
let globalSymbol: any

if (typeof Symbol !== "undefined") {
  const rdfFactory: unique symbol = Symbol.for('rdfFactory')

  setup = function setup(factory = PlainFactory) {
    if (typeof (globalThis as any)[rdfFactory] === "undefined") {
      (globalThis as any)[rdfFactory] = factory
      globalFactory = factory
    } else if (typeof globalFactory === "undefined") {
      globalFactory = factory
    }
  }

  globalFactory = (globalThis as any)[rdfFactory]
  globalSymbol = rdfFactory;
} else {
  const rdfFactory = 'rdfFactory'

  setup = function setup(factory = PlainFactory) {
    if (typeof (globalThis as any)[rdfFactory] === "undefined") {
      (globalThis as any)[rdfFactory] = factory
      globalFactory = factory
    } else if (typeof globalFactory === "undefined") {
      globalFactory = factory
    }
  }

  globalSymbol = rdfFactory;
  globalFactory = (globalThis as any)[rdfFactory]
}

export const createNS = (ns: string): Namespace =>
  (term: string): NamedNode =>
    globalFactory.namedNode(`${ns}${term}`)

let proxy: DataFactory
if (typeof Proxy !== "undefined") {
  proxy = new Proxy<DataFactory>(globalFactory || ({} as DataFactory), {
    set(_, property: keyof DataFactory, value): boolean {
      globalFactory[property] = value;
      return true;
    },

    get(_, property: keyof DataFactory) {
      return globalFactory[property];
    },
  })
} else {
  // TODO: implement proxy-like object supporting DataFactory
  proxy = {
    namedNode(value: string): NamedNode {
      return globalFactory.namedNode(value)
    },

    blankNode(value?: string): BlankNode {
      return globalFactory.blankNode(value)
    },

    literal(value: string, languageOrDatatype: string | NamedNode): Literal {
      return globalFactory.literal(value, languageOrDatatype)
    },

    defaultGraph(): NamedNode {
      return globalFactory.defaultGraph()
    },

    quad(subject: Node, predicate: NamedNode, object: Term, graph?: NamedNode): Quad {
      return globalFactory.quad(subject, predicate, object, graph)
    },

    quadruple(subject: Node, predicate: NamedNode, object: Term, graph?: NamedNode): Quadruple {
      return globalFactory.quadruple(subject, predicate, object, graph)
    },

    fromTerm(original: Literal | Term): Term {
      return globalFactory.fromTerm(original)
    },

    fromQuad(original: Quad): Quad {
      return globalFactory.fromQuad(original)
    },

    equals(a: Comparable, b: Comparable): boolean {
      return globalFactory.equals(a, b)
    },
  }
}

export {
  setup,
  globalFactory,
  globalSymbol,
  PlainFactory,
}

export * from './types'

export default proxy
