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

// 创始人钱包地址
export const FOUNDER_WALLET = '0x01db37579e55ce13f4504019025e36047bdad845'

// 代币地址
export const TOKEN_ADDRESS = '0xfd961ecfb6bd0fc42fba52980522306847ed7777'
