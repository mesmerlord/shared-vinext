import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { UpdateClient } from "./update-client";

export const metadata = { title: "Post weekly update" };

export default async function UpdatePage({
  params,
}: {
  params: { slug: string };
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
  if (!session) {
    redirect(
      `/signin?next=${encodeURIComponent(`/dashboard/${params.slug}/update`)}`,
    );
  }
  return <UpdateClient slug={params.slug} />;
}
