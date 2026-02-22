// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract SavingsPlan{
    struct Savings{
         uint256 amount;
        uint256 unlockTime;
        address token;
        bool withdrawn;
        string goalName;
    }

    mapping(address => Savings[]) public userSavings;

    event Saving_created( address indexed user, uint256 amount,uint256 lock_days, string goalName);
    event Saving_withdrawn(address indexed user, uint256 amount);

    function create_saving(uint256 amount, address token, uint256 lock_days, string memory goalName)external{
        require(amount > 0, 'amount must be greater than 0');
        require(lock_days >= 3, 'lock time must be greater than 3');

        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);

        require(success, 'transaction not succesful');

        userSavings[msg.sender].push(Savings{
            amount:amount,
            unlockTime:block.timestamp + (lock_days * 1 days),
            token:token,
            withdrawn:false,
            goalName: goalName
        });

        emit Saving_created(msg.sender,amount,lock_days,goalName);
    }

    function withdraw_saving (uint256 saving_id) external{
        require(userSavings[msg.sender].length >saving_id , 'invalid saving id');
        Savings storage plan = userSavings[msg.sender][saving_id];

        require(!plan.withdrawn, 'Already withdrawn');
        require(block.timestamp >= plan.unlockTime ,"withdrawal period hasn't reached");

        bool success = IERC20(plan.token).transfer( msg.sender, plan.amount);

        if(success){
            plan.withdrawn = true;
        };

        require(success, 'Withdrawal not succesful');

        emit Saving_withdrawn(msg.sender, plan.amount);
    }

    function get_user_saving(address user)external view returns(Savings[] memory){
        return userSavings[user];
    }

    function getTimeUntilUnlock(address user, uint256 savingsId) external view returns (uint256) {
        require(savingsId < userSavings[user].length, "Invalid savings ID");
        
        Savings memory saving = userSavings[user][savingsId];
        
        if (block.timestamp >= saving.unlockTime) {
            return 0;
        }
        
        return saving.unlockTime - block.timestamp;
    }
}