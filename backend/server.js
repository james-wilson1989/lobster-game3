import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// ES Module 下正确获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

console.log('🚀 Server starting...')
console.log('📁 __dirname:', __dirname)
console.log('📂 Current working directory:', process.cwd())

// 项目根目录 - backend 的父目录
const PROJECT_ROOT = path.join(__dirname, '..')
const CONFIG_FILE = path.join(__dirname, 'config.json')
const DIST_DIR = path.join(PROJECT_ROOT, 'dist')

console.log('📁 PROJECT_ROOT:', PROJECT_ROOT)
console.log('📁 CONFIG_FILE:', CONFIG_FILE)
console.log('📁 DIST_DIR:', DIST_DIR)

let gameConfig = {
  tokenAddress: '',
  tokenDecimals: 18,
  tokenSymbol: 'TEST',
  feedCost: 1,
  dividendRate: 10,
  baseExpRequired: 100,
  expMultiplier: 1.5,
  gameContractAddress: '',
  vaultAddress: '',
  chainId: 97,
  rpcUrl: 'https://bsc-testnet.publicnode.com',
  minFeedAmount: 1,
  maxFeedAmount: 100,
  dailyFeedLimit: 10
}

const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
      gameConfig = { ...gameConfig, ...configData }
      console.log('✅ 游戏配置加载成功:', gameConfig)
    } else {
      console.warn('⚠️ 配置文件不存在，使用默认配置')
    }
  } catch (e) {
    console.error('❌ 加载配置文件失败:', e)
  }
}

loadConfig()

// 导出配置供其他模块使用
export { gameConfig }

// JSON 文件存储路径
const DATA_FILE = path.join(__dirname, 'players.json')

// 读取数据
const readData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('读取数据失败:', e)
  }
  return { players: {}, transactions: [] }
}

// 保存数据
const saveData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('保存数据失败:', e)
  }
}

// 初始化数据
let db = readData()

// 中间件
app.use(cors())
app.use(express.json())

// 静态文件服务 - 前端构建产物
console.log('📁 DIST_DIR exists:', fs.existsSync(DIST_DIR))
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
}

// API 路由 - 放静态文件服务之前
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: gameConfig
  })
})

