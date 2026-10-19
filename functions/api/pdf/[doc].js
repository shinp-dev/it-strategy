const OFFICIAL_PDFS = {
  question: "https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_st_pm1_qs.pdf",
  answer: "https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_st_pm1_ans.pdf",
  comment: "https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_st_pm1_cmnt.pdf",
};

export async function onRequest({ request, params }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const source = OFFICIAL_PDFS[params.doc];
  if (!source) return new Response("Not found", { status: 404 });

  try {
    const upstream = await fetch(source, {
      headers: { Accept: "application/pdf" },
      redirect: "follow",
    });
    if (!upstream.ok) {
      return new Response("IPA PDF could not be fetched", {
        status: upstream.status,
      });
    }

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: 200,
      headers,
    });
  } catch {
    return new Response("IPA PDF could not be fetched", { status: 502 });
  }
}