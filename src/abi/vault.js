// LobsterVault 智能合约 ABI
export const VAULT_ABI = [
  // 获取前5名玩家
  {
    "inputs": [],
    "name": "getTopPlayers",
    "outputs": [
      {
        "internalType": "address[5]",
        "name": "",
        "type": "address[5]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 查询玩家是否在前5
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "isTopPlayer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 查询可领取分红
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPendingDividend",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 领取分红
  {
    "inputs": [],
    "name": "claimDividend",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // 分红池余额
  {
    "inputs": [],
    "name": "dividendPool",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// 分红Vault合约地址（部署后填写）
export const VAULT_ADDRESS = '0x0000000000000000000000000000000000000000'
