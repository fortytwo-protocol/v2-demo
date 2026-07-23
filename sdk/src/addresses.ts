// Hand-maintained address book mirroring ft-contracts/deployments/.
// When a contract redeploys, update the relevant network block here.
//
// Curves are arrays of { addy, ...params } objects so callers that
// need curve parameters (cost calculations, etc.) can access them.
// For just the address: bscMainnet.PowerCurve[0].addy.
//
// Each network is a partial map — Base only has V1 contracts deployed,
// BSC has the full V2 surface. Callers that need a contract not present
// on the chosen network will get `undefined` and must handle it.

import type { Address } from "viem";

/**
 * One curve deployment. Curves carry their own parameters so the
 * deployment file is the source of truth for both addresses and curve
 * config.
 */
export interface CurveDeployment {
  addy: Address;
  [param: string]: unknown;
}

export interface FtNetworkInfo {
  chainId: number;
  treasury?: Address;
  devAdmin?: Address;
  [extra: string]: unknown;
}

export interface FtDeployment {
  network: FtNetworkInfo;
  FTRouter?: Address;
  FTMarketController?: Address;
  FTLens?: Address;
  FTLensV2?: Address;
  FTAdaptor?: Address;
  FTControllerProxy?: Address;
  FTControllerV2_impl?: Address;
  FTRouterProxy?: Address;
  FTRouterV2_impl?: Address;
  FTDisputeRegistry?: Address;
  FTTimelockController?: Address;
  ClockCurve?: CurveDeployment[];
  PowerLDACurveV2?: CurveDeployment[];
  ProxyAdmin_FTControllerProxy?: Address;
  ProxyAdmin_FTRouterProxy?: Address;
  /** Testnet stable collateral (BSC UAT). */
  FTUSD?: Address;
  /** Base testnet stable collateral. */
  FTUSDC?: Address;
}