app.post('/api/config/reload', (req, res) => {
  try {
    loadConfig()
    res.json({ success: true, message: '配置已重新加载' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取玩家信息
app.get('/api/player/:address', (req, res) => {
  try {
    const { address } = req.params
    const addr = address.toLowerCase()
    
    if (!db.players[addr]) {
      return res.json({ success: false, message: '玩家不存在' })
    }
    
    res.json({ success: true, data: formatPlayer(db.players[addr], addr) })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 创建/更新玩家
app.post('/api/player', (req, res) => {
  try {
    const { address, lobsterName } = req.body
    
    if (!address) {
      return res.status(400).json({ success: false, message: '缺少钱包地址' })
    }
    
    const addr = address.toLowerCase()
    const isNew = !db.players[addr]
    
    if (isNew) {
      db.players[addr] = {
        address: addr,
        lobsterName: lobsterName || '小青龙',
        level: 1,
        experience: 0,
        experienceToNextLevel: 100,
        totalExperience: 0,
        dailyDividend: 0,
        totalEarned: 0,
        lastFeedTime: 0,
        todayFeedCount: 0,
        lastFeedDate: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    } else {
      db.players[addr].lobsterName = lobsterName || db.players[addr].lobsterName
      db.players[addr].updatedAt = Date.now()
    }
    
    saveData(db)
    res.json({ success: true, data: formatPlayer(db.players[addr], addr), isNew })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 喂养龙虾
app.post('/api/feed', (req, res) => {
  try {
    const { address, tokenAmount, txHash, tokenAddress } = req.body
    
    if (!address || !tokenAmount) {
      return res.status(400).json({ success: false, message: '参数不完整' })
    }
    
    const addr = address.toLowerCase()
    
    // 验证喂养金额范围
    const minAmount = gameConfig.minFeedAmount || 1
    const maxAmount = gameConfig.maxFeedAmount || 100
    if (tokenAmount < minAmount || tokenAmount > maxAmount) {
      return res.json({ success: false, message: `每次喂养金额需在 ${minAmount}-${maxAmount} 之间` })
    }
    
    // 如果玩家不存在，自动创建
    if (!db.players[addr]) {
      db.players[addr] = {
        address: addr,
        lobsterName: '小青龙',
        level: 1,
        experience: 0,
        experienceToNextLevel: 100,
        totalExperience: 0,
        dailyDividend: 0,
        totalEarned: 0,
        lastFeedTime: 0,
        todayFeedCount: 0,
        lastFeedDate: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }
    
    const player = db.players[addr]
    
    // 检查并重置每日喂养次数
    checkDailyFeedReset(player)
    
    // 验证每日喂养次数限制
    const dailyLimit = gameConfig.dailyFeedLimit || 10
    if (player.todayFeedCount >= dailyLimit) {
      return res.json({ success: false, message: `今日喂养次数已用完（${dailyLimit}次/天），明天再来吧！` })
    }
    
    // 增加今日喂养次数
    player.todayFeedCount++
    
    // 计算获得经验
    const expGain = tokenAmount * 10
    let newExp = player.experience + expGain
    let newLevel = player.level
    let newExpToNext = player.experienceToNextLevel
    
    // 升级逻辑
    while (newExp >= newExpToNext) {
      newExp -= newExpToNext
      newLevel += 1
      newExpToNext = Math.floor(newExpToNext * 1.5)
    }
    
    // 计算每日分红 (等级^2 * 10)
    const dailyDividend = Math.floor(newLevel * newLevel * 10)
    
    // 更新玩家数据
    player.level = newLevel
    player.experience = newExp
    player.experienceToNextLevel = newExpToNext
    player.totalExperience = player.totalExperience + expGain
    player.dailyDividend = dailyDividend
    player.lastFeedTime = Date.now()
    player.lastFeedDate = getTodayDate()
    player.updatedAt = Date.now()
    
    // 记录交易
    db.transactions.push({
      id: Date.now(),
      playerId: addr,
      type: 'feed',
      amount: tokenAmount,
      tokenAddress: tokenAddress || '',
      txHash: txHash || '',
      expGained: expGain,
      createdAt: Date.now()
    })
    
    saveData(db)
    
    res.json({ 
      success: true, 
      data: {
        player: formatPlayer(player, addr),
        expGained: expGain,
        leveledUp: newLevel > player.level
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 提取分红
app.post('/api/claim-dividend', (req, res) => {
  try {
    const { address, txHash } = req.body
    
    if (!address) {
      return res.status(400).json({ success: false, message: '缺少钱包地址' })
    }
    
    const addr = address.toLowerCase()
    const player = db.players[addr]
    
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' })
    }
    
    if (player.dailyDividend <= 0) {
      return res.json({ success: false, message: '没有可提取的分红' })
    }
    
    const dividendAmount = player.dailyDividend
    
    // 更新玩家数据
    player.dailyDividend = 0
    player.totalEarned = player.totalEarned + dividendAmount
    player.updatedAt = Date.now()
    
    // 记录交易
    db.transactions.push({
      id: Date.now(),
      playerId: addr,
      type: 'dividend',
      amount: dividendAmount,
      txHash: txHash || '',
      expGained: 0,
      createdAt: Date.now()
    })
    
    saveData(db)
    
    res.json({ 
      success: true, 
      data: {
        player: formatPlayer(player, addr),
        claimedAmount: dividendAmount
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取排行榜
app.get('/api/leaderboard', (req, res) => {
  try {
    const { filter = 'all' } = req.query
    
    let players = Object.entries(db.players).map(([addr, p]) => ({
      address: addr,
      ...p
    }))
    
    // 排序
    if (filter === 'daily') {
      players.sort((a, b) => b.dailyDividend - a.dailyDividend)
    } else if (filter === 'weekly') {
      players.sort((a, b) => b.level - a.level)
    } else {
      players.sort((a, b) => b.totalExperience - a.totalExperience)
    }
    
    const leaderboard = players.slice(0, 100).map((player, index) => ({
      rank: index + 1,
      address: player.address,
      level: player.level,
      totalExp: player.totalExperience,
      lobsterName: player.lobsterName,
      dailyDividend: player.dailyDividend
    }))
    
    res.json({ success: true, data: leaderboard })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取玩家交易历史
app.get('/api/transactions/:address', (req, res) => {
  try {
    const { address } = req.params
    const addr = address.toLowerCase()
    
    if (!db.players[addr]) {
      return res.json({ success: false, message: '玩家不存在' })
    }
    
    const transactions = db.transactions
      .filter(t => t.playerId === addr)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50)
    
    res.json({ success: true, data: transactions })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取统计数据
app.get('/api/stats', (req, res) => {
  try {
    const players = Object.values(db.players)
    const totalPlayers = players.length
    const totalExp = players.reduce((sum, p) => sum + (p.totalExperience || 0), 0)
    const totalDividends = players.reduce((sum, p) => sum + (p.totalEarned || 0), 0)
    
    res.json({
      success: true,
      data: {
        totalPlayers,
        totalExperience: totalExp,
        totalDividends
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// SPA 回退 - 所有不匹配 API 的请求都返回 index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  }
})

// 工具函数
const formatPlayer = (player, id) => ({
  id,
  address: player.address,
  lobsterName: player.lobsterName,
  level: player.level,
  experience: player.experience,
  experienceToNextLevel: player.experienceToNextLevel,
  totalExperience: player.totalExperience,
  dailyDividend: player.dailyDividend,
  totalEarned: player.totalEarned,
  lastFeedTime: player.lastFeedTime,
  todayFeedCount: player.todayFeedCount,
  lastFeedDate: player.lastFeedDate
})

// 获取今日日期字符串
const getTodayDate = () => new Date().toDateString()

// 检查并重置每日喂养次数
const checkDailyFeedReset = (player) => {
  const today = getTodayDate()
  if (player.lastFeedDate !== today) {
    player.todayFeedCount = 0
    player.lastFeedDate = today
  }
}

// 启动服务器 - 必须监听 0.0.0.0 让外部能访问
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🦞 龙虾游戏后端服务器运行在 http://0.0.0.0:${PORT}`)
  console.log(`📊 API端点:`)
  console.log(`   - GET  /api/player/:address`)
  console.log(`   - POST /api/player`)
  console.log(`   - POST /api/feed`)
  console.log(`   - POST /api/claim-dividend`)
  console.log(`   - GET  /api/leaderboard`)
  console.log(`   - GET  /api/transactions/:address`)
  console.log(`   - GET  /api/stats`)
  console.log(`   - GET  /api/config`)
  console.log(`   - POST /api/config/reload`)
})
