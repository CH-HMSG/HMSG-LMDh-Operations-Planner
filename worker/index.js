export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/push" && request.method === "POST") {
      return handlePush(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("ASSETS binding missing", { status: 500 });
  }
};

async function handlePush(request, env) {
  try {
    const body = await request.json();

    if (!body || typeof body.content !== "string") {
      return json({ ok: false, error: "Missing body.content" }, 400);
    }

    const owner = "CH-HMSG";
    const repo = "HMSG-LMDh-Operations-Planner";
    const branch = "main";
    const path = "hmsg_planner_data.json";
    const token = env.GITHUB_TOKEN;

    if (!token) {
      return json({ ok: false, error: "Missing GITHUB_TOKEN secret" }, 500);
    }

    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "hmsg-lmdh-operations-planner"
    };

    const getRes = await fetch(`${apiBase}?ref=${branch}`, {
      headers,
      cache: "no-store"
    });

    let sha;
    if (getRes.status === 200) {
      sha = (await getRes.json()).sha;
    } else if (getRes.status !== 404) {
      return json({ ok: false, error: "GET failed", status: getRes.status }, getRes.status);
    }

    const putRes = await fetch(apiBase, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: body.message || "Update from planner",
        content: toBase64(body.content),
        branch,
        ...(sha ? { sha } : {})
      })
    });

    const text = await putRes.text();
    return new Response(text, {
      status: putRes.status,
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
