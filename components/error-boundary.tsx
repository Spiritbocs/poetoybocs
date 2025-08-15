"use client"
import React from 'react'

interface ErrorBoundaryState { hasError: boolean; message?: string }
export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }
  static getDerivedStateFromError(err: any): ErrorBoundaryState { return { hasError: true, message: err?.message || 'Something went wrong' } }
  componentDidCatch(error: any, info: any) { console.warn('ErrorBoundary caught', error, info) }
  render() {
    if (this.state.hasError) {
      return <div style={{padding:32}}><h3 style={{marginTop:0}}>⚠️ Client Error</h3><div style={{fontSize:13,opacity:.7,marginBottom:12}}>{this.state.message}</div><button onClick={()=>{ this.setState({hasError:false}); location.reload() }} style={{background:'#222',border:'1px solid #444',padding:'8px 16px',color:'#ccc',borderRadius:6,cursor:'pointer',fontSize:12}}>Reload Page</button></div>
    }
    return this.props.children
  }
}
