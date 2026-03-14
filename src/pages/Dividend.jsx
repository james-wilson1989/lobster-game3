import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { config, fetchConfig } from '../config'
import { VAULT_ABI } from '../abi/vault'

// 带超时的fetch
const fetchWithTimeout = (url, timeout = 5000) => {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), timeout))
  ])
}

export default function Dividend() {
  const { address, isConnected } = useAccount()
  const { writeContract, data: hash } = useWriteContract()
  const { isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })
  
  const [loading, setLoading] = useState(false)  // 默认false，先显示页面
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState('')
  const [player, setPlayer] = useState(null)
  const [rank, setRank] = useState(null)
  const [dividends, setDividends] = useState([])
  const [gameConfig, setGameConfig] = useState(config)  // 用默认配置先显示
  const [vaultPool, setVaultPool] = useState('0')
  const [pendingDividend, setPendingDividend] = useState('0')
  const [dataLoaded, setDataLoaded] = useState(false)

  // 获取API地址
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3001'
  
  // 获取Vault合约地址
  const vaultAddress = gameConfig?.vaultAddress || '0x0000000000000000000000000000000000000000'

  // 后台加载数据
  useEffect(() => {
    let cancelled = false
    
    const loadData = async () => {
      setLoading(true)
      try {
        // 并行请求，带超时
        const [cfg, divRes] = await Promise.all([
          fetchWithTimeout(`${apiBase}/api/config`, 5000).then(r => r.json()).catch(() => ({ success: false })),
          fetchWithTimeout(`${apiBase}/api/all-transactions?type=dividend`, 5000).then(r => r.json()).catch(() => ({ success: false, data: [] }))
        ])
        
        if (cancelled) return
        
        if (cfg.success) {
          setGameConfig(prev => ({ ...prev, ...cfg.data }))
        }
        
        if (divRes.success) {
          setDividends(divRes.data || [])
        }

        // 加载玩家数据
        if (address) {
          try {
            const [playerRes, leaderboardRes] = await Promise.all([
              fetchWithTimeout(`${apiBase}/api/player/${address}`, 5000).then(r => r.json()).catch(() => ({ success: false })),
              fetchWithTimeout(`${apiBase}/api/leaderboard`, 5000).then(r => r.json()).catch(() => ({ success: false, data: [] }))
            ])
            
            if (playerRes.success) setPlayer(playerRes.data)
            if (leaderboardRes.success) {
              const players = leaderboardRes.data || []
              const idx = players.findIndex(p => p.address.toLowerCase() === address.toLowerCase())
              if (idx !== -1) setRank(idx + 1)
            }
          } catch (e) {
            console.error('加载玩家数据失败:', e)
          }
        }
      } catch (err) {
        console.error('加载数据失败:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setDataLoaded(true)
        }
      }
    }
    
    loadData()
    
    return () => { cancelled = true }
  }, [address, apiBase])

  // 使用 wagmi 读取合约数据
  const { data: pendingData, refetch: refetchPending } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getPendingDividend',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  const { data: poolData, refetch: refetchPool } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'dividendPool',
    query: {
      enabled: !!vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  // 更新状态
  useEffect(() => {
    if (pendingData) {
      setPendingDividend((Number(pendingData) / 1e18).toString())
    }
  }, [pendingData])

  useEffect(() => {
    if (poolData) {
      setVaultPool((Number(poolData) / 1e18).toString())
    }
  }, [poolData])

  // 领取后刷新数据
  const refreshDividendData = () => {
    refetchPending()
    refetchPool()
  }

  useEffect(() => {
    if (isConnected && address) {
      refetchPending()
      refetchPool()
    }
  }, [isConnected, address, vaultAddress])

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

  useEffect(() => {
    if (isConfirmed) {
      setMessage('领取成功！')
      setClaiming(false)
      refreshDividendData()
    }
  }, [isConfirmed])

  const canClaim = player && rank && rank <= (gameConfig?.topN || 5)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center text-white mb-8">每日分红</h1>

      {/* 加载指示器 */}
      {loading && (
        <div className="text-center text-gray-400 mb-4">正在加载数据...</div>
      )}

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
                    第{rank}名 {rank <= (gameConfig?.topN || 5) && '🏆'}
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
                    只有前{gameConfig?.topN || 5}名才能领取分红，继续加油！
                  </p>
                )}

                {message && (
                  <p className={`text-center mt-4 ${message.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
                    {message}
                  </p>
                )}
              </div>
            ) : dataLoaded ? (
              <p className="text-gray-400">暂无排名数据</p>
            ) : (
              <p className="text-gray-400">加载中...</p>
            )}
          </div>

          {/* 分红规则 */}
          <div className="glass-card p-8 max-w-md mx-auto mb-8">
            <h3 className="text-xl font-bold text-white mb-4">分红规则</h3>
            <ul className="text-gray-300 space-y-2">
              <li>• 每日 00:00 结算前一天的排行榜</li>
              <li>• 前{gameConfig?.topN || 5}名玩家可获得分红</li>
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
            ) : dataLoaded ? (
              <p className="text-gray-400">暂无分红记录</p>
            ) : (
              <p className="text-gray-400">加载中...</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
