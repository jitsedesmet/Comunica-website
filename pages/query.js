import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';

export default function Query() {
  const [query, setQuery] = useState(`PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX dbr: <http://dbpedia.org/resource/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?movie WHERE {
  ?movie dbo:starring dbr:Brad_Pitt ;
         dbo:starring dbr:Leonardo_DiCaprio .
} LIMIT 10`);
  
  const [datasources, setDatasources] = useState(['https://dbpedia.org/sparql']);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [outputFormat, setOutputFormat] = useState('table');
  const [bypassCache, setBypassCache] = useState(false);
  const queryEngineRef = useRef(null);

  const exampleQueries = [
    {
      name: 'DBpedia - Movies with Brad Pitt and Leonardo DiCaprio',
      description: 'Find movies starring both Brad Pitt and Leonardo DiCaprio from DBpedia',
      query: `PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX dbr: <http://dbpedia.org/resource/>

SELECT ?movie ?movieName WHERE {
  ?movie dbo:starring dbr:Brad_Pitt ;
         dbo:starring dbr:Leonardo_DiCaprio ;
         rdfs:label ?movieName .
  FILTER(LANG(?movieName) = "en")
} LIMIT 10`,
      datasources: ['https://dbpedia.org/sparql']
    },
    {
      name: 'DBpedia - Actors in The Matrix',
      description: 'List all actors who starred in The Matrix',
      query: `PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX dbr: <http://dbpedia.org/resource/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?actor ?name WHERE {
  dbr:The_Matrix dbo:starring ?actor .
  ?actor rdfs:label ?name .
  FILTER(LANG(?name) = "en")
} LIMIT 20`,
      datasources: ['https://dbpedia.org/sparql']
    },
    {
      name: 'Wikidata - Countries and Capitals',
      description: 'Get a list of countries and their capital cities',
      query: `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?country ?countryLabel ?capital ?capitalLabel WHERE {
  ?country wdt:P31 wd:Q3624078 ;
           wdt:P36 ?capital ;
           rdfs:label ?countryLabel ;
  ?capital rdfs:label ?capitalLabel .
  FILTER(LANG(?countryLabel) = "en" && LANG(?capitalLabel) = "en")
} LIMIT 20`,
      datasources: ['https://query.wikidata.org/sparql']
    }
  ];

  useEffect(() => {
    // Load webMCP library
    const script = document.createElement('script');
    script.src = '/js/webmcp.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      registerWebMCPTools();
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Re-register tools when state changes to update closures
  useEffect(() => {
    if (window.navigator?.modelContext) {
      registerWebMCPTools();
    }
  }, [query, datasources, results, bypassCache, outputFormat]);

  const registerWebMCPTools = () => {
    if (!window.navigator.modelContext) {
      console.warn('WebMCP not available');
      return;
    }

    window.navigator.modelContext.provideContext({
      tools: [
        {
          name: 'set-datasources',
          description: 'Change the SPARQL datasources (endpoints) to query. Accepts an array of SPARQL endpoint URLs or RDF document URLs.',
          inputSchema: {
            type: 'object',
            properties: {
              datasources: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of datasource URLs (SPARQL endpoints or RDF documents)'
              }
            },
            required: ['datasources']
          },
          execute: ({ datasources: newDatasources }) => {
            setDatasources(newDatasources);
            return {
              content: [{
                type: 'text',
                text: `Datasources updated to: ${newDatasources.join(', ')}`
              }]
            };
          }
        },
        {
          name: 'set-bypass-cache',
          description: 'Enable or disable the bypass cache option for query execution. Use this when you notice caching issues or need fresh data.',
          inputSchema: {
            type: 'object',
            properties: {
              bypass: {
                type: 'boolean',
                description: 'True to bypass cache, false to use cache'
              }
            },
            required: ['bypass']
          },
          execute: ({ bypass }) => {
            setBypassCache(bypass);
            return {
              content: [{
                type: 'text',
                text: `Cache bypass ${bypass ? 'enabled' : 'disabled'}`
              }]
            };
          }
        },
        {
          name: 'set-output-format',
          description: 'Change the output format for CONSTRUCT query results. Available formats: table, json, turtle, n-triples, trig',
          inputSchema: {
            type: 'object',
            properties: {
              format: {
                type: 'string',
                enum: ['table', 'json', 'turtle', 'n-triples', 'trig'],
                description: 'Output format for query results'
              }
            },
            required: ['format']
          },
          execute: ({ format }) => {
            setOutputFormat(format);
            return {
              content: [{
                type: 'text',
                text: `Output format set to: ${format}`
              }]
            };
          }
        },
        {
          name: 'get-share-link',
          description: 'Generate a shareable link for the current query and datasources. The link can optionally auto-execute the query on load.',
          inputSchema: {
            type: 'object',
            properties: {
              autoExecute: {
                type: 'boolean',
                description: 'Whether the shared link should auto-execute the query on load'
              }
            },
            required: ['autoExecute']
          },
          execute: ({ autoExecute }) => {
            const params = new URLSearchParams();
            params.set('query', query);
            params.set('datasources', JSON.stringify(datasources));
            if (autoExecute) {
              params.set('autoExecute', 'true');
            }
            const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
            
            return {
              content: [{
                type: 'text',
                text: `Share link: ${shareUrl}\n\nThis link ${autoExecute ? 'will' : 'will not'} automatically execute the query when opened.`
              }]
            };
          }
        },
        {
          name: 'list-example-queries',
          description: 'List available example queries with their names and descriptions. Use this to help users discover pre-made queries.',
          inputSchema: {
            type: 'object',
            properties: {}
          },
          execute: () => {
            const examplesList = exampleQueries.map((ex, i) => 
              `${i + 1}. ${ex.name}\n   ${ex.description}\n   Datasources: ${ex.datasources.join(', ')}`
            ).join('\n\n');
            
            return {
              content: [{
                type: 'text',
                text: `Available example queries:\n\n${examplesList}`
              }]
            };
          }
        },
        {
          name: 'load-example-query',
          description: 'Load a specific example query by its index (1-based). First use list-example-queries to see available queries.',
          inputSchema: {
            type: 'object',
            properties: {
              index: {
                type: 'number',
                description: 'The 1-based index of the example query to load'
              }
            },
            required: ['index']
          },
          execute: ({ index }) => {
            const example = exampleQueries[index - 1];
            if (!example) {
              throw new Error(`Invalid example index: ${index}. Valid range: 1-${exampleQueries.length}`);
            }
            
            setQuery(example.query);
            setDatasources(example.datasources);
            
            return {
              content: [{
                type: 'text',
                text: `Loaded example query: "${example.name}"\n\n${example.description}\n\nQuery:\n${example.query}\n\nDatasources: ${example.datasources.join(', ')}`
              }]
            };
          }
        },
        {
          name: 'set-query',
          description: 'Set or update the SPARQL query in the editor. Use this to suggest queries based on natural language requests.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The SPARQL query to set in the editor'
              }
            },
            required: ['query']
          },
          execute: ({ query: newQuery }) => {
            setQuery(newQuery);
            return {
              content: [{
                type: 'text',
                text: `Query updated:\n${newQuery}`
              }]
            };
          }
        },
        {
          name: 'execute-query',
          description: 'Execute the current SPARQL query against the configured datasources.',
          inputSchema: {
            type: 'object',
            properties: {}
          },
          execute: async () => {
            await executeQuery();
            return {
              content: [{
                type: 'text',
                text: 'Query executed successfully. Check the results in the UI.'
              }]
            };
          }
        },
        {
          name: 'get-query-results',
          description: 'Get the results of the last executed query in a structured format that can be interpreted.',
          inputSchema: {
            type: 'object',
            properties: {}
          },
          execute: () => {
            if (!results) {
              return {
                content: [{
                  type: 'text',
                  text: 'No query results available. Execute a query first using execute-query.'
                }]
              };
            }
            
            return {
              content: [{
                type: 'text',
                text: `Query results (${results.length} results):\n${JSON.stringify(results, null, 2)}`
              }]
            };
          }
        }
      ]
    });

    console.log('WebMCP tools registered successfully');
  };

  const executeQuery = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Dynamically import Comunica
      const { QueryEngine } = await import('@comunica/query-sparql');
      
      if (!queryEngineRef.current) {
        queryEngineRef.current = new QueryEngine();
      }

      const context = {
        sources: datasources,
        ...(bypassCache && { 
          fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' })
        })
      };

      const bindingsStream = await queryEngineRef.current.queryBindings(query, context);
      const bindings = await bindingsStream.toArray();
      
      const formattedResults = bindings.map(binding => {
        const obj = {};
        for (const [key, value] of binding) {
          obj[key.value] = {
            type: value.termType,
            value: value.value
          };
        }
        return obj;
      });

      setResults(formattedResults);
    } catch (err) {
      setError(err.message);
      console.error('Query execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addDatasource = () => {
    const newSource = prompt('Enter datasource URL:');
    if (newSource && newSource.trim()) {
      setDatasources([...datasources, newSource.trim()]);
    }
  };

  const removeDatasource = (index) => {
    setDatasources(datasources.filter((_, i) => i !== index));
  };

  const loadExample = (index) => {
    const example = exampleQueries[index];
    setQuery(example.query);
    setDatasources(example.datasources);
  };

  // Check for URL parameters and handle auto-execution
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('query');
    const datasourcesParam = params.get('datasources');
    const autoExecuteParam = params.get('autoExecute') === 'true';

    let shouldExecute = false;

    if (queryParam && queryParam !== query) {
      setQuery(queryParam);
      shouldExecute = autoExecuteParam;
    }
    
    if (datasourcesParam) {
      try {
        const parsedDatasources = JSON.parse(datasourcesParam);
        const currentDatasourcesStr = JSON.stringify(datasources);
        const newDatasourcesStr = JSON.stringify(parsedDatasources);
        
        if (currentDatasourcesStr !== newDatasourcesStr) {
          setDatasources(parsedDatasources);
          shouldExecute = autoExecuteParam;
        }
      } catch (e) {
        console.error('Failed to parse datasources from URL');
      }
    }
    
    // Auto-execute when both query and datasources are set and autoExecute is true
    if (autoExecuteParam && queryParam && query === queryParam && datasources.length > 0) {
      const paramsKey = `${queryParam}-${JSON.stringify(datasources)}`;
      const lastExecuted = sessionStorage.getItem('lastQueryExecuted');
      
      if (lastExecuted !== paramsKey) {
        sessionStorage.setItem('lastQueryExecuted', paramsKey);
        executeQuery();
      }
    }
  }, [query, datasources]);

  return (
    <div>
      <Head>
        <title>Comunica SPARQL Query Interface - WebMCP Enabled</title>
        <meta name="description" content="Execute SPARQL queries with Comunica - WebMCP enabled for AI agent interaction" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Comunica SPARQL Query Interface</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          🧪 <strong>WebMCP Enabled</strong> - This page can be controlled by AI agents
        </p>

        <div style={{ marginBottom: '20px' }}>
          <h2>Datasources</h2>
          {datasources.map((source, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
              <input 
                type="text" 
                value={source} 
                onChange={(e) => {
                  const newDatasources = [...datasources];
                  newDatasources[index] = e.target.value;
                  setDatasources(newDatasources);
                }}
                style={{ flex: 1, padding: '5px', marginRight: '10px' }}
              />
              <button onClick={() => removeDatasource(index)}>Remove</button>
            </div>
          ))}
          <button onClick={addDatasource}>Add Datasource</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2>Options</h2>
          <label style={{ display: 'block', marginBottom: '10px' }}>
            <input 
              type="checkbox" 
              checked={bypassCache} 
              onChange={(e) => setBypassCache(e.target.checked)}
            />
            {' '}Bypass Cache
          </label>
          <label style={{ display: 'block' }}>
            Output Format: 
            <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} style={{ marginLeft: '10px' }}>
              <option value="table">Table</option>
              <option value="json">JSON</option>
              <option value="turtle">Turtle</option>
              <option value="n-triples">N-Triples</option>
              <option value="trig">TriG</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2>Example Queries</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {exampleQueries.map((example, index) => (
              <button 
                key={index} 
                onClick={() => loadExample(index)}
                style={{ padding: '10px' }}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2>SPARQL Query</h2>
          <textarea 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ 
              width: '100%', 
              height: '200px', 
              fontFamily: 'monospace',
              padding: '10px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={executeQuery}
            disabled={loading}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px',
              backgroundColor: loading ? '#ccc' : '#e2001a',
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </button>
        </div>

        {error && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#ffebee', 
            border: '1px solid #c62828',
            marginBottom: '20px'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {results && (
          <div>
            <h2>Results ({results.length})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                border: '1px solid #ddd'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    {results.length > 0 && Object.keys(results[0]).map(key => (
                      <th key={key} style={{ 
                        padding: '10px', 
                        border: '1px solid #ddd',
                        textAlign: 'left'
                      }}>
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index}>
                      {Object.values(result).map((value, i) => (
                        <td key={i} style={{ 
                          padding: '10px', 
                          border: '1px solid #ddd'
                        }}>
                          {value.value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '10px' }}>
              <button onClick={() => {
                const json = JSON.stringify(results, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'query-results.json';
                a.click();
              }}>
                Download Results (JSON)
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
