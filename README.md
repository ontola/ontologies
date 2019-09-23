# Ontologies
Never manage a namespace object map again, scrap typo's for well-known ontologies. Like DefinitelyTyped, but for ontologies.

## Usage

### @ontologies/core
This is a special package which provides a few parts;

* A default export which is a proxy to the currently assigned global [Data Factory](http://rdf.js.org/data-model-spec/#datafactory-interface).
* A named export `globalSymbol` which is a symbol to identify the Data Factory
used by the other @ontologies/ packages to create rdf objects with.
* A named export `setup` which binds the PlainFactory to the global scope under the globalSymbol 
   identifier if it was previously undefined.
* A named export `globalFactory` which should be a reference to the last .
* A named export `PlainFactory` which implements the Data Factory interface (with slight adjustments)
   in a functional way (e.g. no instance methods, but provides an `equals` function on the factory itself). 
* A named export `createNS` which you can use to create namespaces with which ease NamedNode
    creation using the global factory.
* A small set of types useful for working with RDF.

### @ontologies/*
The other packages are generated from their respective ontologies, providing client applications with
importable symbols and a named export `ns` with which custom additional terms can be created within
the given namespace.

### Usage
Initialize using by calling `setup()` from `@ontologies/core`

```javascript
import { setup } from "@ontologies/core";

setup();
```

With named exports

```javascript
import { name } from '@ontologies/schema'

console.log(name) // http://schema.org/name
```

With default export

```javascript
import schema from '@ontologies/schema'

console.log(schema.name) // http://schema.org/name
```

Custom terms

```javascript
import { ns } from '@ontologies/schema'

console.log(ns('extension')) // http://schema.org/extension
```

Use `.value` for the string representation

```javascript
import { name } from '@ontologies/schema'

console.log(name.value) // "http://schema.org/name"
```

### Non-js symbols
Dashes in term names are replaced with underscores. The default export contains both the verbatim
and the underscored values.

```javascript
import dcterms, { ISO639_2 } from '@ontologies'

console.log(ISO639_2) // NamedNode(http://purl.org/dc/terms/ISO639-2)
console.log(dcterms.ISO639_2) // NamedNode(http://purl.org/dc/terms/ISO639-2)
console.log(dcterms['ISO639-2']) // NamedNode(http://purl.org/dc/terms/ISO639-2)
```

### Collisions with ES reserved keywords
No reserved object property keys exist for JavaScript object literals, so when using the default
export, terms can be accessed directly:

```javascript
import schema from '@ontologies/schema'

console.log(schema.yield) // NamedNode(http://schema.org/name)
```

When using the named exports, if a term collides with an [ES 5/6 reserved keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Keywords)
or certain built-in classes, the term is prepended with the symbol of the ontology:

```javascript
import { name, schemayield } from '@ontologies/schema'

// 'name' is not a JS reserved keyword
console.log(name.value) // "http://schema.org/name"
// 'yield' is a reserved keyword, so the package name is prepended to the js identifier.
console.log(schemayield.value) // "http://schema.org/yield"
```
