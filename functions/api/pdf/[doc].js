const EXAMS = {
  "2025-spring": ["nl10bi0000009lh8-att", "2025r07h"],
  "2024-spring": ["m42obm000000afqx-att", "2024r06h"],
  "2023-spring": ["ps6vr70000010d6y-att", "2023r05h"],
  "2022-spring": ["gmcbt80000009sgk-att", "2022r04h"],
  "2021-spring": ["gmcbt8000000d5ru-att", "2021r03h"],
  "2019-autumn": ["gmcbt8000000dict-att", "2019r01a"],
  "2018-autumn": ["gmcbt8000000f01f-att", "2018h30a"],
  "2017-autumn": ["gmcbt8000000fqpm-att", "2017h29a"],
  "2016-autumn": ["gmcbt8000000g6fw-att", "2016h28a"],
  "2015-autumn": ["gmcbt8000000gxj0-att", "2015h27a"],
  "2014-autumn": ["ug65p90000000ye5-att", "2014h26a"],
  "2013-autumn": ["ug65p900000027za-att", "2013h25a"],
  "2012-autumn": ["ug65p90000002h5m-att", "2012h24a"],
  "2011-autumn": ["ug65p90000003ojp-att", "2011h23a"],
  "2010-autumn": ["ug65p90000004d6f-att", "2010h22a"],
  "2009-autumn": ["gmcbt8000000f3yi-att", "2009h21a"],
};

const PDF_SUFFIXES = {
  question: "qs",
  answer: "ans",
  comment: "cmnt",
};

export async function onRequest({ request, params }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const exam = EXAMS[new URL(request.url).searchParams.get("year")];
  const suffix = PDF_SUFFIXES[params.doc];
  const source = exam && suffix
    ? `https://www.ipa.go.jp/shiken/mondai-kaiotu/${exam[0]}/${exam[1]}_st_pm1_${suffix}.pdf`
    : null;
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
