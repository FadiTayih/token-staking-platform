# Token Staking Platform

A production-ready DeFi staking platform built on Ethereum that lets users stake STK tokens to earn RWD token rewards. This project was developed as part of the Alchemy University EVM Developer Certification program.

## What This Does

Users lock up their STK tokens in a smart contract for a minimum of 24 hours. During this time, they automatically earn RWD tokens as rewards based on how much they've staked and for how long. Think of it like earning interest on a savings account, except it's all handled by smart contracts with no middleman.

The platform includes a clean React frontend that connects to your MetaMask wallet, making it easy to stake, check your earnings, and claim rewards.

## Tech Stack

- **Smart Contracts**: Solidity 0.8.20 with OpenZeppelin libraries
- **Development Framework**: Hardhat v3 with TypeScript support
- **Frontend**: React.js with Ethers.js v6 for blockchain interaction
- **Testing**: Mocha and Chai
- **Networks**: Local Hardhat network and Sepolia testnet via Alchemy

## The Contracts

### StakeToken (STK)
The ERC20 token users stake to earn rewards. Has a max supply of 1 million tokens and includes a faucet function so you can claim 100 test tokens once per day on testnet.

### RewardToken (RWD)  
The ERC20 token distributed as staking rewards. Max supply of 10 million tokens. The staking contract is set as an authorized minter.

### StakingRewards
The main contract that handles all the staking logic:
- Accepts STK token deposits
- Calculates rewards based on time staked and total pool size
- Enforces a 24-hour minimum lock period
- Distributes RWD tokens as rewards
- Includes emergency pause and recovery functions

## Security Features

The contracts implement several protection mechanisms:
- **ReentrancyGuard**: Prevents reentrancy attacks on withdraw/claim functions
- **Pausable**: Owner can pause staking in case of emergency
- **Ownable**: Admin functions are restricted to contract owner
- **SafeERC20**: Safe token transfer methods to handle non-standard tokens
- **Time Locks**: Enforces minimum 24-hour staking period before withdrawal

## Getting Started

### What You Need
- Node.js v16 or higher
- MetaMask browser extension
- Git

### Installation

Clone the repo and install dependencies:

```bash
git clone <repo-url>
cd token-staking-platform
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

### Environment Setup

Create a `.env` file in the root directory:

```env
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```


## Running Locally

Start a local Hardhat node:

```bash
npx hardhat node
```

In a new terminal, deploy the contracts:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

The deployment script automatically updates the frontend with the new contract addresses.

Start the frontend:

```bash
cd frontend
npm start
```

Connect MetaMask to `http://127.0.0.1:8545` (Hardhat's local network). Import one of the test accounts from the Hardhat node output.

## Deploying to Sepolia

Make sure you have Sepolia ETH in your wallet (get some from the [Alchemy faucet](https://sepoliafaucet.com/)).

Deploy:

```bash
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

The contract addresses will be saved to `sepolia-deployment.json`. You'll need to manually update these in the frontend's `App.js` file.

Verify on Etherscan (optional):

```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

## Current Deployments

### Sepolia Testnet
- **StakeToken**: `0xEa3AeFCcd8d0418f585eb908D4D0394c8Db088Ed`
- **RewardToken**: `0xc0608443bA7E80Cc04f4a4C678bD24B174749CE4`
- **StakingRewards**: `0xD3EDd8B346Ec305C61D55a32c408f2B88c5b9188`

## Using the Platform

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask
2. **Get Test Tokens**: Use the faucet to claim 100 STK tokens (once per day)
3. **Stake**: Enter an amount and click "Stake" - you'll need to approve the transaction first
4. **Watch Rewards**: Your earned RWD tokens update in real-time
5. **Claim**: Click "Claim Rewards" anytime to withdraw your earned rewards
6. **Unstake**: After 24 hours, you can unstake your tokens

## Configuration

### Staking Parameters
- **Lock Period**: 24 hours minimum
- **Reward Rate**: Configurable by owner (currently 1 token/sec on localhost, 0.01 token/sec on Sepolia)
- **Max STK Supply**: 1,000,000 tokens
- **Max RWD Supply**: 10,000,000 tokens

### Network Detection
The frontend automatically detects whether you're on localhost (ChainID 31337) or Sepolia (ChainID 11155111) and uses the appropriate contract addresses.

## Testing

Run the test suite:

```bash
npx hardhat test
```

The tests cover:
- Contract deployment and initialization
- Staking functionality
- Time-locked withdrawals
- Reward calculations
- Edge cases and error conditions

## Known Issues and Notes

### The APY Looks Crazy High

Yes, I know. The APY calculation shows over 300,000% because the reward rate is set high for demo purposes. In a real production environment, you'd set this much lower to make the reward pool last longer. The high rate makes it easy to see rewards accumulating during testing.

### Reward Pool Sustainability

With the current settings, the 500,000 RWD reward pool will deplete quickly if many users stake. This is fine for a demo/testnet environment. For mainnet, you'd want to:
- Lower the reward rate significantly
- Implement a rewards pool refill mechanism
- Add checks to prevent pool depletion
- Consider time-based reward decay

### Test Coverage

The test suite covers the main happy paths and some error cases, but could use more comprehensive edge case testing, especially around:
- Multiple users staking/unstaking simultaneously
- Reward calculations at pool boundaries
- Contract state after emergency withdrawals

## Troubleshooting

**MetaMask won't connect**: Make sure you're on the right network (localhost or Sepolia). For localhost, the RPC URL should be `http://127.0.0.1:8545`.

**Transaction failing**: Check that you have enough tokens to stake and enough ETH for gas fees.

**Rewards not showing**: The reward rate might be set too low. Use the `checkRewards.js` script to verify the current rate.

**Can't unstake**: You need to wait 24 hours after staking. Check the "Time Until Unstake" display.

## Gas Optimization

The contracts use several gas optimization techniques:
- Immutable variables for token addresses
- Caching of storage reads
- Efficient reward calculation formula
- Solidity optimizer enabled (200 runs)

## Future Improvements

Some ideas for v2:
- Add liquidity pool integration
- Implement a governance token
- Support staking multiple token types
- Create a rewards multiplier system
- Add mobile app support
- Deploy to mainnet with proper economic parameters


## License

MIT License - feel free to use this code for your own projects.

## Acknowledgments

Built with ❤️ for the Alchemy University EVM Certification program. Special thanks to the Alchemy team for their excellent educational content and developer tools.

---

**Note**: This is a learning project and hasn't been audited. Don't use it with real money on mainnet without a professional security audit.