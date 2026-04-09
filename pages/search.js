import React from 'react';
import Fuse from 'fuse.js';
import Head from '../components/Head';
import Navigation from '../components/Navigation';
import Foot from '../components/Foot';
import SearchBar from '../components/SearchBar';

const FUSE_OPTIONS = {
    keys: [
        { name: 'title', weight: 3 },
        { name: 'description', weight: 2 },
        { name: 'content', weight: 1 },
    ],
    threshold: 0.35,
    includeScore: true,
    minMatchCharLength: 2,
};

export default class SearchPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            query: '',
            results: [],
            loading: false,
            indexLoaded: false,
        };
        this.fuse = null;
    }

    componentDidMount() {
        // Read query from URL
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q') || '';
        this.setState({ query: q, loading: true });

        fetch('/search-index.json')
            .then(r => r.json())
            .then(data => {
                this.fuse = new Fuse(data, FUSE_OPTIONS);
                const results = q ? this.fuse.search(q) : [];
                this.setState({ results, loading: false, indexLoaded: true });
            })
            .catch(() => this.setState({ loading: false, indexLoaded: true }));
    }

    render() {
        const { query, results, loading } = this.state;
        return (
            <div className="container-page">
                <Head
                    title={query ? `Search: ${query}` : 'Search'}
                    description="Search the Comunica documentation"
                />
                <nav>
                    <div>
                        <a href="/"><img src="/img/comunica_white.svg" className="nav-icon" alt="Comunica logo" /></a>
                        <a href="#" className="toggle-nav"><img src="/img/navigation-toggle.svg" alt="Toggle navigation bar" /></a>
                    </div>
                    <ul>
                        <li><a href="https://query.comunica.dev/">Try live</a></li>
                        <li><a href="/docs/">Docs</a></li>
                        <li><a href="/blog/">Blog</a></li>
                        <li><a href="/about/">About</a></li>
                        <li><a href="/ask/">Ask</a></li>
                        <li><a href="/research/">Research</a></li>
                        <li><a href="/events/">Events</a></li>
                        <li><a href="/association/">Association</a></li>
                        <li><a href="https://github.com/comunica/comunica">GitHub</a></li>
                        <li className="nav-search-item"><SearchBar /></li>
                    </ul>
                </nav>
                <div className="nav-pusher" />
                <main className="search-page">
                    <h1>Search</h1>
                    <hr />
                    <div className="search-page-bar">
                        <SearchBar initialQuery={query} />
                    </div>
                    {loading && <p className="search-status">Searching…</p>}
                    {!loading && query && (
                        <p className="search-status">
                            {results.length === 0
                                ? `No results found for "${query}".`
                                : `${results.length} result${results.length === 1 ? '' : 's'} for "${query}"`}
                        </p>
                    )}
                    <ul className="search-results">
                        {results.map(({ item }) => (
                            <li key={item.path} className="search-result">
                                <a href={item.path} className="search-result-title">{item.title}</a>
                                {item.description && (
                                    <p className="search-result-description">{item.description}</p>
                                )}
                                {item.content && (
                                    <p className="search-result-excerpt">{item.content}</p>
                                )}
                                <span className="search-result-path">{item.path}</span>
                            </li>
                        ))}
                    </ul>
                </main>
                <Foot />
            </div>
        );
    }
}
