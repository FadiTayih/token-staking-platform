import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner(0);
  
  // YOUR CONTRACT ADDRESSES - Update these!
  const STAKING_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const YOUR_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  // Load ABI
  const fs = await import("fs");
  const stakingArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/StakingRewards.sol/StakingRewards.json", "utf8")
  );
  
  const staking = new ethers.Contract(STAKING_ADDRESS, stakingArtifact.abi, signer);
  
  console.log("Checking contract state...\n");
  
  // Check reward rate
  const rate = await staking.rewardRate();
  console.log("Current reward rate:", rate.toString(), "wei/second");
  console.log("Rate in ETH:", ethers.formatEther(rate), "\n");
  
  // Check total staked
  const totalStaked = await staking.totalStaked();
  console.log("Total staked:", ethers.formatEther(totalStaked), "STK\n");
  
  // Check your balance
  const yourStake = await staking.balanceOf(YOUR_WALLET);
  console.log("Your staked amount:", ethers.formatEther(yourStake), "STK");
  
  // Check earned
  const earned = await staking.earned(YOUR_WALLET);
  console.log("Your earned rewards:", ethers.formatEther(earned), "RWD\n");
  
  // FIX: Set a high reward rate
  console.log("Setting reward rate to 1 token/second...");
  const tx = await staking.setRewardRate(ethers.parseEther("1"));
  await tx.wait();
  console.log("✅ Reward rate updated!\n");
  
  // Wait 2 seconds and check again
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const newEarned = await staking.earned(YOUR_WALLET);
  console.log("Earned after 2 seconds:", ethers.formatEther(newEarned), "RWD");
}

main().catch(console.error);