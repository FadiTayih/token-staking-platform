// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StakingRewards
 * @dev Staking contract that distributes rewards based on staked amount and duration
 */
contract StakingRewards is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;
    
    // ========== STATE VARIABLES ==========
    
    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardsToken;
    
    uint256 public rewardRate = 100; // Rewards per second per token (with 18 decimal precision)
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;
    
    // Minimum staking period (1 day)
    uint256 public constant MIN_STAKING_PERIOD = 1 days;
    
    // User data
    struct UserInfo {
        uint256 stakedAmount;
        uint256 rewardPerTokenPaid;
        uint256 rewards;
        uint256 lastStakedTime;
    }
    
    mapping(address => UserInfo) public userInfo;
    
    // ========== EVENTS ==========
    
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 newRate);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    
    // ========== CONSTRUCTOR ==========
    
    constructor(
        address _stakingToken,
        address _rewardsToken
    ) Ownable(msg.sender) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardsToken != address(0), "Invalid rewards token");
        
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
        lastUpdateTime = block.timestamp;
    }
    
    // ========== MODIFIERS ==========
    
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        
        if (account != address(0)) {
            userInfo[account].rewards = earned(account);
            userInfo[account].rewardPerTokenPaid = rewardPerTokenStored;
        }
        _;
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Calculate reward per token
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        
        return rewardPerTokenStored + 
            ((block.timestamp - lastUpdateTime) * rewardRate * 1e18 / totalStaked);
    }
    
    /**
     * @dev Calculate earned rewards for a user
     */
    function earned(address account) public view returns (uint256) {
        UserInfo memory user = userInfo[account];
        return (user.stakedAmount * 
            (rewardPerToken() - user.rewardPerTokenPaid) / 1e18) + 
            user.rewards;
    }
    
    /**
     * @dev Get user's staked balance
     */
    function balanceOf(address account) public view returns (uint256) {
        return userInfo[account].stakedAmount;
    }
    
    /**
     * @dev Calculate APY (Annual Percentage Yield)
     * Returns APY with 2 decimal precision (e.g., 1250 = 12.50%)
     */
    function getAPY() public view returns (uint256) {
        if (totalStaked == 0) {
            return 0;
        }
        
        // APY = (rewardRate * seconds in year * 100) / totalStaked
        // We multiply by 100 for percentage with 2 decimals
        uint256 yearlyRewards = rewardRate * 365 days;
        return (yearlyRewards * 10000) / totalStaked;
    }
    
    /**
     * @dev Check if user can unstake (passed minimum period)
     */
    function canUnstake(address account) public view returns (bool) {
        return block.timestamp >= userInfo[account].lastStakedTime + MIN_STAKING_PERIOD;
    }
    
    /**
     * @dev Get time until user can unstake
     */
    function timeUntilUnstake(address account) public view returns (uint256) {
        uint256 unlockTime = userInfo[account].lastStakedTime + MIN_STAKING_PERIOD;
        if (block.timestamp >= unlockTime) {
            return 0;
        }
        return unlockTime - block.timestamp;
    }
    
    // ========== MUTATIVE FUNCTIONS ==========
    
    /**
     * @dev Stake tokens
     */
    function stake(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        updateReward(msg.sender) 
    {
        require(amount > 0, "Cannot stake 0");
        
        UserInfo storage user = userInfo[msg.sender];
        
        // Transfer staking tokens from user
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update user info
        user.stakedAmount += amount;
        user.lastStakedTime = block.timestamp;
        
        // Update total staked
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @dev Withdraw staked tokens
     */
    function withdraw(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        updateReward(msg.sender) 
    {
        require(amount > 0, "Cannot withdraw 0");
        
        UserInfo storage user = userInfo[msg.sender];
        require(user.stakedAmount >= amount, "Insufficient balance");
        require(canUnstake(msg.sender), "Still in lock period");
        
        // Update user info
        user.stakedAmount -= amount;
        
        // Update total staked
        totalStaked -= amount;
        
        // Transfer tokens back to user
        stakingToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Claim earned rewards
     */
    function claimReward() 
        external 
        nonReentrant 
        whenNotPaused 
        updateReward(msg.sender) 
    {
        UserInfo storage user = userInfo[msg.sender];
        uint256 reward = user.rewards;
        
        require(reward > 0, "No rewards to claim");
        
        user.rewards = 0;
        rewardsToken.safeTransfer(msg.sender, reward);
        
        emit RewardPaid(msg.sender, reward);
    }
    
    /**
     * @dev Withdraw all and claim rewards
     */
    function exit() external {
    UserInfo memory user = userInfo[msg.sender];
    
    if (user.stakedAmount > 0) {
        this.withdraw(user.stakedAmount);
    }
    
    if (earned(msg.sender) > 0) {
        this.claimReward();
    }
}
    
    /**
     * @dev Emergency withdraw without rewards (only in emergency)
     */
    function emergencyWithdraw() 
        external 
        nonReentrant 
    {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.stakedAmount;
        
        require(amount > 0, "No staked balance");
        
        // Reset user data
        user.stakedAmount = 0;
        user.rewards = 0;
        user.rewardPerTokenPaid = 0;
        
        // Update total staked
        totalStaked -= amount;
        
        // Transfer tokens back to user
        stakingToken.safeTransfer(msg.sender, amount);
        
        emit EmergencyWithdraw(msg.sender, amount);
    }
    
    // ========== OWNER FUNCTIONS ==========
    
    /**
     * @dev Update reward rate
     */
    function setRewardRate(uint256 _rewardRate) 
        external 
        onlyOwner 
        updateReward(address(0)) 
    {
        require(_rewardRate > 0, "Reward rate must be > 0");
        rewardRate = _rewardRate;
        emit RewardRateUpdated(_rewardRate);
    }
    
    /**
     * @dev Pause staking
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause staking
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Recover wrong tokens sent to contract
     */
    function recoverWrongToken(address tokenAddress, uint256 tokenAmount) 
        external 
        onlyOwner 
    {
        require(tokenAddress != address(stakingToken), "Cannot withdraw staking token");
        require(tokenAddress != address(rewardsToken), "Cannot withdraw rewards token");
        
        IERC20(tokenAddress).safeTransfer(msg.sender, tokenAmount);
    }
}