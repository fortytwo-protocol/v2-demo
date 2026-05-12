/**
 * Admin / operator chain-ops on FTControllerV2:
 *   - fee management:    setFeeRateOverride, setFeeRateDefault
 *   - whitelist setup:   setWhitelistedCollateral, setWhitelistedCurve
 *   - treasury rotation: setTreasury
 *   - emergency stop:    pauseController, unpauseController
 *
 * Plus generic AccessControl ops, callable against any AC-compliant
 * contract (FTControllerV2, FTAdaptor, etc.):
 *   - grantRole, revokeRole, renounceRole
 *
 * Each is gated by a role on chain — the SDK does not check; callers
 * must already hold it. Single-tx writes; no allowance handling.
 */

import type { Address, Hex, PublicClient } from "viem";
import { FT_CONTROLLER_V2_ABI } from "../abi";
import {
  executeWrite,
  type ExecuteWriteResult,
  type WriteSubmitStrategy,
  type WriteLifecycleCallbacks,
} from "./execute-write";

interface ControllerWriteBase {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export interface SetFeeRateOverrideOptions extends ControllerWriteBase {
  market: Address;
  /** uint80 — basis points (100 = 1%). */
  feeRate: bigint | number;
  /** When false, the contract clears the override and falls back to default. */
  isOverride: boolean;
}

export async function setFeeRateOverride(
  opts: SetFeeRateOverrideOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: opts.publicClient,
    account: opts.account,
    contract: { address: opts.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: {
      functionName: "setFeeRateOverride",
      args: [opts.market, BigInt(opts.feeRate), opts.isOverride],
    },
    submit: opts.submit,
    on: opts.on,
  });
}

export interface SetFeeRateDefaultOptions extends ControllerWriteBase {
  feeRate: bigint | number;
}

export async function setFeeRateDefault(
  opts: SetFeeRateDefaultOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: opts.publicClient,
    account: opts.account,
    contract: { address: opts.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: {
      functionName: "setFeeRateDefault",
      args: [BigInt(opts.feeRate)],
    },
    submit: opts.submit,
    on: opts.on,
  });
}

export interface SetWhitelistedCollateralOptions extends ControllerWriteBase {
  collateral: Address;
  whitelist: boolean;
  /** Minimum collateral that must be supplied as seed when deploying with this token. */
  collateralSeedMin: bigint;
}

export async function setWhitelistedCollateral(
  opts: SetWhitelistedCollateralOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: opts.publicClient,
    account: opts.account,
    contract: { address: opts.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: {
      functionName: "setWhitelistedCollateral",
      args: [opts.collateral, opts.whitelist, opts.collateralSeedMin],
    },
    submit: opts.submit,
    on: opts.on,
  });
}

export interface SetWhitelistedCurveOptions extends ControllerWriteBase {
  curve: Address;
  whitelist: boolean;
}

export async function setWhitelistedCurve(
  opts: SetWhitelistedCurveOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: opts.publicClient,
    account: opts.account,
    contract: { address: opts.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: {
      functionName: "setWhitelistedCurve",
      args: [opts.curve, opts.whitelist],
    },
    submit: opts.submit,
    on: opts.on,
  });
}

export interface SetTreasuryOptions extends ControllerWriteBase {
  treasury: Address;
}

export async function setTreasury(
  opts: SetTreasuryOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: opts.publicClient,
    account: opts.account,
    contract: { address: opts.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "setTreasury", args: [opts.treasury] },
    submit: opts.submit,
    on: opts.on,
  });
}

export async function pauseController(
  opts: ControllerWriteBase,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: opts.publicClient,
    account: opts.account,
    contract: { address: opts.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "pause", args: [] },
    submit: opts.submit,
    on: opts.on,
  });
}

export async function unpauseController(
  opts: ControllerWriteBase,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: opts.publicClient,
    account: opts.account,
    contract: { address: opts.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "unpause", args: [] },
    submit: opts.submit,
    on: opts.on,
  });
}

// ─── AccessControl (generic) ─────────────────────────────────────────
// Any AccessControl-compliant contract — FTControllerV2, FTAdaptor, etc.
// We use FT_CONTROLLER_V2_ABI because it includes the AccessControl
// function signatures (the controller inherits from
// AccessControlDefaultAdminRulesUpgradeable). viem only needs the
// function signatures, not the contract identity.

interface AccessControlWriteBase {
  publicClient: PublicClient;
  account: Address;
  /** Any AccessControl-compliant contract (FTControllerV2, FTAdaptor, etc.). */
  address: Address;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export interface GrantRoleOptions extends AccessControlWriteBase {
  /** bytes32 role identifier (e.g. keccak256("OPERATOR_ROLE")). */
  role: Hex;
  /** Account being granted the role. */
  who: Address;
}

export async function grantRole(
  opts: GrantRoleOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: opts.publicClient,
    account: opts.account,
    contract: { address: opts.address, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "grantRole", args: [opts.role, opts.who] },
    submit: opts.submit,
    on: opts.on,
  });
}

export interface RevokeRoleOptions extends AccessControlWriteBase {
  /** bytes32 role identifier. */
  role: Hex;
  /** Account being revoked. */
  who: Address;
}

export async function revokeRole(
  opts: RevokeRoleOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: opts.publicClient,
    account: opts.account,
    contract: { address: opts.address, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "revokeRole", args: [opts.role, opts.who] },
    submit: opts.submit,
    on: opts.on,
  });
}

export interface RenounceRoleOptions extends AccessControlWriteBase {
  /** bytes32 role identifier. */
  role: Hex;
  /**
   * Account whose role is being renounced. AccessControl requires this
   * to equal `msg.sender` (i.e. `account`); the SDK does not enforce it.
   */
  who: Address;
}

export async function renounceRole(
  opts: RenounceRoleOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: opts.publicClient,
    account: opts.account,
    contract: { address: opts.address, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "renounceRole", args: [opts.role, opts.who] },
    submit: opts.submit,
    on: opts.on,
  });
}
