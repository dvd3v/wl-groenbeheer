import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";
import esriId from "@arcgis/core/identity/IdentityManager.js";

const DEFAULT_PORTAL_URL = "https://ws-limburg.maps.arcgis.com";

export class ArcgisAuthService {
  getPortalUrl(): string {
    return import.meta.env.VITE_PORTAL_URL?.trim() || DEFAULT_PORTAL_URL;
  }

  signOut(): void {
    esriId.destroyCredentials();
  }

  register(): void {
    const clientId = import.meta.env.VITE_ARCGIS_CLIENT_ID?.trim();

    if (!clientId) {
      throw new Error(
        "VITE_ARCGIS_CLIENT_ID ontbreekt. Vul je ArcGIS OAuth client id in via .env.local."
      );
    }

    const portalUrl = this.getPortalUrl();
    const oAuthInfo = new OAuthInfo({
      appId: clientId,
      portalUrl,
      popup: false,
      flowType: "authorization-code",
    });

    esriId.registerOAuthInfos([oAuthInfo]);
  }

  async ensureSignedIn(): Promise<void> {
    this.register();
    const portalUrl = this.getPortalUrl();

    try {
      await esriId.checkSignInStatus(`${portalUrl}/sharing`);
    } catch {
      await esriId.getCredential(`${portalUrl}/sharing`);
    }
  }
}

export const arcgisAuthService = new ArcgisAuthService();
