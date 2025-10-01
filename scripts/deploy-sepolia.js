import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying to Sepolia Testnet...\n");
  
  // Connect to Sepolia via Alchemy
  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_SEPOLIA_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const deployerAddress = await signer.getAddress();
  
  console.log("Deploying contracts with account:", deployerAddress);
  
  const balance = await provider.getBalance(deployerAddress);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  if (parseFloat(ethers.formatEther(balance)) < 0.01) {
    console.error("❌ Insufficient balance! You need at least 0.01 Sepolia ETH");
    return;
  }

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
  console.log("   View on Etherscan: https://sepolia.etherscan.io/address/" + stakeTokenAddress);

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
  console.log("   View on Etherscan: https://sepolia.etherscan.io/address/" + rewardTokenAddress);

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
  console.log("   View on Etherscan: https://sepolia.etherscan.io/address/" + stakingRewardsAddress);

  // Setup contracts
  console.log("\n4. Setting up contracts...");
  const rewardAmount = ethers.parseEther("500000");
  await rewardToken.transfer(stakingRewardsAddress, rewardAmount);
  console.log("✅ Transferred 500,000 RWD to StakingRewards");

  await rewardToken.setMinter(stakingRewardsAddress, true);
  console.log("✅ Set StakingRewards as minter");

  // Set reasonable reward rate for testnet
  const rewardRate = ethers.parseEther("0.01"); // 0.01 tokens/second
  await stakingRewards.setRewardRate(rewardRate);
  console.log("✅ Set reward rate to 0.01 tokens/second");

  // Save deployment info
  const deployment = {
    network: "sepolia",
    timestamp: new Date().toISOString(),
    contracts: {
      StakeToken: stakeTokenAddress,
      RewardToken: rewardTokenAddress,
      StakingRewards: stakingRewardsAddress
    },
    deployer: deployerAddress,
    etherscanLinks: {
      StakeToken: `https://sepolia.etherscan.io/address/${stakeTokenAddress}`,
      RewardToken: `https://sepolia.etherscan.io/address/${rewardTokenAddress}`,
      StakingRewards: `https://sepolia.etherscan.io/address/${stakingRewardsAddress}`
    }
  };

  // Save to file
  const deploymentPath = path.join(__dirname, '../sepolia-deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("\n📄 Deployment Summary:");
  console.log("========================");
  console.log("Network: Sepolia Testnet");
  console.log("Deployer:", deployment.deployer);
  console.log("\n🔗 Contract Addresses:");
  Object.entries(deployment.contracts).forEach(([name, address]) => {
    console.log(`${name}: ${address}`);
  });
  console.log("\n✨ Deployment complete! Check sepolia-deployment.json for details");
  console.log("\n🌐 You can now update your frontend to use these Sepolia addresses!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });