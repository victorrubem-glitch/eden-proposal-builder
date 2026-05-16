import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 4174);
const adminEmail = process.env.ADMIN_EMAIL || "admin@edencapital.local";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const sessionSecret = process.env.SESSION_SECRET || "dev-secret-change-before-production";
const sessions = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function createSession(email) {
  const id = crypto.randomBytes(32).toString("hex");
  const token = `${id}.${sign(id)}`;
  sessions.set(id, { email, createdAt: Date.now() });
  return token;
}

function getSession(req) {
  const token = parseCookies(req).eden_session;
  if (!token) return null;
  const [id, signature] = token.split(".");
  if (!id || signature !== sign(id)) return null;
  const session = sessions.get(id);
  if (!session) return null;
  return { id, ...session };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function loginPage(error = "") {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Eden Proposal Builder | Login</title>
    <style>
      :root { --brand:#2f3f2f; --line:#dbe3d7; --bg:#eef3ea; --muted:#687267; }
      * { box-sizing: border-box; }
      body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--bg); color:#18211b; font-family:Arial, Helvetica, sans-serif; }
      main { width:min(420px, calc(100vw - 32px)); background:#fff; border:1px solid var(--line); border-radius:10px; padding:28px; box-shadow:0 18px 45px rgba(34,48,34,.12); }
      .brand { display:flex; align-items:center; gap:12px; margin-bottom:28px; }
      .mark { display:grid; place-items:center; width:42px; height:42px; color:#fff; background:var(--brand); font-weight:700; }
      h1 { margin:0; font-size:24px; }
      p { margin:4px 0 0; color:var(--muted); }
      form { display:grid; gap:14px; }
      label { display:grid; gap:6px; color:var(--muted); font-size:13px; font-weight:700; }
      input { height:42px; padding:0 12px; border:1px solid var(--line); border-radius:8px; font:inherit; }
      button { height:44px; border:0; border-radius:8px; background:var(--brand); color:#fff; font:inherit; font-weight:700; cursor:pointer; }
      .error { margin-bottom:16px; padding:12px; color:#7d2424; background:#fff1f1; border:1px solid #e0b9b9; border-radius:8px; }
      .hint { margin-top:18px; font-size:12px; color:var(--muted); line-height:1.45; }
    </style>
  </head>
  <body>
    <main>
      <div class="brand">
        <div class="mark">E</div>
        <div>
          <h1>Eden Proposal Builder</h1>
          <p>Acesso restrito</p>
        </div>
      </div>
      ${error ? `<div class="error">${error}</div>` : ""}
      <form method="post" action="/login">
        <label>E-mail<input name="email" type="email" autocomplete="username" required /></label>
        <label>Senha<input name="password" type="password" autocomplete="current-password" required /></label>
        <button type="submit">Entrar</button>
      </form>
      <div class="hint">A senha deve ser configurada no ambiente de hospedagem antes da publicação.</div>
    </main>
  </body>
</html>`;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(publicDir, requestedPath));

  if (!filePath.startsWith(publicDir)) {
    send(res, 403, "Acesso negado");
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, body, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
  } catch {
    send(res, 404, "Arquivo não encontrado");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/health") {
    send(res, 200, "ok", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (url.pathname === "/login" && req.method === "GET") {
    if (getSession(req)) redirect(res, "/");
    else send(res, 200, loginPage(), { "Content-Type": "text/html; charset=utf-8" });
    return;
  }

  if (url.pathname === "/login" && req.method === "POST") {
    const params = new URLSearchParams(await readBody(req));
    const email = params.get("email") || "";
    const password = params.get("password") || "";

    if (email === adminEmail && password === adminPassword) {
      const token = createSession(email);
      res.writeHead(302, {
        Location: "/",
        "Set-Cookie": `eden_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`,
      });
      res.end();
      return;
    }

    send(res, 401, loginPage("E-mail ou senha inválidos."), { "Content-Type": "text/html; charset=utf-8" });
    return;
  }

  if (url.pathname === "/logout") {
    const token = parseCookies(req).eden_session;
    if (token) sessions.delete(token.split(".")[0]);
    res.writeHead(302, {
      Location: "/login",
      "Set-Cookie": "eden_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
    });
    res.end();
    return;
  }

  if (!getSession(req)) {
    redirect(res, "/login");
    return;
  }

  await serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Eden Proposal Builder running at http://127.0.0.1:${port}`);
});
