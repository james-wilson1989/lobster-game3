// ===========================================
// 统一从 config.js 导入配置
// ===========================================
import { FOUNDER_WALLET, TOKEN_ADDRESS } from '../config'

// ERC20 代币 ABI - 用于转账
export const ERC20_ABI = [
  // transfer 函数
  {
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // decimals
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  // balanceOf
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
]

// 导出配置供其他地方使用
export { FOUNDER_WALLET, TOKEN_ADDRESS }
