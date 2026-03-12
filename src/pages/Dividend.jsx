import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { fetchConfig } from '../config'
import { VAULT_ABI } from '../abi/vault'

export default function Dividend() {
  const { address, isConnected } = useAccount()
  const { writeContract, data: hash } = useWriteContract()
  const { isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })
  
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState('')
  const [player, setPlayer] = useState(null)
  const [rank, setRank] = useState(null)
  const [dividends, setDividends] = useState([])
  const [gameConfig, setGameConfig] = useState(null)
  const [vaultPool, setVaultPool] = useState('0')
  const [pendingDividend, setPendingDividend] = useState('0')

  // 获取API地址
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3001'
  
  // 获取Vault合约地址
  const vaultAddress = gameConfig?.vaultAddress || '0x0000000000000000000000000000000000000000'

  // 加载数据函数 - 必须在 useEffect 之前定义
  const loadData = async () => {
    try {
      // 获取配置
      const cfg = await fetchConfig(apiBase)
      setGameConfig(cfg)

      // 获取玩家数据
      if (address) {
        try {
          const playerRes = await fetch(`${apiBase}/api/player/${address}`)
          const playerData = await playerRes.json()
          if (playerData.success) {
            setPlayer(playerData.data)
          }
        } catch (e) {
          console.error('获取玩家数据失败:', e)
        }

        // 获取排名
        try {
          const leaderboardRes = await fetch(`${apiBase}/api/leaderboard`)
          const leaderboardData = await leaderboardRes.json()
          if (leaderboardData.success) {
            const players = leaderboardData.data || []
            const playerRank = players.findIndex(p => p.address.toLowerCase() === address.toLowerCase())
            if (playerRank !== -1) {
              setRank(playerRank + 1)
            } else {
              setRank(null)
            }
          }
        } catch (e) {
          console.error('获取排行榜失败:', e)
          setRank(null)
        }
      }

      // 获取分红记录
      try {
        const divRes = await fetch(`${apiBase}/api/all-transactions?type=dividend`)
        const divData = await divRes.json()
        if (divData.success) {
          setDividends(divData.data || [])
        }
      } catch (e) {
        console.error('获取分红记录失败:', e)
        setDividends([])
      }
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [address])

  // 查询合约上的分红信息
  const checkVaultDividend = async () => {
    if (!address || !vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') return
    
    try {
      // 查询可领取分红
      const pending = await window.ethereum?.request({
        method: 'eth_call',
        params: [{
          to: vaultAddress,
          data: '0x9e5d4c4f' + address.slice(2).padStart(64, '0') // getPendingDividend(address)
        }, 'latest']
      })
      
      if (pending && pending !== '0x') {
        const pendingNum = parseInt(pending, 16) / 1e18
        setPendingDividend(pendingNum.toString())
      }
      
      // 查询池子余额
      const poolData = await window.ethereum?.request({
        method: 'eth_call',
        params: [{
          to: vaultAddress,
          data: '0x3d1d9a01' // dividendPool()
        }, 'latest']
      })
      
      if (poolData && poolData !== '0x') {
        const poolNum = parseInt(poolData, 16) / 1e18
        setVaultPool(poolNum.toString())
      }
    } catch (e) {
      console.error('查询Vault失败:', e)
    }
  }

  useEffect(() => {
    if (isConnected && address) {
      checkVaultDividend()
    }
  }, [isConnected, address])

  const handleClaim = async () => {
    if (!address) return
    
    setClaiming(true)
    setMessage('')

    try {
      writeContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'claimDividend',
        args: []
      })
    } catch (err) {
      console.error('领取失败:', err)
      setMessage('领取失败: ' + err.message)
      setClaiming(false)
    }
  }

  // 监听交易确认
  useEffect(() => {
    if (isConfirmed) {
      setMessage('领取成功！')
      setClaiming(false)
      checkVaultDividend()
    }
  }, [isConfirmed])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-white py-12">加载中...</div>
      </div>
    )
  }

  const canClaim = player && rank && rank <= (gameConfig?.topN || 5)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center text-white mb-8">每日分红</h1>

      {/* Vault池子信息 */}
      {vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000' && (
        <div className="glass-card p-6 max-w-md mx-auto mb-6 text-center">
          <p className="text-gray-400 text-sm">分红池总量</p>
          <p className="text-3xl font-bold text-yellow-400">{vaultPool} BNB</p>
        </div>
      )}

      {!isConnected ? (
        <div className="glass-card p-8 max-w-md mx-auto text-center">
          <p className="text-gray-300 mb-4">请先连接钱包查看分红</p>
        </div>
      ) : (
        <>
          {/* 我的分红状态 */}
          <div className="glass-card p-8 max-w-md mx-auto mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">我的分红</h2>
            
            {rank !== null ? (
              <div className="space-y-4">
                <div className="flex justify-between text-gray-300">
                  <span>当前排名:</span>
                  <span className={rank <= (gameConfig?.topN || 5) ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
                    第 {rank} 名 {rank <= (gameConfig?.topN || 5) && '🏆'}
                  </span>
                </div>
                
                {pendingDividend !== '0' && (
                  <div className="flex justify-between text-gray-300">
                    <span>智能合约可领取:</span>
                    <span className="text-green-400 font-bold text-xl">
                      {pendingDividend} BNB
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-gray-300">
                  <span>累计已领取:</span>
                  <span className="text-green-400">
                    {player?.totalEarned || 0} 代币
                  </span>
                </div>

                {canClaim && pendingDividend !== '0' ? (
                  <button
                    onClick={handleClaim}
                    disabled={claiming || isConfirming}
                    className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg transition-colors mt-4"
                  >
                    {claiming || isConfirming ? '交易确认中...' : '💰 领取分红 (BNB)'}
                  </button>
                ) : canClaim ? (
                  <p className="text-gray-400 text-sm mt-4">
                    当前无可领取分红
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm mt-4">
                    只有前 {gameConfig?.topN || 5} 名才能领取分红，继续加油！
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
              <li>• 分红来源：Flap平台税收自动转入</li>
              <li>• 领取方式：连接钱包点击领取BNB</li>
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
