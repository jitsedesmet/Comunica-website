import React from 'react';
import Head from '../components/Head';
import Navigation from '../components/Navigation';
import Foot from '../components/Foot';

export default class SearchPage extends React.Component {
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
        document.head.appendChild(script);
    }

    render() {
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
                    <div id="search" />
                </main>
                <Foot />
            </div>
        );
    }
}
