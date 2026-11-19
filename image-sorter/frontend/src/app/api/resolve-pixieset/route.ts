import { NextRequest, NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function extractCookieHeader(headers: Headers): string {
  const anyHeaders = headers as unknown as { getSetCookie?: () => string[] };
  const rawCookies =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : headers.get("set-cookie")
      ? [headers.get("set-cookie") as string]
      : [];
  return rawCookies
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrl: string = (body?.url || "").trim();
    const email: string = (body?.email || "").trim();
    const password: string = (body?.password || "").trim();

    if (!rawUrl || !rawUrl.toLowerCase().includes("pixieset.com")) {
      return NextResponse.json({ image_urls: [] }, { status: 200 });
    }

    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
    }

    const pageRes = await fetch(rawUrl, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!pageRes.ok) {
      return NextResponse.json({ image_urls: [], upstream_status: pageRes.status }, { status: 200 });
    }

    let cookieHeader = extractCookieHeader(pageRes.headers);
    const html = await pageRes.text();

    const cidMatch = html.match(/'collectionId'\s*:\s*(\d+)/);
    const cukMatch = html.match(/'collectionUrlKey'\s*:\s*['"]([^'"]+)['"]/);
    if (!cidMatch || !cukMatch) {
      return NextResponse.json({ image_urls: [] }, { status: 200 });
    }

    const cid = cidMatch[1];
    const cuk = cukMatch[1];
    const origin = `${parsed.protocol}//${parsed.host}/`;

    // Register visitor email if provided
    if (email) {
      try {
        const emailRes = await fetch(`${origin}client/saveemail/`, {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
            Referer: rawUrl,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: new URLSearchParams({ email, cid, cuk }).toString(),
        });
        const extraCookie = extractCookieHeader(emailRes.headers);
        if (extraCookie) cookieHeader = [cookieHeader, extraCookie].filter(Boolean).join("; ");
      } catch {
        // non-fatal
      }
    }

    // Verify password/PIN if provided
    if (password) {
      try {
        const pwRes = await fetch(`${origin}client/verifypassword/`, {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
            Referer: rawUrl,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: new URLSearchParams({ password, pin: password, cid, cuk }).toString(),
        });
        const extraCookie = extractCookieHeader(pwRes.headers);
        if (extraCookie) cookieHeader = [cookieHeader, extraCookie].filter(Boolean).join("; ");
      } catch {
        // non-fatal
      }
    }

    // Discover gallery slugs
    let slugs: string[] = [];
    const targetParam = parsed.searchParams.get("g");
    if (targetParam) {
      slugs = [targetParam];
    } else {
      const allGalMatch = html.match(/'allGalleries'\s*:\s*(\[\{[\s\S]*?\}\])/);
      if (allGalMatch) {
        try {
          const parsedGals = JSON.parse(allGalMatch[1].replace(/'/g, '"'));
          if (Array.isArray(parsedGals)) {
            slugs = parsedGals.map((g: { slug?: string }) => g.slug).filter(Boolean) as string[];
          }
        } catch {
          // ignore
        }
      }
      if (slugs.length === 0) {
        const curMatch = html.match(/'currentGallery'\s*:\s*['"]([^'"]+)['"]/);
        slugs = curMatch ? [curMatch[1]] : [""];
      }
    }

    const imageUrls: string[] = [];
    const seen = new Set<string>();

    for (const slug of slugs) {
      const qs = new URLSearchParams({
        cuk,
        cid,
        gs: slug,
        page: "0",
        all: "1",
      });
      if (password) {
        qs.set("pin", password);
        qs.set("password", password);
      }
      if (email) {
        qs.set("email", email);
        qs.set("visitor_email", email);
      }

      try {
        const apiRes = await fetch(`${origin}client/loadphotos/?${qs.toString()}`, {
          method: "GET",
          headers: {
            "User-Agent": USER_AGENT,
            Referer: rawUrl,
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json, text/javascript, */*; q=0.01",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
        });
        if (!apiRes.ok) continue;
        const json = await apiRes.json();
        if (json?.status === "success" && json?.content) {
          const photos = JSON.parse(json.content);
          if (Array.isArray(photos)) {
            for (const p of photos) {
              const rawImg: string =
                p.pathXlarge || p.pathXxlarge || p.pathLarge || p.pathMedium || "";
              if (!rawImg) continue;
              const fullUrl = rawImg.startsWith("//")
                ? `https:${rawImg}`
                : rawImg.startsWith("http")
                ? rawImg
                : new URL(rawImg, origin).toString();
              if (!seen.has(fullUrl)) {
                seen.add(fullUrl);
                imageUrls.push(fullUrl);
              }
              if (imageUrls.length >= 5000) break;
            }
          }
        }
      } catch {
        continue;
      }
      if (imageUrls.length >= 5000) break;
    }

    return NextResponse.json({ image_urls: imageUrls, count: imageUrls.length }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to resolve gallery";
    return NextResponse.json({ image_urls: [], error: msg }, { status: 200 });
  }
}
