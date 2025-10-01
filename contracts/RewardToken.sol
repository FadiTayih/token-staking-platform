// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RewardToken
 * @dev ERC20 token distributed as staking rewards
 */
contract RewardToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 10000000 * 10**18; // 10 million tokens
    mapping(address => bool) public minters;
    
    constructor() ERC20("Reward Token", "RWD") Ownable(msg.sender) {
        // Mint initial supply for rewards pool
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens for rewards
    }
    
    modifier onlyMinter() {
        require(minters[msg.sender] || owner() == msg.sender, "Not a minter");
        _;
    }
    
    /**
     * @dev Set minter status for an address
     * @param minter Address to set minter status for
     * @param status Whether the address should be a minter
     */
    function setMinter(address minter, bool status) public onlyOwner {
        minters[minter] = status;
    }
    
    /**
     * @dev Mint new tokens (only minters or owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyMinter {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
}