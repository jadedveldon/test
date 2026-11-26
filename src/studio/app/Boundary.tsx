/**
 * If a Studio page breaks while drawing, the rest of the Studio stays: the page says so plainly, the problem is
 * reported (with the steps before it) to Insights, and it can be tried again. Nothing typed is lost elsewhere.
 */
import { Component, type ReactNode } from 'react';
import { reportError } from '../../scripts/track';

export class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { reportError(err, 'react'); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="st-page">
        <div className="st-card">
          <h2>This page could not be shown</h2>
          <p>Something went wrong while drawing it. It has been noted in Insights → Problems, with what led to it.</p>
          <p className="st-hint">{this.state.err.message}</p>
          <div className="st-row"><button type="button" className="st-btn st-btn-solid" onClick={() => this.setState({ err: null })}>Try again</button> <button type="button" className="st-btn st-btn-ghost" onClick={() => location.reload()}>Reload the Studio</button></div>
        </div>
      </div>
    );
  }
}
