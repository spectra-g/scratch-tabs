import { contextRules } from "./contextRules";
import { credentialUrlRules } from "./credentialUrlRules";
import { jwtRules } from "./jwtRules";
import { privateKeyRules } from "./privateKeyRules";
import { providerRules } from "./providerRules";

export const secretRules = [
  ...privateKeyRules,
  ...providerRules,
  ...credentialUrlRules,
  ...jwtRules,
  ...contextRules,
];

export { contextRules, credentialUrlRules, jwtRules, privateKeyRules, providerRules };
