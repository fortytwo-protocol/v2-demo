// Translate the Deploy form's structured ancillary fields into the
// canonical hex envelope the contract expects, using the SDK's
// `buildAncillaryJson` builder.

import { stringToHex, type Hex } from "viem";
import { buildAncillaryJson } from "@ft/sdk/ancillary";

export interface AncillaryFormValues {
  description: string;
  isEarlyResolution: boolean;
}

export function encodeAncillary(values: AncillaryFormValues): Hex {
  const json = buildAncillaryJson({
    description: values.description,
    isEarlyResolution: values.isEarlyResolution,
  });
  return stringToHex(json);
}
