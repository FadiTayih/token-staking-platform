import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Starting deployment...\n");
  
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner(0);
  const deployerAddress = await signer.getAddress();
  
  console.log("Deploying contracts with account:", deployerAddress);
  
  const balance = await provider.getBalance(deployerAddress);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy StakeToken
  console.log("1. Deploying StakeToken...");
  const stakeTokenArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/StakeToken.sol/StakeToken.json", "utf8")
  );
  
  const StakeTokenFactory = new ethers.ContractFactory(
    stakeTokenArtifact.abi,
    stakeTokenArtifact.bytecode,
    signer
  );
  
  const stakeToken = await StakeTokenFactory.deploy();
  await stakeToken.waitForDeployment();
  const stakeTokenAddress = await stakeToken.getAddress();
  console.log("✅ StakeToken deployed to:", stakeTokenAddress);

  // Deploy RewardToken
  console.log("\n2. Deploying RewardToken...");
  const rewardTokenArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/RewardToken.sol/RewardToken.json", "utf8")
  );
  
  const RewardTokenFactory = new ethers.ContractFactory(
    rewardTokenArtifact.abi,
    rewardTokenArtifact.bytecode,
    signer
  );
  
  const rewardToken = await RewardTokenFactory.deploy();
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log("✅ RewardToken deployed to:", rewardTokenAddress);

  // Deploy StakingRewards
  console.log("\n3. Deploying StakingRewards...");
  const stakingRewardsArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/StakingRewards.sol/StakingRewards.json", "utf8")
  );
  
  const StakingRewardsFactory = new ethers.ContractFactory(
    stakingRewardsArtifact.abi,
    stakingRewardsArtifact.bytecode,
    signer
  );
  
  const stakingRewards = await StakingRewardsFactory.deploy(
    stakeTokenAddress,
    rewardTokenAddress
  );
  await stakingRewards.waitForDeployment();
  const stakingRewardsAddress = await stakingRewards.getAddress();
  console.log("✅ StakingRewards deployed to:", stakingRewardsAddress);

  // Setup: Transfer reward tokens to staking contract
  console.log("\n4. Setting up contracts...");
  const rewardAmount = ethers.parseEther("500000");
  await rewardToken.transfer(stakingRewardsAddress, rewardAmount);
  console.log("✅ Transferred 500,000 RWD to StakingRewards contract");

  await rewardToken.setMinter(stakingRewardsAddress, true);
  console.log("✅ Set StakingRewards as RewardToken minter");

  // Set high reward rate for visibility
  const newRewardRate = ethers.parseEther("1"); // 1 token per second
  await stakingRewards.setRewardRate(newRewardRate);
  console.log("✅ Set reward rate to 1 token/second for easy testing");

  // AUTOMATICALLY UPDATE FRONTEND ADDRESSES
  const addresses = {
    StakeToken: stakeTokenAddress,
    RewardToken: rewardTokenAddress,
    StakingRewards: stakingRewardsAddress
  };

  // Save to frontend
  const frontendPath = path.join(__dirname, '../frontend/src/utils/contracts.js');
  const contractsContent = `export const CONTRACT_ADDRESSES = ${JSON.stringify(addresses, null, 2)};\n`;
  
  fs.writeFileSync(frontendPath, contractsContent);
  console.log("\n✅ Frontend addresses automatically updated!");

  // Save deployment info
  const deployment = {
    network: "localhost",
    timestamp: new Date().toISOString(),
    contracts: addresses,
    deployer: deployerAddress
  };

  const deploymentPath = path.join(__dirname, '../deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("\n📄 Deployment Summary:");
  console.log("========================");
  console.log("Network:", deployment.network);
  console.log("Deployer:", deployment.deployer);
  console.log("\nContract Addresses:");
  console.log("- StakeToken:", addresses.StakeToken);
  console.log("- RewardToken:", addresses.RewardToken);
  console.log("- StakingRewards:", addresses.StakingRewards);
  console.log("\n✨ Deployment complete! Frontend automatically updated!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });