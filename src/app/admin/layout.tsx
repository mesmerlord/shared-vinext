import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthSession } from "@/server/auth";

/**
 * Server-side admin gate per canonical.md Topic 5. Reconstructs the request
 * URL from the incoming headers so getAuthSession can pull cookies.
 */
export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("host") ?? "localhost";
  const reqUrl = `${proto}://${host}/api/auth/session`;
  const req = new Request(reqUrl, {
    method: "GET",
    headers: Object.fromEntries(headerList.entries()),
  });

  const session = await getAuthSession(req).catch(() => null);
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  return <>{children}</>;
}
