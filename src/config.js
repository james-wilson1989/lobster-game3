// ===========================================
// 龙虾游戏配置 - 从后端动态获取
// ===========================================

// 默认配置（后端连接成功后会覆盖）
let defaultConfig = {
  chainId: 97,
  rpcUrl: 'https://bsc-testnet.publicnode.com',
  minFeed: 1,
  maxFeed: 100,
  dailyLimit: 10,
  expPerToken: 10,
  topN: 5,
  dividendPercent: 10,
  apiBase: import.meta.env.VITE_API_BASE || 'http://localhost:3001',
  founderWallet: '0x01db37579e55ce13f4504019025e36047bdad845',
  tokenAddress: '0xfd961ecfb6bd0fc42fba52980522306847ed7777',
  tokenSymbol: 'TEST',
  tokenDecimals: 18
}

// 异步获取后端配置
export const fetchConfig = async (initialApiBase) => {
  try {
    // 使用传入的初始地址获取配置
    const res = await fetch(`${initialApiBase}/api/config`)
    const data = await res.json()
    if (data.success) {
      const backendData = data.data
      // 使用后端返回的 apiBase（如果后端没有返回，则使用传入的 initialApiBase）
      const apiBase = backendData.apiBase || initialApiBase
      return {
        ...defaultConfig,
        ...backendData,
        apiBase: apiBase,  // 使用后端返回的地址
        // 字段名映射：后端 -> 前端
        minFeed: backendData.minFeedAmount || defaultConfig.minFeed,
        maxFeed: backendData.maxFeedAmount || defaultConfig.maxFeed,
        dailyLimit: backendData.dailyFeedLimit || defaultConfig.dailyLimit,
        dividendPercent: backendData.dividendRate || defaultConfig.dividendPercent,
        topN: 5
      }
    }
  } catch (e) {
    console.warn('获取后端配置失败，使用默认配置:', e)
  }
  return defaultConfig
}

// 导出默认配置
export const config = defaultConfig

// 单独导出各配置项
export const CHAIN_ID = defaultConfig.chainId
export const RPC_URL = defaultConfig.rpcUrl
export const TOKEN_ADDRESS = defaultConfig.tokenAddress
export const TOKEN_SYMBOL = defaultConfig.tokenSymbol
export const TOKEN_DECIMALS = defaultConfig.tokenDecimals
export const FOUNDER_WALLET = defaultConfig.founderWallet
export const MIN_FEED = defaultConfig.minFeed
export const MAX_FEED = defaultConfig.maxFeed
export const DAILY_LIMIT = defaultConfig.dailyLimit
export const EXP_PER_TOKEN = defaultConfig.expPerToken
