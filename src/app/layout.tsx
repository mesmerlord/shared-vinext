import "@/styles/globals.css";
import { headers } from "next/headers";
import { Providers } from "./providers";
import { getAuthSession } from "@/server/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "PushPad — The Velocity Board for Indie Software",
    template: "%s — PushPad",
  },
  description:
    "A public leaderboard for indie SaaS, ranked by what shipped this week.",
  applicationName: "PushPad",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
  },
};

// Render every page per request. Otherwise vinext 1.x keeps pages it deems static
// (no dynamic segment, no headers()/searchParams) in isolate memory, never revalidated.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // QUIRK: rebuild Request from headers() to seed initialUser in the client.
  // vinext server contexts hand you headers(), not the raw Request — this is
  // the bridge. See canonical.md Topic 5 / Topic 8.
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("host") ?? "localhost";
  const reqUrl = `${proto}://${host}/api/auth/session`;
  const req = new Request(reqUrl, {
    method: "GET",
    headers: Object.fromEntries(headerList.entries()),
  });
  const session = await getAuthSession(req).catch(() => null);
  const initialUser = session?.user ?? null;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="theme-color" content="#0E0B08" />
      </head>
      <body className="bg-ink font-body text-paper antialiased min-h-screen">
        <Providers initialUser={initialUser}>{children}</Providers>
      </body>
    </html>
  );
}
