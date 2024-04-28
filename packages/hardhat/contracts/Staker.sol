// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;  //Do not change the solidity version as it negativly impacts submission grading

import "hardhat/console.sol";
import "./ExampleExternalContract.sol";

contract Staker {
    // Reference to the external contract that will be completed if the threshold is met
    ExampleExternalContract public exampleExternalContract;

    // Mapping to keep track of individual staker balances
    mapping(address => uint256) public balances;

    // Threshold for the total balance required to trigger completion
    uint256 public constant threshold = 1 ether;

    // Event to signal when a stake occurs
    event Stake(address indexed staker, uint256 amount);

    // Deadline for the staking period
    uint256 public deadline = block.timestamp + 30 seconds;

    // Constructor to set the reference to the ExampleExternalContract
    constructor(address exampleExternalContractAddress) {
        exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
    }

    // Stake function to collect ETH and update the individual balances mapping
    function stake() public payable {
        require(msg.value > 0, "Amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Stake(msg.sender, msg.value); // Emit the Stake event
    }

    // Function to get the remaining time before the deadline
    function timeLeft() public view returns (uint256) {
        if (block.timestamp >= deadline) {
            return 0; // Deadline has passed
        }
        return deadline - block.timestamp; // Time remaining
    }

    // Execute function to be called after the deadline
    function execute() public {
        require(block.timestamp >= deadline, "Deadline not reached");
        require(address(this).balance >= threshold, "Threshold not met");

        // Call the complete function on the external contract, passing the balance
        exampleExternalContract.complete{value: address(this).balance}();
    }

    // Withdraw function for users to withdraw their balances if the threshold is not met
    function withdraw() public {
        require(block.timestamp >= deadline, "Cannot withdraw before the deadline");
        require(address(this).balance < threshold, "Threshold has been met");

        uint256 userBalance = balances[msg.sender];
        require(userBalance > 0, "No balance to withdraw");

        // Reset the user's balance
        balances[msg.sender] = 0;

        // Send the balance back to the user
        (bool success, ) = msg.sender.call{value: userBalance}("");
        require(success, "Withdrawal failed");
    }

    // Receive function to automatically call stake when ETH is sent to the contract
    receive() external payable {
        stake(); // Call the stake function
    }
}
// contract Staker {

//   ExampleExternalContract public exampleExternalContract;

//   constructor(address exampleExternalContractAddress) {
//       exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
//   }


// mapping ( address => uint256 ) public balances;
// uint256 public constant threshold = 1 ether;

// event Stake(address indexed staker, uint256 amount);

// function stake() public payable {
//     require(msg.value > 0, "Amount must be greater than 0");
//     balances[msg.sender] += msg.value;
//     emit Stake(msg.sender, msg.value);
// }


//   // Collect funds in a payable `stake()` function and track individual `balances` with a mapping:
//   // (Make sure to add a `Stake(address,uint256)` event and emit it for the frontend `All Stakings` tab to display)

// uint256 public deadline = block.timestamp + 30 seconds;

// function execute() public {

//     require(block.timestamp >= deadline, "Deadline not reached");
//     require(address(this).balance >= threshold, "Threshold not met");

//     exampleExternalContract.complete{value: address(this).balance}();
// }

//   // After some `deadline` allow anyone to call an `execute()` function
//   // If the deadline has passed and the threshold is met, it should call `exampleExternalContract.complete{value: address(this).balance}()`


//   // If the `threshold` was not met, allow everyone to call a `withdraw()` function to withdraw their balance


//   // Add a `timeLeft()` view function that returns the time left before the deadline for the frontend
// function timeLeft() public view returns (uint256) {
//   if (block.timestamp >= deadline) {
//     return 0;
//   }
//   return deadline - block.timestamp;
// } 

// receive() external payable {
//   stake();
// }
//   // Add the `receive()` special function that receives eth and calls stake()

// }
