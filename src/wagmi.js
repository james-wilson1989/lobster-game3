import { createConfig, http, createStorage } from 'wagmi'
import { mainnet, bsc, bscTestnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = {
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
  tokenAddress: '0xfd961ecfb6bd0fc42fba52980522306847ed7777'
}

// 检查是否在浏览器环境
const isBrowser = typeof window !== 'undefined'

// 创建 storage - 只在浏览器环境
let storage = undefined
if (isBrowser) {
  try {
    storage = createStorage({ storage: window.localStorage })
  } catch (e) {
    console.warn('Failed to create storage:', e)
  }
}

export const wagmiConfig = createConfig({
  chains: [mainnet, bsc, bscTestnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
  storage
})

export { mainnet, bsc, bscTestnet } from 'wagmi/chains'
