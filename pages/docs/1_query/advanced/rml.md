---
title: 'RML materialization'
description: 'Generate RDF from non-RDF data such as CSV and JSON with RML mappings.'
---

[RML](https://w3id.org/rml/portal) mappings describe how non-RDF data, such as CSV and JSON files, is turned into RDF.
[`@comunica/materialize-rml`](https://github.com/jitsedesmet/comunica-feature-rml/tree/main/engines/materialize-rml)
is a standalone engine that _materializes_ a mapping: it generates all RDF quads that the mapping defines.

## Usage

```bash
$ npm install @comunica/materialize-rml
```

Given a file `people.csv`:

```text
id,name
1,Alice
2,Bob
```

and a mapping `mapping.ttl` in the same directory:

```turtle
@prefix rml: <http://w3id.org/rml/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<#PersonMap> a rml:TriplesMap ;
  rml:logicalSource [ rml:source [ rml:path "people.csv" ] ; rml:referenceFormulation rml:CSV ] ;
  rml:subjectMap [ rml:template "http://example.org/person/{id}" ; rml:class foaf:Person ] ;
  rml:predicateObjectMap [ rml:predicate foaf:name ; rml:objectMap [ rml:reference "name" ] ] .
```

the mapping is materialized as follows:

```typescript
import { readFileSync } from 'node:fs';
import { RmlEngine } from '@comunica/materialize-rml';

const quads = await new RmlEngine().materialize(readFileSync('mapping.ttl', 'utf8'), {
  // Generated relative IRIs are resolved against the base IRI
  baseIRI: 'http://example.org/',
  // Relative source paths are resolved against the mapping directory
  mappingDirectory: 'file:///path/to/mappings/',
});

quads.on('data', quad => console.log(quad.subject.value, quad.predicate.value, quad.object.value));
quads.on('end', () => console.log('Done'));
quads.on('error', error => console.error(error));
```

`materialize` returns a stream of [RDF/JS](/docs/query/advanced/rdfjs/) quads without duplicates:

```text
http://example.org/person/1 http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://xmlns.com/foaf/0.1/Person
http://example.org/person/1 http://xmlns.com/foaf/0.1/name Alice
http://example.org/person/2 http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://xmlns.com/foaf/0.1/Person
http://example.org/person/2 http://xmlns.com/foaf/0.1/name Bob
```

Without `mappingDirectory`, relative source paths are resolved against the current working directory.

## Supported mappings

Mappings are written in Turtle with the `http://w3id.org/rml/` vocabulary of [RML-Core](https://w3id.org/rml/core/spec).
The engine passes 74 of the 76 [RML-Core test cases](https://github.com/kg-construct/rml-core/tree/main/test-cases).

| Feature | Support |
|---|---|
| Sources | Local files and HTTP URLs. |
| Reference formulations | `rml:CSV` (the default) and `rml:JSONPath`. |
| Term maps | Constants, references and templates, for IRIs, blank nodes and literals with a datatype or language. |
| Joins | `rml:parentTriplesMap` with any number of join conditions. |
| Graphs | Named graphs and the default graph. |

A mapping that uses a property of the RML vocabulary that is not supported is rejected, instead of silently generating different RDF.
The same holds for a mapping that generates an invalid IRI.
Not supported are blank nodes without template or reference,
and the RML modules beyond RML-Core, such as functions, collections and logical targets.

## How it works

The engine translates a mapping into the same [algebra](/docs/modify/advanced/algebra/) as a SPARQL query,
following the [RML algebra](https://arxiv.org/abs/2503.10385), and evaluates it with the actors that evaluate SPARQL queries:

* A logical source becomes a _source_ operation, which is the only new operation. It binds the values that a mapping refers to, for each record in the data.
* A term map becomes an `EXTEND` with an expression, such as `IRI(CONCAT("http://example.org/person/", ?id))`.
* A join condition becomes a `JOIN` over two sources.
* All triples maps are combined with `UNION`, `DISTINCT` and `CONSTRUCT`.

Reference formulations are actors on the
[RML Reference Formulation bus](https://github.com/jitsedesmet/comunica-feature-rml/tree/main/packages/bus-rml-reference-formulation),
so support for other data formats can be [added as an actor](/docs/modify/).
