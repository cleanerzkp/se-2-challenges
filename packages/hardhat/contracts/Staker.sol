// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;  //Do not change the solidity version as it negativly impacts submission grading

import "hardhat/console.sol";
import "./ExampleExternalContract.sol";

contract Staker {

  ExampleExternalContract public exampleExternalContract;

  constructor(address exampleExternalContractAddress) {
      exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
  }


mapping ( address => uint256 ) public balances;
uint256 public constant threshold = 1 ether;

event Stake(address indexed staker, uint256 amount);

function stake() public payable {
    require(msg.value > 0, "Amount must be greater than 0");
    balances[msg.sender] += msg.value;
    emit Stake(msg.sender, msg.value);
}


  // Collect funds in a payable `stake()` function and track individual `balances` with a mapping:
  // (Make sure to add a `Stake(address,uint256)` event and emit it for the frontend `All Stakings` tab to display)

uint256 public deadline = block.timestamp + 30 seconds;

function execute() public {
    console.log("block.timestamp: %s", block.timestamp);
    console.log("deadline: %s", deadline);

    require(block.timestamp >= deadline, "Deadline not reached");
    require(address(this).balance >= threshold, "Threshold not met");

    exampleExternalContract.complete{value: address(this).balance}();
}

  // After some `deadline` allow anyone to call an `execute()` function
  // If the deadline has passed and the threshold is met, it should call `exampleExternalContract.complete{value: address(this).balance}()`


  // If the `threshold` was not met, allow everyone to call a `withdraw()` function to withdraw their balance


  // Add a `timeLeft()` view function that returns the time left before the deadline for the frontend
function timeLeft() public view returns (uint256) {
  if (block.timestamp >= deadline) {
    return 0;
  }
  return deadline - block.timestamp;
} 

  // Add the `receive()` special function that receives eth and calls stake()

}
