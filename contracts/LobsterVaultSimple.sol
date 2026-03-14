// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LobsterVaultSimple
 * @dev 简化版分红金库 - 创始人手动设置前5名玩家
 * 
 * 使用方式：
 * 1. 部署此合约
 * 2. 充值 BNB 到池子
 * 3. 创始人调用 setTopPlayers() 设置前5名玩家
 * 4. 前5名玩家调用 claimDividend() 领取
 */
contract LobsterVaultSimple {
    // ============ 状态变量 ============
    
    // 分红池余额 (BNB)
    uint256 public dividendPool;
    
    // 用户已领取分红总额
    mapping(address => uint256) public claimedAmounts;
    
    // 前5名玩家地址
    address[5] public topPlayers;
    
    // 角色
    address public owner;
    
    // 暂停状态
    bool public paused;
    
    // 重入保护
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;
    
    // ============ 事件 ============
    event DividendsReceived(address indexed from, uint256 amount);
    event DividendClaimed(address indexed user, uint256 amount);
    event TopPlayersUpdated(address[5] indexed oldTop, address[5] indexed newTop);
    event OwnershipTransferred(address indexed prev, address indexed next);
    event PausedUpdated(bool paused);
    
    // ============ 修饰符 ============
    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }
    
    modifier nonReentrant() {
        require(_status != _ENTERED, "REENTRANCY");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    
    /**
     * @dev 只允许前5名玩家
     */
    modifier onlyTopPlayer() {
        bool isTop = false;
        for (uint i = 0; i < 5; i++) {
            if (topPlayers[i] == msg.sender && msg.sender != address(0)) {
                isTop = true;
                break;
            }
        }
        require(isTop, "!top5");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor() {
        owner = msg.sender;
    }
    
    // ============ 接收 BNB ============
    
    receive() external payable {
        dividendPool += msg.value;
        emit DividendsReceived(msg.sender, msg.value);
    }
    
    /**
     * @dev 手动充值 BNB 到分红池
     */
    function deposit() external payable {
        require(msg.value > 0, "!value");
        dividendPool += msg.value;
        emit DividendsReceived(msg.sender, msg.value);
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 创始人设置前5名玩家
     */
    function setTopPlayers(address[5] memory _topPlayers) external onlyOwner {
        emit TopPlayersUpdated(topPlayers, _topPlayers);
        topPlayers = _topPlayers;
    }
    
    /**
     * @dev 查询玩家是否可以领取（现在改成任何人都能领）
     */
    function isTopPlayer(address player) public pure returns (bool) {
        return player != address(0);
    }
    
    /**
     * @dev 计算玩家可领取的分红（任何人都能领，平均分配）
     */
    function getPendingDividend(address player) public view returns (uint256) {
        if (paused) return 0;
        if (!isTopPlayer(player)) return 0;
        
        // 分红池 / 5，任何人可领
        uint256 poolPerPerson = dividendPool / 5;
        uint256 alreadyClaimed = claimedAmounts[player];
        
        if (poolPerPerson <= alreadyClaimed) return 0;
        
        return poolPerPerson - alreadyClaimed;
    }
    
    /**
     * @dev 玩家领取分红 (BNB)
     */
    function claimDividend() external nonReentrant whenNotPaused onlyTopPlayer {
        address player = msg.sender;
        uint256 pending = getPendingDividend(player);
        require(pending > 0, "!pending");
        
        claimedAmounts[player] += pending;
        
        // 转账 BNB (使用 call 更安全)
        (bool success, ) = player.call{value: pending}("");
        require(success, "transfer failed");
        
        emit DividendClaimed(player, pending);
    }
    
    // ============ 管理员功能 ============
    
    /**
     * @dev 转移所有权
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "!addr");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    /**
     * @dev 暂停/恢复
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedUpdated(_paused);
    }
    
    /**
     * @dev 应急提币
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0 && amount <= address(this).balance, "!amount");
        // 应急提币 (使用 call 更安全)
        (bool success, ) = owner.call{value: amount}("");
        require(success, "transfer failed");
    }
}
