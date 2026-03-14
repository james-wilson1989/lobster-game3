// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LobsterVault
 * @dev 分红金库 - 接收 Flap 平台税收，分发给游戏排行榜前5名玩家
 * 
 * 使用方式：
 * 1. 部署此合约
 * 2. 在 Flap 发射代币时，税收地址填此合约地址
 * 3. 税收自动进入此合约
 * 4. 前5名玩家调用 claimDividend() 领取
 */
contract LobsterVault {
    // ============ 常量 ============
    uint256 public constant BPS = 10000;
    uint256 public constant PRECISION = 1e18;

    // ============ 状态变量 ============
    
    // 游戏合约地址（用于获取排行榜）
    address public gameContract;
    
    // 分红池余额 (BNB)
    uint256 public dividendPool;
    
    // 用户已领取分红总额
    mapping(address => uint256) public claimedAmounts;
    
    // 角色
    address public owner;
    address public operator;
    
    // 暂停状态
    bool public paused;
    
    // Gas补贴
    bool public gasRefundEnabled = true;
    uint256 public gasRefundBps = 10000;       // 100%
    uint256 public gasRefundMax = 0.01 ether;  // 单次上限
    uint256 public gasOverhead = 35000;
    
    // 统计
    uint256 public totalDistributed;
    uint256 public totalClaimants;
    
    // 重入保护
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;
    
    // ============ 事件 ============
    event DividendsReceived(address indexed from, uint256 amount);
    event DividendClaimed(address indexed user, uint256 amount);
    event GameContractUpdated(address indexed oldAddr, address indexed newAddr);
    event OwnershipTransferred(address indexed prev, address indexed next);
    event OperatorUpdated(address indexed prev, address indexed next);
    event PausedUpdated(bool paused);
    event ParameterUpdated(string param, uint256 oldVal, uint256 newVal);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);
    event GasRefunded(address indexed to, uint256 amount);
    
    // ============ 修饰符 ============
    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }
    
    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "!operator");
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
     * @dev 只允许排行榜前5名玩家
     */
    modifier onlyTopPlayer() {
        address[5] memory top = getTopPlayers();
        bool isTop = false;
        for (uint i = 0; i < 5; i++) {
            if (top[i] == msg.sender && msg.sender != address(0)) {
                isTop = true;
                break;
            }
        }
        require(isTop, "!top5");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(address _gameContract, address _operator) {
        require(_operator != address(0), "!operator");
        
        owner = msg.sender;
        operator = _operator;
        gameContract = _gameContract;
    }
    
    // ============ 接收 BNB ============
    
    /**
     * @dev 接收 BNB - Flap 税收自动进入
     */
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
    
    // ============ 分红逻辑 ============
    
    /**
     * @dev 获取当前排行榜前5名玩家
     */
    function getTopPlayers() public view returns (address[5] memory) {
        if (gameContract == address(0)) {
            address[5] memory empty;
            return empty;
        }
        
        try IGameContract(gameContract).getTopHolders() returns (address[5] memory top) {
            return top;
        } catch {
            address[5] memory empty;
            return empty;
        }
    }
    
    /**
     * @dev 查询玩家是否在前5名
     */
    function isTopPlayer(address player) public view returns (bool) {
        address[5] memory top = getTopPlayers();
        for (uint i = 0; i < 5; i++) {
            if (top[i] == player && player != address(0)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev 计算玩家可领取的分红
     */
    function getPendingDividend(address player) public view returns (uint256) {
        if (paused) return 0;
        
        address[5] memory top = getTopPlayers();
        
        // 检查是否在前5
        bool isTopHolder = false;
        for (uint i = 0; i < 5; i++) {
            if (top[i] == player && player != address(0)) {
                isTopHolder = true;
                break;
            }
        }
        
        if (!isTopHolder) return 0;
        
        // 前5总待领取
        uint256 totalPending = 0;
        for (uint i = 0; i < 5; i++) {
            if (top[i] != address(0)) {
                totalPending += (dividendPool - claimedAmounts[top[i]]);
            }
        }
        
        // 每人平均
        return totalPending / 5;
    }
    
    /**
     * @dev 玩家领取分红 (BNB) - 防重入
     * @notice 只有排行榜前5名玩家可以调用
     */
    function claimDividend() external nonReentrant whenNotPaused onlyTopPlayer {
        uint256 gasStart = gasleft();
        
        address player = msg.sender;
        uint256 pending = getPendingDividend(player);
        require(pending > 0, "!pending");
        
        claimedAmounts[player] += pending;
        totalDistributed += pending;
        totalClaimants++;
        
        // 转账 BNB
        payable(player).transfer(pending);
        
        emit DividendClaimed(player, pending);
        
        // Gas补贴
        _refundGas(gasStart);
    }
    
    /**
     * @dev Gas补贴
     */
    function _refundGas(uint256 gasStart) internal {
        if (!gasRefundEnabled) return;
        
        uint256 gasUsed = gasStart - gasleft() + gasOverhead;
        uint256 refund = (gasUsed * tx.gasprice * gasRefundBps) / BPS;
        
        if (refund > gasRefundMax) refund = gasRefundMax;
        if (refund > address(this).balance) refund = address(this).balance;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
            emit GasRefunded(msg.sender, refund);
        }
    }
    
    // ============ 管理员功能 ============
    
    /**
     * @dev 更新游戏合约地址
     */
    function setGameContract(address _gameContract) external onlyOwner {
        emit GameContractUpdated(gameContract, _gameContract);
        gameContract = _gameContract;
    }
    
    /**
     * @dev 设置操作员
     */
    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "!addr");
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }
    
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
     * @dev 配置Gas补贴
     */
    function setGasRefundConfig(bool enabled, uint256 bps, uint256 maxWei) external onlyOwner {
        require(bps <= BPS, "!bps");
        gasRefundEnabled = enabled;
        gasRefundBps = bps;
        gasRefundMax = maxWei;
    }
    
    /**
     * @dev 应急提币
     */
    function emergencyWithdraw(address _token, uint256 amount) external onlyOwner {
        require(amount > 0, "!amount");
        
        if (_token == address(0)) {
            payable(owner).transfer(amount);
        } else {
            IERC20(_token).transfer(owner, amount);
        }
        
        emit EmergencyWithdraw(_token, owner, amount);
    }
}

/**
 * @dev 游戏合约接口
 */
interface IGameContract {
    function getTopHolders() external view returns (address[5] memory);
}

/**
 * @dev ERC20接口
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
