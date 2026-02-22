// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


contract Multi_token_vault{
    //user => token => balance
    mapping(address => mapping(address => uint256)) private balances;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);

    //user saves token in vault
    function deposit (address token,uint256 amount) external{
        require(amount > 0,'amount mus be greater than zero');

        //transfer token from user to vault
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);

        require(success,'transaction failed');

        //update balance
        balances[msg.sender][token] += amount;

        emit Deposited(msg.sender, token, amount);
    }

    //user withdraw tokens from vault
    function withdraw (address token, uint256 amount) external {
        require(balances[msg.sender][token] > amount, 'insufficient balance');

        bool success = IERC20(token).transferFrom(address(this), msg.sender, amount);

        require(success, 'transaction failed');

        //update balance
        balances[msg.sender][token] -= amount;

         emit Withdrawn(msg.sender, token, amount);
    }
}