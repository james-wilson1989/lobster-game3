import { Link, useLocation } from 'react-router-dom'
import { useAccount, useDisconnect, useConnect } from 'wagmi'

export default function Navbar() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connectors, connect } = useConnect()
  const location = useLocation()

  const formatAddress = (addr) => `${addr?.slice(0, 6)}...${addr?.slice(-4)}`

  const isActive = (path) => location.pathname === path

  const handleConnect = () => {
    const injectedConnector = connectors.find(c => c.type === 'injected')
    if (injectedConnector) {
      connect({ connector: injectedConnector })
    }
  }

  return (
    <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-3xl">🦞</span>
            <span className="text-xl font-bold text-white">龙虾大亨</span>
          </Link>

          {/* 导航链接 */}
          <div className="flex items-center space-x-6">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors ${
                isActive('/') ? 'text-yellow-400' : 'text-gray-300 hover:text-white'
              }`}
            >
              首页
            </Link>
            <Link 
              to="/game" 
              className={`text-sm font-medium transition-colors ${
                isActive('/game') ? 'text-yellow-400' : 'text-gray-300 hover:text-white'
              }`}
            >
              游戏
            </Link>
            <Link 
              to="/leaderboard" 
              className={`text-sm font-medium transition-colors ${
                isActive('/leaderboard') ? 'text-yellow-400' : 'text-gray-300 hover:text-white'
              }`}
            >
              排行榜
            </Link>
            <Link 
              to="/dividend" 
              className={`text-sm font-medium transition-colors ${
                isActive('/dividend') ? 'text-yellow-400' : 'text-gray-300 hover:text-white'
              }`}
            >
              分红
            </Link>
          </div>

          {/* 钱包连接 */}
          <div>
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-300 font-mono">
                  {formatAddress(address)}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  断开
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 text-sm bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
              >
                连接钱包
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
