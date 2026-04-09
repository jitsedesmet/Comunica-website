import React from 'react';

export default class SearchBar extends React.Component {
    constructor(props) {
        super(props);
        this.state = { query: '' };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(e) {
        this.setState({ query: e.target.value });
    }

    handleSubmit(e) {
        e.preventDefault();
        const q = this.state.query.trim();
        if (q) {
            window.location.href = '/search/?q=' + encodeURIComponent(q);
        }
    }

    render() {
        return (
            <form className="search-bar" onSubmit={this.handleSubmit} role="search">
                <input
                    type="search"
                    className="search-bar-input"
                    placeholder="Search docs…"
                    aria-label="Search documentation"
                    value={this.state.query}
                    onChange={this.handleChange}
                />
                <button type="submit" className="search-bar-button" aria-label="Submit search">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path fill="currentColor" d="M21.707 20.293l-5.387-5.387A7.954 7.954 0 0016 10a8 8 0 10-8 8 7.954 7.954 0 004.906-1.68l5.387 5.387 1.414-1.414zM10 16a6 6 0 110-12 6 6 0 010 12z"/>
                    </svg>
                </button>
            </form>
        );
    }
}
