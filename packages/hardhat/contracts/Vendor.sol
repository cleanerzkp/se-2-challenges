pragma solidity 0.8.4; //Do not change the solidity version as it negativly impacts submission grading
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./YourToken.sol";

contract Vendor is Ownable {
    YourToken public yourToken;

    uint256 public constant tokensPerEth = 100; // Price of tokens per ETH

    event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);

    constructor(address tokenAddress) {
        yourToken = YourToken(tokenAddress);
    }

    function buyTokens() public payable {
        require(msg.value > 0, "Vendor: Send some ETH to buy tokens"); // Ensure some ETH is sent

        uint256 tokensToBuy = msg.value * tokensPerEth; // Calculate tokens to buy
        require(
            yourToken.balanceOf(address(this)) >= tokensToBuy,
            "Vendor: Not enough tokens in the contract" // Ensure enough tokens
        );

        yourToken.transfer(msg.sender, tokensToBuy); // Transfer tokens to buyer

        emit BuyTokens(msg.sender, msg.value, tokensToBuy); // Emit event
    }
}

  // ToDo: create a withdraw() function that lets the owner withdraw ETH

  // ToDo: create a sellTokens(uint256 _amount) function:

