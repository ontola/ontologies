# {{humanName}} ontology

This package contains the terms from the {{humanName}} ontology for JavaScript and TypeScript.

Namespace: [`{{{ns}}}`]({{ns}})

{{#if spec}}
Normative spec: [`{{spec}}`]({{spec}})

{{/if}}
{{#if lov}}
LOV: [`{{lov}}`]({{lov}})

{{/if}}
{{#if source}}
Source: [`{{source}}`]({{source}})

{{/if}}

### About
This readme was automatically generated, for more information see the main [ontologies repository]({{{ontologiesRepo}}}).

The terms in this vocabulary are generated from their RDF representations which generally aren't the canonical definitions,
please refer to the specification for their canonical definitions.

#### Usage

With default export

```javascript
import {{symbol}} from '@ontologies/{{symbol}}'

console.log({{symbol}}.vocTerm) // { termType: 'NamedNode', value: "{{ns}}vocTerm" }
```

With named exports

```javascript
import { vocTerm } from '@ontologies/{{symbol}}'

console.log(vocTerm) // { termType: 'NamedNode', value: "{{ns}}vocTerm" }
```

Use the `ns` function when missing a term or when using custom extensions

```javascript
import {{symbol}} from '@ontologies/{{symbol}}'

console.log({{symbol}}.ns('myTerm')) // { termType: 'NamedNode', value: "{{ns}}myTerm" }
```

#### Statistics

Total term count: {{{termCount}}}

Of which classes {{{classCount}}} (including data types)

Of which properties: {{{propertyCount}}}

Other terms: {{{otherTermCount}}}
