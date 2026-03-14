// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev 模拟游戏合约 - 用于测试 LobsterVault
 * 
 * 使用方法：
 * 1. 在 Remix 部署这个合约
 * 2. 设置你的地址为前5名
 * 3. 部署 LobsterVault，gameContract 填这个合约地址
 */
contract MockGameContract {
    address[5] public topHolders;
    
    /**
     * @dev 设置前5名玩家
     * @param _topHolders 5个玩家地址
     */
    function setTopHolders(address[5] memory _topHolders) external {
        topHolders = _topHolders;
    }
    
    /**
     * @dev 获取前5名玩家（接口要求）
     */
    function getTopHolders() external view returns (address[5] memory) {
        return topHolders;
    }
}
