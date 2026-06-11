"use client";

export * from "./types";

export {
  hydrateAccessToken,
  getAccessToken,
  clearAccessToken,
  getApiBaseUrl
} from "./request";

export { authApiClient } from "./auth";
export { outfitApiClient } from "./outfits";
export { userApiClient } from "./users";
export { boardApiClient } from "./boards";

import { sendRequest, clearAccessToken, getAccessToken, getApiBaseUrl } from "./request";
import { authApiClient } from "./auth";
import { outfitApiClient } from "./outfits";
import { userApiClient } from "./users";
import { boardApiClient } from "./boards";
import { adminApiClient } from "./admin";

export const apiClient = {
  auth: authApiClient,
  outfits: outfitApiClient,
  users: userApiClient,
  boards: boardApiClient,
  admin: adminApiClient,
  request: sendRequest,
  clearAccessToken,
  getAccessToken,
  getApiBaseUrl
};
