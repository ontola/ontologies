# Ontologies
Like DefinitelyTyped, but for ontologies.

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

### Collisions with ES reserved keywords
When a term from a vocabulary collides with a [reserved keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Keywords)
or certain built-in classes, the term is prepended with the symbol of the ontology.

```javascript
import { and, shclass } from '@ontologies/sh'

// 'and' is not a JS reserved keyword
console.log(and.value) // http://www.w3.org/ns/shacl#and
// 'class' is a reserved keyword, so the package name is prepended to the js identifier.
console.log(shclass.value) // http://www.w3.org/ns/shacl#class
```
