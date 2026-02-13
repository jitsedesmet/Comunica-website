---
title: 'WebMCP Support'
description: 'Using Comunica with WebMCP for AI Agent Integration'
---

# WebMCP Support

Comunica now supports [WebMCP (Web Model Context Protocol)](https://github.com/webmachinelearning/webmcp), enabling AI agents and assistive technologies to interact with the Comunica query interface programmatically.

## What is WebMCP?

WebMCP is a JavaScript API that allows web applications to expose their functionality as "tools" that can be invoked by AI agents, browser assistants, and assistive technologies. This enables collaborative workflows where users and agents work together within the same web interface.

## Try it Out

Visit our [WebMCP-enabled Query Interface](/query) to experience SPARQL querying with AI agent support.

## Available Tools

The Comunica query interface exposes the following WebMCP tools for AI agents:

### 1. `set-datasources`
Change the SPARQL datasources (endpoints) to query.

**Parameters:**
- `datasources` (array): Array of datasource URLs (SPARQL endpoints or RDF documents)

**Example:**
```javascript
navigator.modelContext.executeTool('set-datasources', {
  datasources: ['https://dbpedia.org/sparql', 'https://query.wikidata.org/sparql']
});
```

### 2. `set-bypass-cache`
Enable or disable the bypass cache option for query execution.

**Parameters:**
- `bypass` (boolean): True to bypass cache, false to use cache

**Example:**
```javascript
navigator.modelContext.executeTool('set-bypass-cache', {
  bypass: true
});
```

### 3. `set-output-format`
Change the output format for CONSTRUCT query results.

**Parameters:**
- `format` (string): One of: `table`, `json`, `turtle`, `n-triples`, `trig`

**Example:**
```javascript
navigator.modelContext.executeTool('set-output-format', {
  format: 'json'
});
```

### 4. `get-share-link`
Generate a shareable link for the current query and datasources.

**Parameters:**
- `autoExecute` (boolean): Whether the shared link should auto-execute the query on load

**Example:**
```javascript
const result = await navigator.modelContext.executeTool('get-share-link', {
  autoExecute: true
});
```

### 5. `list-example-queries`
List available example queries with their names and descriptions.

**Example:**
```javascript
const result = await navigator.modelContext.executeTool('list-example-queries', {});
```

### 6. `load-example-query`
Load a specific example query by its index (1-based).

**Parameters:**
- `index` (number): The 1-based index of the example query to load

**Example:**
```javascript
await navigator.modelContext.executeTool('load-example-query', {
  index: 1
});
```

### 7. `set-query`
Set or update the SPARQL query in the editor.

**Parameters:**
- `query` (string): The SPARQL query to set in the editor

**Example:**
```javascript
await navigator.modelContext.executeTool('set-query', {
  query: 'SELECT * WHERE { ?s ?p ?o } LIMIT 10'
});
```

### 8. `execute-query`
Execute the current SPARQL query against the configured datasources.

**Example:**
```javascript
await navigator.modelContext.executeTool('execute-query', {});
```

### 9. `get-query-results`
Get the results of the last executed query in a structured format.

**Example:**
```javascript
const results = await navigator.modelContext.executeTool('get-query-results', {});
```

## Example Use Cases

### Find Movies Starring Specific Actors

An AI agent can help users find movies with specific actors:

```
User: "What are the movies starring both Brad Pitt and Leonardo DiCaprio?"

Agent Actions:
1. Set datasources to DBpedia SPARQL endpoint
2. Generate and set appropriate SPARQL query
3. Execute the query
4. Interpret and explain the results
```

The agent would execute:
```javascript
// 1. Set datasource
await navigator.modelContext.executeTool('set-datasources', {
  datasources: ['https://dbpedia.org/sparql']
});

// 2. Set query
await navigator.modelContext.executeTool('set-query', {
  query: `PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX dbr: <http://dbpedia.org/resource/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?movie ?movieName WHERE {
  ?movie dbo:starring dbr:Brad_Pitt ;
         dbo:starring dbr:Leonardo_DiCaprio ;
         rdfs:label ?movieName .
  FILTER(LANG(?movieName) = "en")
} LIMIT 10`
});

// 3. Execute query
await navigator.modelContext.executeTool('execute-query', {});

// 4. Get and interpret results
const results = await navigator.modelContext.executeTool('get-query-results', {});
```

### Explore Example Queries

An agent can help users discover and learn from example queries:

```
User: "Show me some example queries I can try"

Agent Actions:
1. List available example queries
2. Explain what each query does
3. Optionally load one based on user interest
```

## Using WebMCP in Your Own Applications

You can integrate the WebMCP library into your own web applications. The library is available at `/js/webmcp.js`.

### Basic Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>My WebMCP App</title>
</head>
<body>
  <script src="/js/webmcp.js"></script>
  <script>
    // Wait for WebMCP to be ready
    window.addEventListener('webmcp:ready', () => {
      // Register your tools
      navigator.modelContext.provideContext({
        tools: [
          {
            name: 'my-tool',
            description: 'Description of what this tool does',
            inputSchema: {
              type: 'object',
              properties: {
                param1: {
                  type: 'string',
                  description: 'Description of param1'
                }
              },
              required: ['param1']
            },
            execute: ({ param1 }, agent) => {
              // Tool implementation
              return {
                content: [{
                  type: 'text',
                  text: `Executed with param1: ${param1}`
                }]
              };
            }
          }
        ]
      });
    });
  </script>
</body>
</html>
```

## Benefits of WebMCP

- **Human-in-the-loop workflows**: Support cooperative scenarios where users work together with AI agents
- **Simplified integration**: Enable AI agents to be more reliable by interacting through well-defined tools
- **Code reuse**: Leverage existing JavaScript code to expose functionality to agents
- **Accessibility**: Provide a standardized way for assistive technologies to access web application functionality

## Learn More

- [WebMCP Specification](https://github.com/webmachinelearning/webmcp)
- [WebMCP API Proposal](https://github.com/webmachinelearning/webmcp/blob/main/docs/proposal.md)
- [Try the Query Interface](/query)

## Solid Authentication

While Solid authentication flows can be initialized through the query interface, please note that full Solid integration requires additional setup and configuration. The `set-datasources` tool can be used to query Solid pods once authentication is established.

## Future Enhancements

We're continuously improving our WebMCP support. Planned enhancements include:

- Enhanced result interpretation with semantic understanding
- Support for federated queries across multiple sources
- Advanced caching strategies controllable via WebMCP
- Date/time filtering tools for temporal queries
- Integration with additional Comunica features like link traversal
