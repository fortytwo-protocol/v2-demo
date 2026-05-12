// Hand-maintained union of custom-error entries from the live contracts
// (FTAdaptor, FTControllerV2, FTMarketController, Router/RouterV2,
// Market/MarketV2). Used by decodeContractError to identify reverts when
// the calling ABI doesn't include the error definition (e.g. errors that
// bubble through batch boundaries). When you add a custom error to a
// contract in ft-contracts, append the matching entry here so the
// decode-revert tests catch it.

export const V2_ERROR_ABI = [
  {
    "type": "error",
    "name": "AccessControlBadConfirmation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlEnforcedDefaultAdminDelay",
    "inputs": [
      {
        "name": "schedule",
        "type": "uint48",
        "internalType": "uint48"
      }
    ]
  },
  {
    "type": "error",
    "name": "AccessControlEnforcedDefaultAdminRules",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlInvalidDefaultAdmin",
    "inputs": [
      {
        "name": "defaultAdmin",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "AccessControlUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "neededRole",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "AdaptorMarketDoesNotMatchQuestionId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AdaptorOtAmountsDoesNotMatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FactorySeedCallFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Safe6909TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeCastOverflowedUintDowncast",
    "inputs": [
      {
        "name": "bits",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "FactoryCurveNotAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FactoryInvalidCollateral",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FactoryInvalidCurve",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FactoryInvalidSeedAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FactoryNativeTokenNotAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FactorySeedCostMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidInitialization",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketResolved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotInitializing",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Registry6909MustBeRegisteredMarket",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryCollateralNotWhitelisted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryFeeRateTooHigh",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryInvalidCurve",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryInvalidTimestamp",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryInvalidTokenIdAsCollateral",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryInvalidTreasuryAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryMarketDeploymentFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryMarketNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryOnlyCreator",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryOnlyOracle",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryPaused",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryQuestionNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistrySeedBelowMinimum",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryTokenIdNotCreatedForMarket",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeCastOverflow",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FactoryFeeRateExceedMaximumLimit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FactoryUnsuccessfulMarketDeployment",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryAlreadyFinalised",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryAlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryAnswerDoesNotMatchCurrent",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryDuplicateOutcome",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryEmptyName",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryEmptyTitle",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryEndTimestampBeforeExisting",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryEndTimestampHasPassed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryExceedMaxDescriptionLength",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryExceedMaxNameLength",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryExceedMaxNames",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryExceedMaxTitleLength",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryInsufficientOutcomesGiven",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryInvalidAddressPtr",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryInvalidAnswer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryNotRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistryNotResolved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RegistrySameAnswer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterArrayLengthsMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterDbCViolated",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterNotClaimableYet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterSlippage",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterUnauthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterUnsupportedSelector",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketZeroCostBasis",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterIntegratorFeeTooHigh",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterInvalidIntegrator",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterInvalidMarket",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterInvalidSwapAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterStaticCallFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ERC6909InsufficientAllowance",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "allowance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC6909InsufficientBalance",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC6909InvalidApprover",
    "inputs": [
      {
        "name": "approver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC6909InvalidReceiver",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC6909InvalidSender",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC6909InvalidSpender",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC6909SelfTransfer",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "MarketArrayLengthsMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketEnded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketInvalidTokenId",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "MarketNoClaim",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketNotFinalised",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketNotResolved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketNotStarted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketNotWhole",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketPaused",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketReceiverIsMarket",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketSwapAmountCannotBeZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketSwapPriceInvalidated",
    "inputs": [
      {
        "name": "collateralDelta",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "otDelta",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "MarketTooManyOutcomes",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketUnauthorizedAccess",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "required",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "MarketInsufficientSeedCollateral",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketNoTokenIdsToSeed",
    "inputs": []
  }
] as const;
