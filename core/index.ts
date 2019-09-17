import { PlainFactory } from './PlainFactory'

let setup

if (typeof Symbol !== "undefined") {
  const rdfFactory: unique symbol = Symbol('rdfFactory')

  setup = function setup() {
    if (typeof (globalThis as any)[rdfFactory] === "undefined") {
      (globalThis as any)[rdfFactory] = PlainFactory
    }
  }
} else {
  const rdfFactory = 'rdfFactory'

  setup = function setup() {
    if (typeof (globalThis as any)[rdfFactory] === "undefined") {
      (globalThis as any)[rdfFactory] = PlainFactory
    }
  }
}

export { setup }

export default rdfFactory
