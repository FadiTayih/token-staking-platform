import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import { StakeTokenABI } from './utils/abi/StakeToken';
import { RewardTokenABI } from './utils/abi/RewardToken';
import { StakingRewardsABI } from './utils/abi/StakingRewards';

// Contract addresses for different networks
const CONTRACTS = {
  localhost: {
    StakeToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    RewardToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    StakingRewards: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  },
  sepolia: {
    StakeToken: "0xEa3AeFCcd8d0418f585eb908D4D0394c8Db088Ed",
    RewardToken: "0xc0608443bA7E80Cc04f4a4C678bD24B174749CE4",
    StakingRewards: "0xD3EDd8B346Ec305C61D55a32c408f2B88c5b9188"
  }
};

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [network, setNetwork] = useState('');
  const [contractAddresses, setContractAddresses] = useState(null);
  
  const [stakeTokenContract, setStakeTokenContract] = useState(null);
  const [rewardTokenContract, setRewardTokenContract] = useState(null);
  const [stakingRewardsContract, setStakingRewardsContract] = useState(null);
  
  const [stakeTokenBalance, setStakeTokenBalance] = useState('0');
  const [rewardTokenBalance, setRewardTokenBalance] = useState('0');
  const [stakedBalance, setStakedBalance] = useState('0');
  const [earnedRewards, setEarnedRewards] = useState('0');
  const [totalStaked, setTotalStaked] = useState('0');
  const [apy, setApy] = useState('0');
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
      
      // Listen for network changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  useEffect(() => {
    if (account && stakingRewardsContract) {
      loadData();
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [account, stakingRewardsContract]);

  const connectWallet = async () => {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        toast.error('Please install MetaMask!');
        return;
      }
      
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      await web3Provider.send("eth_requestAccounts", []);
      const web3Signer = await web3Provider.getSigner();
      
      // Get current network
      const network = await web3Provider.getNetwork();
      const chainId = Number(network.chainId);
      
      let currentNetwork = '';
      let addresses = null;
      
      // Determine which addresses to use based on network
      if (chainId === 31337) {
        currentNetwork = 'Localhost';
        addresses = CONTRACTS.localhost;
      } else if (chainId === 11155111) {
        currentNetwork = 'Sepolia';
        addresses = CONTRACTS.sepolia;
      } else {
        toast.error('Please connect to Localhost (31337) or Sepolia (11155111) network!');
        setLoading(false);
        return;
      }
      
      setNetwork(currentNetwork);
      setContractAddresses(addresses);
      setProvider(web3Provider);
      setSigner(web3Signer);
      
      const address = await web3Signer.getAddress();
      setAccount(address);
      
      // Initialize contracts with correct addresses
      const stakeToken = new ethers.Contract(
        addresses.StakeToken,
        StakeTokenABI,
        web3Signer
      );
      
      const rewardToken = new ethers.Contract(
        addresses.RewardToken,
        RewardTokenABI,
        web3Signer
      );
      
      const stakingRewards = new ethers.Contract(
        addresses.StakingRewards,
        StakingRewardsABI,
        web3Signer
      );
      
      setStakeTokenContract(stakeToken);
      setRewardTokenContract(rewardToken);
      setStakingRewardsContract(stakingRewards);
      
      toast.success(`Connected to ${currentNetwork}!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to connect wallet!');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [
        stkBalance,
        rwdBalance,
        staked,
        earned,
        total,
        apyValue
      ] = await Promise.all([
        stakeTokenContract.balanceOf(account),
        rewardTokenContract.balanceOf(account),
        stakingRewardsContract.balanceOf(account),
        stakingRewardsContract.earned(account),
        stakingRewardsContract.totalStaked(),
        stakingRewardsContract.getAPY()
      ]);
      
      setStakeTokenBalance(ethers.formatEther(stkBalance));
      setRewardTokenBalance(ethers.formatEther(rwdBalance));
      setStakedBalance(ethers.formatEther(staked));
      setEarnedRewards(ethers.formatEther(earned));
      setTotalStaked(ethers.formatEther(total));
      setApy((Number(apyValue) / 100).toFixed(2));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleStake = async () => {
    try {
      setLoading(true);
      const amount = ethers.parseEther(stakeAmount);
      
      // Approve
      const approveTx = await stakeTokenContract.approve(
        contractAddresses.StakingRewards,
        amount
      );
      toast.info('Approving tokens...');
      await approveTx.wait();
      
      // Stake
      const stakeTx = await stakingRewardsContract.stake(amount);
      toast.info('Staking tokens...');
      await stakeTx.wait();
      
      toast.success('Staked successfully!');
      setStakeAmount('');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.reason || 'Staking failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    try {
      setLoading(true);
      const amount = ethers.parseEther(unstakeAmount);
      
      const tx = await stakingRewardsContract.withdraw(amount);
      toast.info('Unstaking tokens...');
      await tx.wait();
      
      toast.success('Unstaked successfully!');
      setUnstakeAmount('');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.reason || 'Unstaking failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    try {
      setLoading(true);
      
      const tx = await stakingRewardsContract.claimReward();
      toast.info('Claiming rewards...');
      await tx.wait();
      
      toast.success('Rewards claimed successfully!');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.reason || 'Claiming failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleFaucet = async () => {
    try {
      setLoading(true);
      
      const tx = await stakeTokenContract.faucet();
      toast.info('Getting tokens from faucet...');
      await tx.wait();
      
      toast.success('100 STK received from faucet!');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.reason || 'Faucet failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🚀 Token Staking Platform</h1>
        {account ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              background: network === 'Sepolia' ? '#4CAF50' : '#2196F3',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '5px',
              fontSize: '0.9rem'
            }}>
              {network}
            </div>
            <div className="account">
              Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          </div>
        ) : (
          <button onClick={connectWallet} disabled={loading}>
            Connect Wallet
          </button>
        )}
      </header>

      {account && (
        <main className="app-main">
          <div className="stats">
            <div className="stat-card">
              <h3>Total Staked</h3>
              <p>{totalStaked} STK</p>
            </div>
            <div className="stat-card">
              <h3>APY</h3>
              <p>{apy}%</p>
            </div>
            <div className="stat-card">
              <h3>Your STK</h3>
              <p>{parseFloat(stakeTokenBalance).toFixed(4)}</p>
            </div>
            <div className="stat-card">
              <h3>Your RWD</h3>
              <p>{parseFloat(rewardTokenBalance).toFixed(4)}</p>
            </div>
          </div>

          <div className="actions">
            <div className="action-card">
              <h2>Stake</h2>
              <p>Balance: {parseFloat(stakeTokenBalance).toFixed(4)} STK</p>
              <input
                type="number"
                placeholder="Amount to stake"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
              />
              <button onClick={handleStake} disabled={loading || !stakeAmount}>
                Stake
              </button>
            </div>

            <div className="action-card">
              <h2>Unstake</h2>
              <p>Staked: {parseFloat(stakedBalance).toFixed(4)} STK</p>
              <input
                type="number"
                placeholder="Amount to unstake"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
              />
              <button onClick={handleUnstake} disabled={loading || !unstakeAmount}>
                Unstake
              </button>
            </div>

            <div className="action-card">
              <h2>Rewards</h2>
              <p>Earned: {parseFloat(earnedRewards).toFixed(6)} RWD</p>
              <button onClick={handleClaimRewards} disabled={loading}>
                Claim Rewards
              </button>
              <button onClick={handleFaucet} disabled={loading} style={{marginTop: '10px'}}>
                Get Test Tokens
              </button>
            </div>
          </div>
        </main>
      )}

      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default App;