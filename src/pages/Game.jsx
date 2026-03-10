import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { config } from '../wagmi'
import { ERC20_ABI, FOUNDER_WALLET, TOKEN_ADDRESS } from '../abi/token'

const API_BASE = config.apiBase

export default function Game() {
  const { address, isConnected } = useAccount()
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
  const [player, setPlayer] = useState(null)
  const [feedAmount, setFeedAmount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (address) {
      fetchPlayerData()
    }
  }, [address])

  const fetchPlayerData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/players/${address}`)
      const data = await res.json()
      if (data.success) {
        setPlayer(data.data)
      }
    } catch (err) {
      console.error('获取玩家数据失败:', err)
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
      // 第一步：调用合约把代币转到创始人钱包
      const amountWei = BigInt(feedAmount) * BigInt(10 ** 18) // 假设 18 位小数

      writeContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [FOUNDER_WALLET, amountWei]
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
      const res = await fetch(`${API_BASE}/api/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          amount: feedAmount,
          txHash: txHash,
          tokenAddress: TOKEN_ADDRESS
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
          <h2 className="text-3xl font-bold text-white mb-4">
            等级 {player?.level || 1}
          </h2>
          <div className="space-y-3 text-gray-300">
            <p>经验值: {player?.exp || 0} / {(player?.level || 1) * 100}</p>
            <p>今日喂养次数: {player?.todayFeeds || 0} / {config.dailyLimit}</p>
            <p>累计喂养: {player?.totalFeeds || 0} 次</p>
          </div>
        </div>

        {/* 喂养控制 */}
        <div className="glass-card p-8">
          <h3 className="text-2xl font-bold text-white mb-6">喂养龙虾</h3>
          
          <div className="mb-6">
            <label className="text-gray-300 block mb-2">喂养数量</label>
            <input
              type="number"
              min={config.minFeed}
              max={config.maxFeed}
              value={feedAmount}
              onChange={(e) => setFeedAmount(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-gray-400 text-sm mt-1">
              范围: {config.minFeed} - {config.maxFeed}
            </p>
          </div>

          <button
            onClick={handleFeed}
            disabled={loading || isPending || isConfirming || !address}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || isPending || isConfirming ? '处理中...' : `🦞 喂养 (${feedAmount} TEST)`}
          </button>

          {message && (
            <div className={`mt-4 p-3 rounded-lg ${message.includes('失败') || message.includes('错误') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
              {message}
            </div>
          )}

          <div className="mt-6 text-gray-400 text-sm">
            <p>💡 喂养增加经验值，等级越高每日分红越多</p>
            <p>📊 前 {config.topN} 名玩家可获得分红</p>
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
            <p className="text-green-400">{player?.totalDividends || 0} LOB</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">今日收益</p>
            <p className="text-green-400">{player?.todayDividends || 0} LOB</p>
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
