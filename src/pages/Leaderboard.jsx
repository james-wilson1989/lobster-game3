import { useState, useEffect } from 'react'
import { config } from '../wagmi'

const API_BASE = config.apiBase

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`)
      const data = await res.json()
      if (data.success) {
        setPlayers(data.data || [])
      }
    } catch (err) {
      console.error('获取排行榜失败:', err)
    }
    setLoading(false)
  }

  const formatAddress = (addr) => `${addr?.slice(0, 6)}...${addr?.slice(-4)}`

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">🏆 排行榜</h1>
        <p className="text-gray-400">前 {config.topN} 名玩家可获得每日分红</p>
      </div>

      {loading ? (
        <div className="text-center text-white py-12">加载中...</div>
      ) : players.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-6xl mb-4">👥</div>
          <p>暂无玩家数据</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-400 font-bold">排名</th>
                <th className="px-6 py-4 text-left text-gray-400 font-bold">玩家</th>
                <th className="px-6 py-4 text-right text-gray-400 font-bold">等级</th>
                <th className="px-6 py-4 text-right text-gray-400 font-bold">经验值</th>
                <th className="px-6 py-4 text-right text-gray-400 font-bold">累计喂养</th>
                <th className="px-6 py-4 text-right text-gray-400 font-bold">总收益</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <tr 
                  key={player.address} 
                  className={`border-t border-gray-700 ${index < config.topN ? 'bg-yellow-500/10' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                      {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                      {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                      {index > 2 && <span className="text-gray-400 font-bold">#{index + 1}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white font-mono">
                    {formatAddress(player.address)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                      index < config.topN 
                        ? 'bg-yellow-500/20 text-yellow-400' 
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      Lv.{player.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-300">
                    {player.exp}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-300">
                    {player.totalFeeds}
                  </td>
                  <td className="px-6 py-4 text-right text-green-400 font-bold">
                    {player.totalDividends} LOB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-4">分红规则</h3>
        <div className="text-gray-300 space-y-2">
          <p>🎯 每天 00:00 (UTC+8) 结算分红</p>
          <p>📊 前 {config.topN} 名玩家可获得分红</p>
          <p>💰 分红比例: 前5名获得 {config.dividendPercent}% 的池子</p>
          <p>📈 等级越高，排名越靠前，分红越多</p>
        </div>
      </div>
    </div>
  )
}
