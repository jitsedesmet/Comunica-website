import React from 'react';
import Head from '../components/Head';
import Navigation from '../components/Navigation';
import Foot from '../components/Foot';

export default class SearchPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = { loadError: false };
    }

    componentDidMount() {
        // Pagefind UI bundle is generated at build time and served from /pagefind/.
        // Load it dynamically so SSR is unaffected.
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/pagefind/pagefind-ui.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = '/pagefind/pagefind-ui.js';
        script.onload = () => {
            new window.PagefindUI({
                element: '#search',
                showImages: false,
            });
        };
        script.onerror = () => {
            this.setState({ loadError: true });
        };
        document.head.appendChild(script);
    }

    render() {
        const { loadError } = this.state;
        return (
            <div className="container-page">
                <Head
                    title="Search"
                    description="Search the Comunica documentation"
                />
                <Navigation />
                <div className="nav-pusher" />
                <main className="search-page">
                    <h1>Search</h1>
                    <hr />
                    {loadError
                        ? <p className="search-load-error">Search is unavailable. Please try again after a full site build.</p>
                        : <div id="search" />
                    }
                </main>
                <Foot />
            </div>
        );
    }
}
