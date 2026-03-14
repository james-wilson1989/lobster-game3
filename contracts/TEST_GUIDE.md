// 测试脚本 - 部署后手动测试用
// 使用 Hardhat 或 Remix 调用

/*
测试步骤：

1. 部署 LobsterVault 合约
   - _gameContract: 填一个你自己的游戏合约地址（如果没有，填 address(0) 也可以测试基础功能）
   - _operator: 填你的钱包地址

2. 充值测试 BNB
   调用 deposit() 函数，发送 0.1 BNB

3. 测试查询功能
   - dividendPool() 查看池子余额
   - getPendingDividend(your_address) 查看可领取金额

4. 测试领取
   - 如果 gameContract 填的不是 address(0)，需要实现 IGameContract 接口
   - 调用 claimDividend() 领取 BNB

*/

// 如果没有游戏合约，可以先部署一个简单的模拟合约：
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev 模拟游戏合约 - 用于测试 LobsterVault
 */
contract MockGameContract {
    address[5] public topHolders;
    
    function setTopHolders(address[5] memory _topHolders) external {
        topHolders = _topHolders;
    }
    
    function getTopHolders() external view returns (address[5] memory) {
        return topHolders;
    }
}

/*
Remix 测试方法：

1. 打开 https://remix.ethereum.org
2. 创建一个新文件 MockGameContract.sol，粘贴上面的代码
3. 创建一个新文件 LobsterVault.sol，粘贴合约代码
4. 部署 MockGameContract，记录地址
5. 部署 LobsterVault，传入：
   - _gameContract: MockGameContract 地址
   - _operator: 你的钱包地址
6. 在 MockGameContract 中设置前5名地址（包括你的地址）
7. 在 LobsterVault 中调用 deposit() 充值 BNB
8. 调用 getPendingDividend(你的地址) 查看可领取金额
9. 调用 claimDividend() 领取 BNB

*/
