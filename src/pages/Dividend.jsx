import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { fetchConfig } from '../config'

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

export default function Dividend() {
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState('')
  const [player, setPlayer] = useState(null)
  const [rank, setRank] = useState(null)
  const [dividends, setDividends] = useState([])
  const [gameConfig, setGameConfig] = useState(null)

  useEffect(() => {
    loadData()
  }, [address])

  const loadData = async () => {
    try {
      // 获取配置
      const cfg = await fetchConfig(DEFAULT_API_BASE)
      setGameConfig(cfg)

      // 获取玩家数据
      if (address) {
        const playerRes = await fetch(`${DEFAULT_API_BASE}/api/player/${address}`)
        const playerData = await playerRes.json()
        if (playerData.success) {
          setPlayer(playerData.data)
        }

        // 获取排名
        const leaderboardRes = await fetch(`${DEFAULT_API_BASE}/api/leaderboard`)
        const leaderboardData = await leaderboardRes.json()
        if (leaderboardData.success) {
          const players = leaderboardData.data || []
          const playerRank = players.findIndex(p => p.address.toLowerCase() === address.toLowerCase())
          if (playerRank !== -1) {
            setRank(playerRank + 1)
          }
        }
      }

      // 获取分红记录
      const divRes = await fetch(`${DEFAULT_API_BASE}/api/all-transactions?type=dividend`)
      const divData = await divRes.json()
      if (divData.success) {
        setDividends(divData.data || [])
      }
    } catch (err) {
      console.error('加载数据失败:', err)
    }
    setLoading(false)
  }

  const handleClaim = async () => {
    if (!address || !player || player.dailyDividend <= 0) return

    setClaiming(true)
    setMessage('')

    try {
      // 这里需要用户手动转账分红金额到玩家钱包
      // 后端只是记录领取，实际转账需要单独处理
      // 这里简化处理：直接调用API标记已领取
      
      const res = await fetch(`${DEFAULT_API_BASE}/api/claim-dividend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address,
          txHash: 'manual-' + Date.now() // 手动确认
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        setMessage(`领取成功！已获得 ${data.data.claimedAmount} 代币`)
        setPlayer(data.data.player)
      } else {
        setMessage(data.message || '领取失败')
      }
    } catch (err) {
      setMessage('领取失败，请重试')
    }
    
    setClaiming(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-white py-12">加载中...</div>
      </div>
    )
  }

  const canClaim = player && player.dailyDividend > 0 && rank && rank <= (gameConfig?.topN || 5)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center text-white mb-8">每日分红</h1>

      {!isConnected ? (
        <div className="glass-card p-8 max-w-md mx-auto text-center">
          <p className="text-gray-300 mb-4">请先连接钱包查看分红</p>
        </div>
      ) : (
        <>
          {/* 我的分红状态 */}
          <div className="glass-card p-8 max-w-md mx-auto mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">我的分红</h2>
            
            {rank ? (
              <div className="space-y-4">
                <div className="flex justify-between text-gray-300">
                  <span>当前排名:</span>
                  <span className={rank <= (gameConfig?.topN || 5) ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
                    第 {rank} 名 {rank <= (gameConfig?.topN || 5) && '🏆'}
                  </span>
                </div>
                
                <div className="flex justify-between text-gray-300">
                  <span>今日可领取:</span>
                  <span className="text-yellow-400 font-bold text-xl">
                    {player?.dailyDividend || 0} 代币
                  </span>
                </div>
                
                <div className="flex justify-between text-gray-300">
                  <span>累计已领取:</span>
                  <span className="text-green-400">
                    {player?.totalEarned || 0} 代币
                  </span>
                </div>

                {canClaim ? (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg transition-colors mt-4"
                  >
                    {claiming ? '领取中...' : '💰 领取分红'}
                  </button>
                ) : rank > (gameConfig?.topN || 5) ? (
                  <p className="text-gray-400 text-sm mt-4">
                    只有前 {gameConfig?.topN || 5} 名才能领取分红，继续加油！
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm mt-4">
                    今日分红已领取
                  </p>
                )}

                {message && (
                  <p className={`text-center mt-4 ${message.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
                    {message}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400">暂无排名数据</p>
            )}
          </div>

          {/* 分红规则 */}
          <div className="glass-card p-8 max-w-md mx-auto mb-8">
            <h3 className="text-xl font-bold text-white mb-4">分红规则</h3>
            <ul className="text-gray-300 space-y-2">
              <li>• 每日 00:00 结算前一天的排行榜</li>
              <li>• 前 {gameConfig?.topN || 5} 名玩家可获得分红</li>
              <li>• 分红金额 = 等级² × {gameConfig?.dividendPercent || 10}</li>
              <li>• 创始人钱包: {gameConfig?.founderWallet?.slice(0, 6)}...{gameConfig?.founderWallet?.slice(-4)}</li>
            </ul>
          </div>

          {/* 最近分红记录 */}
          <div className="glass-card p-8 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white mb-4">最近分红记录</h3>
            {dividends.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {dividends.slice(0, 10).map((div, i) => (
                  <div key={i} className="flex justify-between text-gray-300 text-sm border-b border-gray-700 pb-2">
                    <span>{div.playerId?.slice(0, 6)}...{div.playerId?.slice(-4)}</span>
                    <span className="text-green-400">+{div.amount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">暂无分红记录</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
