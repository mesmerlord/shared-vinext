import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { DashboardClient } from "./dashboard-client";

export const metadata = {
  title: "Your bench",
};

/**
 * Server-side auth gate per canonical.md Topic 5: rebuild Request from
 * headers() so getAuthSession can read the cookie. Redirect to /signin if
 * unauth'd.
 */
export default async function DashboardPage() {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("host") ?? "localhost";
  const reqUrl = `${proto}://${host}/api/auth/session`;
  const req = new Request(reqUrl, {
    method: "GET",
    headers: Object.fromEntries(headerList.entries()),
  });

  const session = await getAuthSession(req).catch(() => null);
  if (!session) {
    redirect("/signin?next=" + encodeURIComponent("/dashboard"));
  }
  return <DashboardClient />;
}
