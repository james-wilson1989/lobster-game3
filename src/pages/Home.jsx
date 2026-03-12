import { Link } from 'react-router-dom'
import { useAccount, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()

  const formatAddress = (addr) => `${addr?.slice(0, 6)}...${addr?.slice(-4)}`

  const features = [
    { title: 'Web3养殖', desc: '连接钱包，养育你的专属龙虾', icon: '🦞' },
    { title: '代币喂养', desc: '使用代币喂养，等级越高分红越多', icon: '💵' },
    { title: '每日分红', desc: '根据龙虾等级获取每日分红收益', icon: '💰' },
    { title: '排行榜', desc: '与全球玩家竞争，展示你的实力', icon: '🏆' }
  ]

  const handleConnect = async (connector) => {
    try {
      await connect({ connector })
    } catch (error) {
      console.error('连接钱包失败:', error)
      alert('连接钱包失败，请确保已安装钱包插件')
    }
  }

  // 获取注入的钱包连接器（MetaMask, OKX等浏览器插件钱包）
  const injectedConnector = connectors.find(c => c.type === 'injected')

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mt-4 mb-2">龙虾大亨</h1>
          <p className="text-xl text-gray-300">Web3 区块链养殖游戏</p>
        </div>

        {isConnected ? (
          <div className="glass-card p-8 max-w-md mx-auto">
            <div className="text-green-400 text-lg mb-4">✓ 已连接钱包</div>
            <div className="text-white mb-2">地址: {formatAddress(address)}</div>
            <Link to="/game" className="glass-button gold-button inline-block mt-4 text-lg">
              进入游戏 →
            </Link>
          </div>
        ) : (
          <div className="glass-card p-8 max-w-md mx-auto">
            <h2 className="text-2xl text-white mb-6">立即开始游戏</h2>
            {injectedConnector ? (
              <button 
                onClick={() => handleConnect(injectedConnector)} 
                className="glass-button gold-button w-full text-lg py-4"
              >
                🦊 连接钱包 (MetaMask/OKX)
              </button>
            ) : (
              <button 
                onClick={() => alert('请安装钱包插件，如 MetaMask 或 OKX Wallet')} 
                className="glass-button gold-button w-full text-lg py-4"
              >
                🦊 安装钱包
              </button>
            )}
            <p className="text-gray-400 text-sm mt-4">支持 MetaMask、OKX Wallet 等浏览器钱包插件</p>
          </div>
        )}
      </div>

      <div className="mt-16 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="glass-card p-6 text-center">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl text-white font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
