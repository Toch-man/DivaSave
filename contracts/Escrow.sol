// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract Escrow{
    struct Trade{
        address seller;
        address buyer;
        address token;
        uint256 amount;
        bool sellerDeposited;
        bool buyerConfirmed;
        bool completed;
        bool cancelled;
        string description;
    }

    mapping(uint256 => Trade) public trades;
    uint256 public nextTradeId;

    event TradeCreated(uint256 indexed trade_id, address indexed seller, address indexed buyer, uint256 amount);
    event TradeCompleted(uint256 indexed trade_id);
    event TradeCancelled(uint256 indexed trade_id);

    function createTrade(
        address buyer,address token,
         uint256 amount, string 
        memory description) external returns(uint256){
        require(buyer != address(0), "Invalid buyer");
        require(buyer != msg.sender, "Cannot trade with yourself");
        require(amount > 0, "Amount must be > 0");

         uint256 tradeId = nextTradeId++;
        
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);

        require(success,'transaction not successfull');

        trades[tradeId] = Trade({
            seller: msg.sender,
            buyer: buyer,
            token: token,
            amount: amount,
            sellerDeposited: true,
            buyerConfirmed: false,
            completed: false,
            cancelled: false,
            description: description
        });
        
        emit TradeCreated(tradeId, msg.sender, buyer, amount);
        
        return tradeId;
    }

    function confirmTrade(uint256 tradeId) external {
        Trade storage trade = trades[tradeId];
        
        require(msg.sender == trade.buyer, "Only buyer can confirm");
        require(trade.sellerDeposited, "Seller hasn't deposited");
        require(!trade.completed, "Already completed");
        require(!trade.cancelled, "Trade cancelled");
        
        trade.buyerConfirmed = true;
        trade.completed = true;
        
        IERC20(trade.token).transfer(trade.buyer, trade.amount);
        
        emit TradeCompleted(tradeId);
    }

    function cancelTrade (uint256 trade_id) external{
         Trade storage trade = trades[trade_id];
        
        require(msg.sender == trade.seller, "Only seller can cancel");
        require(!trade.buyerConfirmed, "Buyer already confirmed");
        require(!trade.completed, "Already completed");
        require(!trade.cancelled, "Already cancelled");
        
        trade.cancelled = true;
        
        IERC20(trade.token).transfer(trade.seller, trade.amount);
        
        emit TradeCancelled(trade_id);
    }

    function getTrade(uint256 tradeId) external view returns (Trade memory) {
        return trades[tradeId];
    }
}