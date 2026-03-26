import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";
import esriId from "@arcgis/core/identity/IdentityManager.js";

const PORTAL_URL =
  import.meta.env.VITE_PORTAL_URL || "https://ws-limburg.maps.arcgis.com";

export async function initAuth(): Promise<void> {
  const clientId = import.meta.env.VITE_ARCGIS_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "VITE_ARCGIS_CLIENT_ID is not set. Copy .env.example to .env.local and fill in your OAuth client ID."
    );
  }

  const oAuthInfo = new OAuthInfo({
    appId: clientId,
    portalUrl: PORTAL_URL,
    popup: false,
    flowType: "authorization-code",
  });

  esriId.registerOAuthInfos([oAuthInfo]);

  try {
    await esriId.checkSignInStatus(`${PORTAL_URL}/sharing`);
  } catch {
    await esriId.getCredential(`${PORTAL_URL}/sharing`);
  }
}

export function getPortalUrl(): string {
  return PORTAL_URL;
}
