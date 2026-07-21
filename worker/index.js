export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/push' && request.method === 'POST') {
      const { owner, repo, branch, path, token } = env;
      const body = await request.json();
      const content = body.content;
      const message = body.message || 'Update from planner';

      const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      };

      const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, {
        headers,
        cache: 'no-store'
      });

      let sha;
      if (getRes.status === 200) {
        const getJson = await getRes.json();
        sha = getJson.sha;
      }

      const putRes = await fetch(apiBase, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message,
          content,
          branch,
          ...(sha ? { sha } : {})
        })
      });

      return new Response(await putRes.text(), {
        status: putRes.status,
        headers: {
          'content-type': putRes.headers.get('content-type') || 'text/plain'
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
