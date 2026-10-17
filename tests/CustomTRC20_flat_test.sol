// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

// Run this file with Remix Solidity Unit Testing. It is separate from the
// Node.js source checks used by CI.
import "remix_tests.sol";
import "remix_accounts.sol";
import "../flattened/CustomTRC20_flat.sol";

contract CustomTRC20FlatTest {
    CustomTRC20 private token;
    uint256 private constant RAW_SUPPLY = 1000000000000000000000000;

    function beforeEach() public {
        token = new CustomTRC20("TRC20", "VTRC", 18, 1000000);
    }

    function testMetadataAndInitialSupply() public {
        Assert.equal(token.name(), "TRC20", "Token name must match");
        Assert.equal(token.symbol(), "VTRC", "Token symbol must be distinct from USDT");
        Assert.equal(uint256(token.decimals()), uint256(18), "Decimals must be 18");
        Assert.equal(token.totalSupply(), RAW_SUPPLY, "Raw supply must equal 1e24");
        Assert.equal(token.balanceOf(address(this)), RAW_SUPPLY, "Deployer must receive supply");
    }

    function testTransferUpdatesBothBalances() public {
        address recipient = TestsAccounts.getAccount(2);
        uint256 amount = 2500000000000000000;
        bool success = token.transfer(recipient, amount);
        Assert.ok(success, "Transfer should succeed");
        Assert.equal(token.balanceOf(recipient), amount, "Recipient balance incorrect");
        Assert.equal(token.balanceOf(address(this)), RAW_SUPPLY - amount, "Sender balance incorrect");
        Assert.equal(token.totalSupply(), RAW_SUPPLY, "Transfer must not change total supply");
    }

    function testApproveAndTransferFrom() public {
        address recipient = TestsAccounts.getAccount(3);
        uint256 amount = 1000;
        Assert.ok(token.approve(address(this), amount), "Approval should succeed");
        Assert.equal(token.allowance(address(this), address(this)), amount, "Allowance incorrect");
        Assert.ok(token.transferFrom(address(this), recipient, amount), "transferFrom should succeed");
        Assert.equal(token.balanceOf(recipient), amount, "Recipient should receive approved amount");
        Assert.equal(token.allowance(address(this), address(this)), 0, "Allowance should be consumed");
    }

    function testRejectsUSDTSymbol() public {
        bool rejected = false;
        try new CustomTRC20("Tether", "USDT", 6, 1000000) returns (CustomTRC20 instance) {
            instance;
        } catch {
            rejected = true;
        }
        Assert.ok(rejected, "USDT symbol must be rejected");
    }

    function testRejectsZeroAddressTransfer() public {
        bool rejected = false;
        try token.transfer(address(0), 1) returns (bool) {
            rejected = false;
        } catch {
            rejected = true;
        }
        Assert.ok(rejected, "Transfer to zero address must revert");
    }
}
