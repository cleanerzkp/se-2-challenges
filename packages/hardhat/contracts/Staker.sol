// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

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
    uint256 public deadline = block.timestamp + 72 hours;

    // Flag to indicate if users can withdraw their funds
    bool public openForWithdraw = false;

    // Constructor to set the reference to the ExampleExternalContract
    constructor(address exampleExternalContractAddress) {
        exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
    }

    // Modifier to check if ExampleExternalContract is not completed yet
    modifier notCompleted() {
        require(!exampleExternalContract.completed(), "ExampleExternalContract is already completed");
        _;
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
        return deadline - block.timestamp;
    }

    // Execute function to be called after the deadline
    function execute() public notCompleted {
        require(block.timestamp >= deadline, "Deadline not reached");

        if (address(this).balance >= threshold) {
            // Call the complete function on the external contract, passing the balance
            exampleExternalContract.complete{value: address(this).balance}();
        } else {
            // Set the flag to allow withdrawals if the threshold is not met
            openForWithdraw = true;
        }
    }

    // Withdraw function for users to withdraw their balances if the threshold is not met
    function withdraw() public notCompleted {
        require(openForWithdraw, "Withdrawals are not allowed");
        require(block.timestamp >= deadline, "Cannot withdraw before the deadline");

        uint256 userBalance = balances[msg.sender];
        require(userBalance > 0, "No balance to withdraw");

        balances[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: userBalance}("");
        require(success, "Withdrawal failed");
    }

    // Receive function to automatically call stake when ETH is sent to the contract
    receive() external payable {
        stake(); // Call the stake function
    }
}