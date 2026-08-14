import {
  appLinkResponse,
  createAppleAppSiteAssociation,
} from "@/features/mobile/server-mobile-app-links";

export const dynamic = "force-dynamic";

export function GET() {
  return appLinkResponse(createAppleAppSiteAssociation());
}
