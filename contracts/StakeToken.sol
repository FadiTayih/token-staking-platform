// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakeToken
 * @dev ERC20 token that users will stake in the platform
 */
contract StakeToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18; // 1 million tokens
    
    constructor() ERC20("Stake Token", "STK") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 100000 * 10**18); // 100k tokens for initial distribution
    }
    
    /**
     * @dev Mint new tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
    
    /**
     * @dev Faucet function for testnet - users can claim 100 tokens
     */
    mapping(address => uint256) public lastFaucetClaim;
    
    function faucet() public {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + 24 hours,
            "Can only claim once per day"
        );
        require(totalSupply() + 100 * 10**18 <= MAX_SUPPLY, "Max supply exceeded");
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, 100 * 10**18);
    }
}