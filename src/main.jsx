import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WagmiConfig } from 'wagmi'
import App from './App'
import './index.css'
import { config, wagmiConfig } from './wagmi'

// 检查是否在浏览器环境
const isBrowser = typeof window !== 'undefined'

// 初始化加载组件
function InitialLoader({ children }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white'
      }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🦞</div>
          <div className="text-xl">加载中...</div>
        </div>
      </div>
    )
  }

  return children
}

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: 'white',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️ 应用加载失败</h1>
          <div style={{
            background: 'rgba(255,0,0,0.2)',
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '600px',
            wordBreak: 'break-all'
          }}>
            <p style={{ color: '#ff6b6b' }}>{this.state.error?.message || '未知错误'}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#E53935',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 全局错误监听
if (isBrowser) {
  window.addEventListener('error', (e) => {
    console.error('Global error:', e.error)
  })

  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason)
  })
}

// 渲染应用
const rootElement = document.getElementById('root')

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <InitialLoader>
          <BrowserRouter>
            <WagmiConfig config={wagmiConfig}>
              <App />
            </WagmiConfig>
          </BrowserRouter>
        </InitialLoader>
      </ErrorBoundary>
    </React.StrictMode>
  )
}
