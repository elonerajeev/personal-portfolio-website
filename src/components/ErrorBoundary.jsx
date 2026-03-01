import React from 'react'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:'#111',color:'#fff',padding:'20px',textAlign:'center'}}>
                    <h1 style={{fontSize:'3rem',marginBottom:'20px'}}>⚠️ Oops!</h1>
                    <p style={{fontSize:'1.2rem',marginBottom:'30px'}}>Something went wrong</p>
                    <button onClick={()=>window.location.reload()} style={{padding:'12px 24px',fontSize:'1rem',background:'#36ec65',color:'#111',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'bold'}}>Refresh</button>
                </div>
            )
        }
        return this.props.children
    }
}

export default ErrorBoundary
