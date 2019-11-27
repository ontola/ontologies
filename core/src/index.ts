import "@ungap/global-this";

import { DefaultFactory, PlainFactory } from "./PlainFactory";
import {
  DataFactory,
  NamedNode,
  Namespace,
} from "./types";

let setup: (factory?: DataFactory, override?: boolean) => void;
let globalFactory: DataFactory & any;
let globalSymbol: any;

if (typeof Symbol !== "undefined") {
  const rdfFactory: unique symbol = Symbol.for('rdfFactory');

  setup = function setup(factory = DefaultFactory, override = true) {
    if (typeof (globalThis as any)[rdfFactory] === "undefined" || override) {
      (globalThis as any)[rdfFactory] = factory;
      globalFactory = factory;
    } else if (typeof globalFactory === "undefined" || override) {
      globalFactory = factory;
    }
  };

  globalFactory = (globalThis as any)[rdfFactory];
  globalSymbol = rdfFactory;
} else {
  const rdfFactory = 'rdfFactory';

  setup = function setup(factory = DefaultFactory, override = true) {
    if (typeof (globalThis as any)[rdfFactory] === "undefined" || override) {
      (globalThis as any)[rdfFactory] = factory;
      globalFactory = factory;
    } else if (typeof globalFactory === "undefined" || override) {
      globalFactory = factory;
    }
  };

  globalSymbol = rdfFactory;
  globalFactory = (globalThis as any)[rdfFactory];
}

export const createNS = (ns: string): Namespace =>
  (term: string): NamedNode =>
    globalFactory.namedNode(`${ns}${term}`);

let proxy: DataFactory<any> & any;
if (typeof Proxy !== "undefined") {
  proxy = new Proxy<DataFactory>(globalFactory || ({} as DataFactory & any), {
    ownKeys(): (string|number|symbol)[] {
      return globalFactory && Object.keys(globalFactory) || [];
    },

    getOwnPropertyDescriptor(_, k: string | number | symbol): PropertyDescriptor | undefined {
      return Object.getOwnPropertyDescriptor(globalFactory, k as string);
    },

    set(_, property: keyof DataFactory & any, value): boolean {
      globalFactory[property] = value;
      return true;
    },

    get(_, property: keyof DataFactory & any) {
      return globalFactory[property];
    },
  })
} else {
  proxy = [
    'namedNode',
    'blankNode',
    'literal',
    'defaultGraph',
    'quad',
    'quadruple',
    'fromTerm',
    'fromQuad',
    'fromQdr',
    'qdrFromQuad',
    'qdrFromQdr',
    'equals',
    'id',
    'toNQ',
    'fromId',
    'termToNQ',
    'termFromNQ',
    'quadrupleToNQ',
    'quadToNQ',
  ].reduce((acc, key) => {
    acc[key] = (...args: any[]) => globalFactory[key](...args);
    return acc;
  }, {} as { [k: string]: Function });
}

export {
  setup,
  globalFactory,
  globalSymbol,
  PlainFactory,
};

export * from './types';
export * from './utilities';

export default proxy;
