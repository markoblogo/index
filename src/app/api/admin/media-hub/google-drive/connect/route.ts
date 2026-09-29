import { NextResponse } from "next/server";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  createGoogleDriveOAuthState,
  getGoogleDriveAuthorizationUrl,
  getGoogleDriveStateCookieName,
} from "@/lib/media-hub-google-drive";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireDemoRole("admin");
  const { cookieValue, state } = createGoogleDriveOAuthState();
  const response = NextResponse.redirect(getGoogleDriveAuthorizationUrl(state));
  response.cookies.set(getGoogleDriveStateCookieName(), cookieValue, {
    httpOnly: true,
    maxAge: 600,
    path: "/api/admin/media-hub/google-drive",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
