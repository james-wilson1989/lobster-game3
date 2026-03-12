import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { config, fetchConfig } from '../config'
import { ERC20_ABI } from '../abi/token'

// 默认 API 地址
const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

export default function Game() {
  const { address, isConnected } = useAccount()
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
  
  const [player, setPlayer] = useState(null)
  const [feedAmount, setFeedAmount] = useState(100)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [gameConfig, setGameConfig] = useState(config)
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE)
  const [showNameModal, setShowNameModal] = useState(false)
  const [playerName, setPlayerName] = useState('')

  // 页面加载时从后端获取配置
  useEffect(() => {
    const loadConfig = async () => {
      const cfg = await fetchConfig(DEFAULT_API_BASE)
      setGameConfig(cfg)
      setApiBase(cfg.apiBase || DEFAULT_API_BASE)
    }
    loadConfig()
  }, [])

  // 页面加载时获取玩家数据
  useEffect(() => {
    if (address) {
      fetchPlayerData()
    }
  }, [address])

  const fetchPlayerData = async () => {
    try {
      const res = await fetch(`${apiBase}/api/player/${address}`)
      const data = await res.json()
      if (data.success) {
        setPlayer(data.data)
      } else {
        // 玩家不存在，显示创建名字弹窗
        setShowNameModal(true)
      }
    } catch (err) {
      console.error('获取玩家数据失败:', err)
    }
  }

  const handleCreatePlayer = async () => {
    if (!playerName.trim()) {
      setMessage('请输入名字')
      return
    }
    try {
      const res = await fetch(`${apiBase}/api/player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          lobsterName: playerName.trim()
        })
      })
      const data = await res.json()
      if (data.success) {
        setPlayer(data.data)
        setShowNameModal(false)
        setMessage('')
      } else {
        setMessage(data.message || '创建失败')
      }
    } catch (err) {
      setMessage('创建失败: ' + err.message)
    }
  }

  const handleFeed = async () => {
    if (!isConnected) {
      setMessage('请先连接钱包')
      return
    }
    setLoading(true)
    setMessage('')

    try {
      // 从后端配置获取代币地址和创始人钱包
      const tokenAddress = gameConfig.tokenAddress
      const founderWallet = gameConfig.founderWallet
      const decimals = gameConfig.tokenDecimals || 18
      
      // 计算代币数量 (考虑小数位)
      const amountWei = BigInt(feedAmount) * BigInt(10 ** decimals)

      writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [founderWallet, amountWei]
      })

      setMessage('正在转账代币到创始人钱包，请确认交易...')
    } catch (err) {
      setMessage('转账失败: ' + err.message)
      setLoading(false)
    }
  }

  // 监听交易确认
  useEffect(() => {
    if (isConfirmed && hash) {
      // 交易确认后，调用后端记录
      submitFeedTx(hash)
    }
  }, [isConfirmed, hash])

  // 提交交易哈希到后端
  const submitFeedTx = async (txHash) => {
    try {
      const res = await fetch(`${apiBase}/api/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          tokenAmount: feedAmount,
          txHash: txHash,
          tokenAddress: gameConfig.tokenAddress
        })
      })
      const data = await res.json()
      setMessage(data.message || data.error)
      if (data.success) {
        fetchPlayerData()
      }
    } catch (err) {
      setMessage('记录失败: ' + err.message)
    }
    setLoading(false)
  }

  const formatAddress = (addr) => `${addr?.slice(0, 6)}...${addr?.slice(-4)}`

  // 创建名字弹窗
  if (showNameModal) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🐉</div>
          <h2 className="text-2xl text-white mb-4">欢迎新玩家!</h2>
          <p className="text-gray-400 mb-6">请为你的龙虾起个名字吧</p>
          <input
            type="text"
            maxLength={12}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="输入名字（最多12字）"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white mb-4"
          />
          {message && <p className="text-red-400 text-sm mb-4">{message}</p>}
          <button
            onClick={handleCreatePlayer}
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg"
          >
            开始游戏
          </button>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl text-white mb-4">请先连接钱包</h2>
          <p className="text-gray-400">连接 MetaMask 钱包后才能开始游戏</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 龙虾展示 */}
        <div className="glass-card p-8 text-center">
          <div className="text-8xl mb-6">🦞</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {player?.lobsterName || '小青龙'}
          </h2>
          <p className="text-gray-400 text-sm mb-4">等级 {player?.level || 1}</p>
          <div className="space-y-3 text-gray-300">
            <p>经验值: {player?.experience || 0} / {player?.experienceToNextLevel || 100}</p>
            <p>今日喂养次数: {player?.todayFeedCount || 0} / {gameConfig.dailyLimit}</p>
            <p>累计经验: {player?.totalExperience || 0}</p>
          </div>
        </div>

        {/* 喂养控制 */}
        <div className="glass-card p-8">
          <h3 className="text-2xl font-bold text-white mb-6">喂养龙虾</h3>
          
          <div className="mb-6">
            <label className="text-gray-300 block mb-2">选择喂养数量</label>
            
            {/* 预设选项按钮 */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[100, 500, 1000, 5000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setFeedAmount(amount)}
                  className={`py-3 px-2 rounded-lg font-bold transition-all ${
                    feedAmount === amount
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
            
            {/* 也允许手动输入 */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">自定义:</span>
              <input
                type="number"
                min={gameConfig.minFeed}
                max={gameConfig.maxFeed}
                value={feedAmount}
                onChange={(e) => setFeedAmount(Number(e.target.value))}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <p className="text-gray-400 text-sm mt-1">
              范围: {gameConfig.minFeed} - {gameConfig.maxFeed}
            </p>
          </div>

          <button
            onClick={handleFeed}
            disabled={loading || isPending || isConfirming || !address}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || isPending || isConfirming ? '处理中...' : `🦞 喂养 (${feedAmount} ${gameConfig.tokenSymbol})`}
          </button>

          {message && (
            <div className={`mt-4 p-3 rounded-lg ${message.includes('失败') || message.includes('错误') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
              {message}
            </div>
          )}

          <div className="mt-6 text-gray-400 text-sm">
            <p>💡 喂养增加经验值，等级越高每日分红越多</p>
            <p>📊 前 {gameConfig.topN} 名玩家可获得分红</p>
          </div>
        </div>
      </div>

      {/* 玩家信息 */}
      <div className="glass-card p-6 mt-8">
        <h3 className="text-xl font-bold text-white mb-4">玩家信息</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-300">
          <div>
            <p className="text-gray-500 text-sm">钱包地址</p>
            <p className="text-white">{formatAddress(address)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">总收益</p>
            <p className="text-green-400">{player?.totalEarned || 0} LOB</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">今日收益</p>
            <p className="text-green-400">{player?.dailyDividend || 0} LOB</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">排名</p>
            <p className="text-yellow-400">#{player?.rank || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
