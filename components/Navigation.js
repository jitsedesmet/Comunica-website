import React from 'react';

export default class Navigation extends React.Component {
    render() {
        return <nav>
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
                <li className="nav-search-item">
                    <a href="/search/" className="search-nav-link" aria-label="Search documentation">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path fill="currentColor" d="M21.707 20.293l-5.387-5.387A7.954 7.954 0 0016 10a8 8 0 10-8 8 7.954 7.954 0 004.906-1.68l5.387 5.387 1.414-1.414zM10 16a6 6 0 110-12 6 6 0 010 12z"/>
                        </svg>
                        <span>Search</span>
                    </a>
                </li>
            </ul>
        </nav>;
    }

    componentDidMount() {
        // This is not being called for some reason, see _app.js
    }
}