export const bscMainnet: FtDeployment = {
  network: {
    chainId: 56,
    treasury: "0xc60E3415648684b1D0D0D97e85CB21E6a2bCb620",
    devAdmin: "0x6aCF858336830954Dd81b67C0b80b163e27b2E91",
  },
  FTRouter: "0x88888888338e60bfB4657187169cFFa5c8640E42",
  FTMarketController: "0xF21b2D4F8989b27f732e369907F25f0E8D95Fe62",
  FTLens: "0x9a9846037238599b10f60a59C2607a8c3159E827",
  ClockCurve: [
    {
      addy: "0x495B31876c092c236d1b0Df5Cc953D45d41301F1",
      kink: 0,
      start: "1000000000000000000",
      timePremiumMax: 250000000000,
      timePremiumMin: 100000000000,
    },
    {
      addy: "0x6E67193CDdb83cEeA17d9b4D218E54E6258635d9",
      kink: 0,
      start: "1000000000000000000",
      timePremiumMax: 150000000000,
      timePremiumMin: 100000000000,
    },
  ],
  PowerLDACurveV2: [
    {
      addy: "0x0Ae9D39739FA1FA43da3b444a0CCc91D057F4813",
      c1: "750000000000000000",
      c2: "2000000000000000000000000",
      lsRoot: "3912023005428146176",
      phiDeltaMax: "4000000000000000000",
      rateBaseMax: "900000000000000000",
      rateBaseMin: "1000000000000000",
      start: "8888888888888888888",
      tick: "10000000000000000",
      timeKinkEnd: "1000000000000000000",
      timeKinkStart: "950000000000000000",
      windowFixed: 20,
    },
    {
      addy: "0xa0076e85425e06b9b3F452B399f40FF82B8CfF36",
      c1: "750000000000000000",
      c2: "2000000000000000000000000",
      lsRoot: "3912023005428146176",
      phiDeltaMax: "4000000000000000000",
      rateBaseMax: "900000000000000000",
      rateBaseMin: "1000000000000000",
      start: "8888888888888888888",
      tick: "10000000000000000",
      timeKinkEnd: "1000000000000000000",
      timeKinkStart: "900000000000000000",
      windowFixed: 20,
    },
    {
      addy: "0x77Fe0bB0B28C53c01D2C27e5218F71fb1E30Eb42",
      c1: "750000000000000000",
      c2: "2000000000000000000000000",
      lsRoot: "3912023005428146176",
      phiDeltaMax: "4000000000000000000",
      rateBaseMax: "900000000000000000",
      rateBaseMin: "1000000000000000",
      start: "8888888888888888888",
      tick: "10000000000000000",
      timeKinkEnd: "1000000000000000000",
      timeKinkStart: "800000000000000000",
      windowFixed: 20,
    },
    {
      addy: "0xB9f661e60Ef67FE4214C8D968e771Ef02F843A85",
      c1: "750000000000000000",
      c2: "2000000000000000000000000",
      lsRoot: "3912023005428146176",
      phiDeltaMax: "4000000000000000000",
      rateBaseMax: "900000000000000000",
      rateBaseMin: "1000000000000000",
      start: "8888888888888888888",
      tick: "10000000000000000",
      timeKinkEnd: "1000000000000000000",
      timeKinkStart: "700000000000000000",
      windowFixed: 20,
    },
  ],
  FTTimelockController: "0xca1Fc619bd149ed035E1AEB2074f211567434fDD",
  FTControllerProxy: "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072",
  FTControllerV2_impl: "0x067E0F152bD6062C5470320Ef05B45090B53e9fF",
  ProxyAdmin_FTControllerProxy: "0x0D8566c77a4B603De6101816321A77142149436F",
  FTRouterProxy: "0x888888886619275d33c00D3BC62DF94D700DCD42",
  FTRouterV2_impl: "0x369b9C02d655E0A04931C412e641a7B040FAD1Cf",
  ProxyAdmin_FTRouterProxy: "0xfDd714152b69B17Bb70317565Bad23F6d82f335f",
  FTAdaptor: "0xC07Edb0d2C998267fB8472CB48A2398ee7ACC183",
  FTDisputeRegistry: "0x1bac7B699879383C35945B5A1b3E794D9829B7e3",
  FTLensV2: "0x25F1625255bf85Bc9cb748F3f9197876aA37996c",
};

