import {
  createModelCatalogPresetAppliers,
  createProviderConnectionPresetAppliers,
} from "openclaw/plugin-sdk/provider-onboard";
import {
  buildDotHooshSeedModels,
  DOTHOOSH_BASE_URL,
  DOTHOOSH_DEFAULT_MODEL_REF,
  DOTHOOSH_PROVIDER_API,
} from "./models.js";

export { DOTHOOSH_DEFAULT_MODEL_REF };

const dotHooshPreset = {
  primaryModelRef: DOTHOOSH_DEFAULT_MODEL_REF,
  resolveParams: () => ({
    providerId: "dothoosh",
    api: DOTHOOSH_PROVIDER_API,
    baseUrl: DOTHOOSH_BASE_URL,
    catalogModels: buildDotHooshSeedModels,
    aliases: [{ modelRef: DOTHOOSH_DEFAULT_MODEL_REF, alias: "DeepSeek V4 Pro" }],
  }),
} satisfies Parameters<typeof createProviderConnectionPresetAppliers<[]>>[0];

export const {
  applyConfig: applyDotHooshConfig,
  applyProviderConfig: applyDotHooshProviderConfig,
} = createModelCatalogPresetAppliers(dotHooshPreset);
export const { applyConfig: applyDotHooshConnectionConfig } =
  createProviderConnectionPresetAppliers(dotHooshPreset);
