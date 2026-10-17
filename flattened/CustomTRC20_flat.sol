// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CustomTRC20
/// @notice A simple fixed-supply TRC-20/ERC-20 compatible token for deployment on TRON.
/// @dev The complete initial supply is minted once to the deployer in the constructor.
///      There is intentionally no post-deployment mint function or hidden balance setter.
contract CustomTRC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        uint256 initialWholeTokenSupply
    ) {
        require(bytes(tokenName).length > 0 && bytes(tokenName).length <= 64, "Invalid name");
        require(bytes(tokenSymbol).length > 0 && bytes(tokenSymbol).length <= 16, "Invalid symbol");
        require(keccak256(bytes(tokenSymbol)) != keccak256(bytes("USDT")), "Use a distinct symbol; do not impersonate USDT");
        require(tokenDecimals <= 18, "Decimals must be <= 18");
        require(initialWholeTokenSupply > 0, "Supply must be > 0");

        name = tokenName;
        symbol = tokenSymbol;
        decimals = tokenDecimals;

        uint256 scale = 10 ** uint256(tokenDecimals);
        uint256 initialSupply = initialWholeTokenSupply * scale;
        require(initialSupply / scale == initialWholeTokenSupply, "Supply overflow");

        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        uint256 senderBalance = balanceOf[msg.sender];
        require(senderBalance >= value, "Insufficient balance");

        unchecked {
            balanceOf[msg.sender] = senderBalance - value;
            balanceOf[to] += value;
        }
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        require(spender != address(0), "Approve zero address");
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(from != address(0) && to != address(0), "Zero address");
        uint256 approved = allowance[from][msg.sender];
        require(approved >= value, "Allowance exceeded");
        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= value, "Insufficient balance");

        unchecked {
            allowance[from][msg.sender] = approved - value;
            balanceOf[from] = fromBalance - value;
            balanceOf[to] += value;
        }
        emit Approval(from, msg.sender, allowance[from][msg.sender]);
        emit Transfer(from, to, value);
        return true;
    }
}