export const bscUat: FtDeployment = {
  network: {
    chainId: 56,
    treasury: "0xb9993E33F964d09997C8De465a18848Ab89869dD",
    devAdmin: "0xb9993E33F964d09997C8De465a18848Ab89869dD",
  },
  FTUSD: "0x61553e2c0373F6767977cACE65719006197C18ce",
  FTRouter: "0x88888888c2370bD0baC8f9e9F5aE962f835F8f83",
  FTMarketController: "0x4dc9823282453a2cBef7e6eaFB28caD8E5c269b3",
  FTLens: "0x9a9846037238599b10f60a59C2607a8c3159E827",
  ClockCurve: [
    {
      addy: "0x495B31876c092c236d1b0Df5Cc953D45d41301F1",
      kink: 0,
      start: "1000000000000000000",
      timePremiumMax: 250000000000,
      timePremiumMin: 100000000000,
    },
    {
      addy: "0x6E67193CDdb83cEeA17d9b4D218E54E6258635d9",
      kink: 0,
      start: "1000000000000000000",
      timePremiumMax: 150000000000,
      timePremiumMin: 100000000000,
    },
  ],
  PowerLDACurveV2: [
    {
      addy: "0x0Ae9D39739FA1FA43da3b444a0CCc91D057F4813",
      c1: "750000000000000000",
      c2: "2000000000000000000000000",
      lsRoot: "3912023005428146176",
      phiDeltaMax: "4000000000000000000",
      rateBaseMax: "900000000000000000",
      rateBaseMin: "1000000000000000",
      start: "8888888888888888888",
      tick: "10000000000000000",
      timeKinkEnd: "1000000000000000000",
      timeKinkStart: "950000000000000000",
      windowFixed: 20,
    },
    {
      addy: "0xa0076e85425e06b9b3F452B399f40FF82B8CfF36",
      c1: "750000000000000000",
      c2: "2000000000000000000000000",
      lsRoot: "3912023005428146176",
      phiDeltaMax: "4000000000000000000",
      rateBaseMax: "900000000000000000",
      rateBaseMin: "1000000000000000",
      start: "8888888888888888888",
      tick: "10000000000000000",
      timeKinkEnd: "1000000000000000000",
      timeKinkStart: "900000000000000000",
      windowFixed: 20,
    },
    {
      addy: "0x77Fe0bB0B28C53c01D2C27e5218F71fb1E30Eb42",
      c1: "750000000000000000",
      c2: "2000000000000000000000000",
      lsRoot: "3912023005428146176",
      phiDeltaMax: "4000000000000000000",
      rateBaseMax: "900000000000000000",
      rateBaseMin: "1000000000000000",
      start: "8888888888888888888",
      tick: "10000000000000000",
      timeKinkEnd: "1000000000000000000",
      timeKinkStart: "800000000000000000",
      windowFixed: 20,
    },
    {
      addy: "0xB9f661e60Ef67FE4214C8D968e771Ef02F843A85",
      c1: "750000000000000000",
      c2: "2000000000000000000000000",
      lsRoot: "3912023005428146176",
      phiDeltaMax: "4000000000000000000",
      rateBaseMax: "900000000000000000",
      rateBaseMin: "1000000000000000",
      start: "8888888888888888888",
      tick: "10000000000000000",
      timeKinkEnd: "1000000000000000000",
      timeKinkStart: "700000000000000000",
      windowFixed: 20,
    },
  ],
  FTTimelockController: "0xc49dE3EA446CF6B4966AAA1A0A799289d2Da5ab3",
  FTControllerProxy: "0xA2098a07F12A788000465743aa9F5aCc76A036a7",
  FTControllerV2_impl: "0x46F83d8FC2F052077b8088acf47BfCaFB7980934",
  ProxyAdmin_FTControllerProxy: "0x8eb2423Eed34296686a60666e7695aABD40638ff",
  FTRouterProxy: "0xaa2dFc5aa2c140DC9246094A914e6D86ecE2eaaa",
  FTRouterV2_impl: "0x74258466E8B951D3A7653ebeb9E480648d5BF16e",
  ProxyAdmin_FTRouterProxy: "0xBf776347070E842b68111f34e2999e302A0F3310",
  FTAdaptor: "0xdd4c2690266Ed697a3ab1d11BF9DBbBCCe64AfC7",
  FTDisputeRegistry: "0x9428A776084cB230142025d3bC948e59EbBB46c7",
  FTLensV2: "0x25F1625255bf85Bc9cb748F3f9197876aA37996c",
};

export const baseUat: FtDeployment = {
  network: {
    chainId: 8453,
    treasury: "0x34EFA15FfB73e5c164d2970c82A6a0cC8Ea62db4",
    devAdmin: "0xb9993E33F964d09997C8De465a18848Ab89869dD",
  },
  FTMarketController: "0xae0835718fa7486C26Db62B802aC79e9BB12fC1B",
  FTRouter: "0xe13E9C5d0859021d5F57b5a1bD04D4F125809601",
  FTUSDC: "0xbC85a39CD4B5012d2c4486cc13BE97313f6a8Af4",
};

export const networks = { bscMainnet, bscUat, baseUat } as const;

export type NetworkName = keyof typeof networks;

/** Pick a deployment by network name. */
export function getFtAddresses(network: NetworkName): FtDeployment {
  return networks[network];
}

// External addresses — third-party tokens not in ft-contracts deployments.
// Hand-coded; verify against a block explorer if these ever need to change.
export const externalAddresses = {
  /** BSC mainnet Tether (USDT). */
  bscMainnetUsdt: "0x55d398326f99059fF775485246999027B3197955" as Address,
};
