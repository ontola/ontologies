# Ontologies
Never manage a namespace object map again, scrap typo's for well-known ontologies. Like DefinitelyTyped, but for ontologies.

## Usage

### @ontologies/core
When working with RDF (linked data) ontologies are very important, but being able to quickly create
and work with the fundamental building blocks of RDF is equally important. `@ontologies/core` exports
an object (_data factory_) which aims to to just that.

Assuming the following import in the examples:

```javascript 
import rdf from "@ontologies/core"
```

#### Create literals
```javascript
// Strings
rdf.literal("Hello world!") 
// { termType: "Literal", value: "Hello World!", datatype: { termType: "NamedNode", value: "http://www.w3.org/2001/XMLSchema#string" } }
```

```javascript
// Numbers
rdf.literal(9001) 
// { termType: "Literal", value: "9001", datatype: { termType: "NamedNode", value: "http://www.w3.org/2001/XMLSchema#integer" } }
```

Most JS literals will be mapped to their RDF (xsd) counterparts, passing the datatype explicitly is
also possible. Please note that data types in RDF must be IRIs.

```javascript
rdf.literal("(5,2)", rdf.namedNode("http://example.com/types/myCoordinate")) 
// { termType: "Literal", value: "(5,2)", datatype: { termType: "NamedNode", value: "http://example.com/types/myCoordinate" } }
```

#### Create links
Use `namedNode` to create links to other resources which have been _named_, meaning an authority has
given the resource a fixed identifier on their domain. This can be a resource on the web (e.g. 
`http:`, `https:`) but also in the internet (e.g. `ftp:` or `magnet:`) or elsewhere (e.g. `urn:isbn:`
or `doi:`). Note that choosing schemes which are widely deployed (e.g. `https:`) will allow others 
easier access to find, access, and share your data. 

```javascript
rdf.namedNode("https://schema.org/Thing") 
// { termType: "NamedNode", value: "https://schema.org/Thing" }

rdf.namedNode("https://example.com/myDocument#paragraph") 
// { termType: "NamedNode", value: "https://example.com/myDocument#paragraph" }

rdf.namedNode("urn:isbn:978-0-201-61622-4") 
// { termType: "NamedNode", value: "urn:isbn:978-0-201-61622-4" }
```

[Cool iris don't change](https://www.w3.org/Provider/Style/URI), but designing systems is difficult,
so there will be resources which don't have their own name or are too expensive to assign a name.
This is where blank nodes can be used, these are resources as well, but with _"an identifier yet to
be assigned"_. This is a bit of a tricky way of saying "it thing has a name, but I don't know it yet".

```javascript
// Create blank nodes (links which have no place in the web yet)
rdf.blankNode() 
// { termType: "BlankNode", value: "b0" }

rdf.blankNode("fixed") 
// { termType: "BlankNode", value: "fixed" }
```

Note that most of the time blank nodes can be replaced with fragment (`#`) IRIs without much trouble.

```json5
{
  "@id": "http://example.com/myCollection",
  "members": {
    "@id": "http://example.com/myCollection#members", // Append `#members` to the base rather than use a blank node
    "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq",
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#_0": "First item",
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#_1": "Second item",
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#_2": "Third item",
  }
}
``` 

#### Create statements
```javascript
// Create quads (Statements about some thing in the world)
rdf.quad(s, p, o) 
// { subject: <s>, predicate: <p>, object: <o>, graph: <defaultGraph> }
```

```javascript
// Compare rdf objects
import { Thing } from "@ontologies/schema";
console.log(rdf.equals(rdf.namedNode("https://schema.org/Thing"), Thing)) 
// true


// Serialize to n-triples/quads
console.log(rdf.toNQ())
```

#### Other exports
Overview of the exports of @ontologies/core;

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

```javascript
import { name } from '@ontologies/schema'

console.log(name) // http://schema.org/name
```

All terms

```javascript
import * as schema from '@ontologies/schema'

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

### Overriding the default factory
The default factory used is the `PlainFactory` from this package. This is a factory which should
suffice most needs, but certain JS RDF libraries expect more methods to be available on the factory.
It is possible to override the factory with a custom one.

Initialize a custom factory by calling `setup()` from `@ontologies/core`

```javascript
import { setup } from "@ontologies/core";
import myFactory from "./myFactory";

setup(new myFactory);
```

Library authors who want to provide an alternate default than the PlainFactory but who don't want to
override the end-users setting can soft-override the factory;

```javascript
import { setup } from "@ontologies/core";
import LibFactory from "./LibFactory";

setup(new LibFactory(), false); // Passing false will override the default but not a user-set factory.
``` 

### Help, my factory isn't loaded!
Chances are you have called `setup` too late in the module initialization cycle. Be sure to;
1. Move the setup call in a _separate_ file.
2. Don't import _any_ package using the default export from `@ontologies/core` in that file.
3. **Import that file before any other import** which uses default export from `@ontologies/core` in that file.

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
If a term collides with an [ES 5/6 reserved keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Keywords)
or certain built-in classes, the term is prepended with the symbol of the ontology:

```javascript
import { name, schemayield } from '@ontologies/schema'

// 'name' is not a JS reserved keyword
console.log(name.value) // "http://schema.org/name"
// 'yield' is a reserved keyword, so the package name is prepended to the js identifier.
console.log(schemayield.value) // "http://schema.org/yield"
```
