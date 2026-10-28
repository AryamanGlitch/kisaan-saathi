import type { StringKey } from "../i18n/strings.ts";
import type { ClientErrorCode } from "./api.ts";

/** Every error code has a translated message (enforced by the usage test). */
export function errorKey(code: ClientErrorCode): StringKey {
  return `err.${code}` as StringKey;
}
