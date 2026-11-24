"use client";
import React from "react";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 16, margin: 16, border: "1px solid #f59e0b", borderRadius: 8, background: "#1f2937", color: "#fff" }}>
          <div>Something went wrong. The page hit an error, but the app is still running.</div>
          <button onClick={() => this.setState({ hasError: false })} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 6, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
