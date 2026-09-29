import { NextResponse } from "next/server";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  exchangeGoogleDriveAuthorizationCode,
  getGoogleDriveStateCookieName,
  isValidGoogleDriveOAuthState,
  saveGoogleDriveRefreshToken,
} from "@/lib/media-hub-google-drive";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireDemoRole("admin");
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const cookieValue = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${getGoogleDriveStateCookieName()}=`))
    ?.slice(getGoogleDriveStateCookieName().length + 1);
  if (!isValidGoogleDriveOAuthState(state, cookieValue ? decodeURIComponent(cookieValue) : undefined)) {
    return NextResponse.json({ error: "Invalid Google OAuth state." }, { status: 400 });
  }
  if (url.searchParams.get("error")) {
    return NextResponse.json({ error: "Google Drive connection was not authorized." }, { status: 400 });
  }
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Google did not return an authorization code." }, { status: 400 });

  try {
    const token = await exchangeGoogleDriveAuthorizationCode(code);
    if (!token.refresh_token) {
      return NextResponse.json({ error: "Google did not return an offline refresh token. Reconnect and approve access." }, { status: 502 });
    }
    await saveGoogleDriveRefreshToken(token.refresh_token);
    const response = NextResponse.redirect("https://spike.1d3x.com/admin?section=context&drive=connected");
    response.cookies.delete(getGoogleDriveStateCookieName());
    return response;
  } catch {
    return NextResponse.json({ error: "Google Drive connection could not be saved." }, { status: 500 });
  }
}
