import { expect } from "chai";
import hardhat from "hardhat";

describe("Staking Rewards System", function () {
  let stakeToken: any;
  let rewardToken: any;
  let stakingRewards: any;
  let owner: any;
  let user1: any;
  let user2: any;
  let ethers: any;

  before(async function () {
    // Connect to network and get ethers
    const hre = await hardhat.network.connect();
    ethers = hre.ethers;
    
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy tokens
    const StakeToken = await ethers.getContractFactory("StakeToken");
    stakeToken = await StakeToken.deploy();
    await stakeToken.waitForDeployment();
    
    const RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy();
    await rewardToken.waitForDeployment();
    
    // Deploy staking contract
    const StakingRewards = await ethers.getContractFactory("StakingRewards");
    stakingRewards = await StakingRewards.deploy(
      await stakeToken.getAddress(),
      await rewardToken.getAddress()
    );
    await stakingRewards.waitForDeployment();
    
    // Setup: Transfer tokens
    await stakeToken.transfer(user1.address, ethers.parseEther("1000"));
    await stakeToken.transfer(user2.address, ethers.parseEther("1000"));
    await rewardToken.transfer(await stakingRewards.getAddress(), ethers.parseEther("100000"));
  });

  describe("Deployment", function () {
    it("Should set the correct token addresses", async function () {
      expect(await stakingRewards.stakingToken()).to.equal(await stakeToken.getAddress());
      expect(await stakingRewards.rewardsToken()).to.equal(await rewardToken.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await stakingRewards.owner()).to.equal(owner.address);
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.parseEther("100");
      
      // Approve and stake
      await stakeToken.connect(user1).approve(await stakingRewards.getAddress(), stakeAmount);
      await stakingRewards.connect(user1).stake(stakeAmount);
      
      expect(await stakingRewards.balanceOf(user1.address)).to.equal(stakeAmount);
      expect(await stakingRewards.totalStaked()).to.equal(stakeAmount);
    });

    it("Should not allow staking 0 tokens", async function () {
      await expect(stakingRewards.connect(user1).stake(0))
        .to.be.revertedWith("Cannot stake 0");
    });
  });

  describe("Withdrawing", function () {
    it("Should not allow withdrawal before minimum period", async function () {
      const stakeAmount = ethers.parseEther("100");
      await stakeToken.connect(user1).approve(await stakingRewards.getAddress(), stakeAmount);
      await stakingRewards.connect(user1).stake(stakeAmount);
      
      await expect(stakingRewards.connect(user1).withdraw(ethers.parseEther("50")))
        .to.be.revertedWith("Still in lock period");
    });

    it("Should allow withdrawal after minimum period", async function () {
      const stakeAmount = ethers.parseEther("100");
      await stakeToken.connect(user1).approve(await stakingRewards.getAddress(), stakeAmount);
      await stakingRewards.connect(user1).stake(stakeAmount);
      
      // Increase time by 1 day
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      
      const withdrawAmount = ethers.parseEther("50");
      await stakingRewards.connect(user1).withdraw(withdrawAmount);
      
      expect(await stakingRewards.balanceOf(user1.address)).to.be.gt(0);
    });
  });

  describe("Rewards", function () {
    it("Should accumulate rewards over time", async function () {
      const stakeAmount = ethers.parseEther("100");
      await stakeToken.connect(user1).approve(await stakingRewards.getAddress(), stakeAmount);
      await stakingRewards.connect(user1).stake(stakeAmount);
      
      // Increase time by 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);
      
      const earned = await stakingRewards.earned(user1.address);
      expect(earned).to.be.gt(0);
    });
  });
});