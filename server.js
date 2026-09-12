import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be an integer between 1 and 65535.");
  process.exit(1);
}

const pages = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/login", "login.html"],
  ["/login.html", "login.html"],
]);

const assets = new Map([
  ["/styles.css", "styles.css"],
  ["/login.js", "login.js"],
]);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function setCommonHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
}

async function sendFile(response, fileName) {
  try {
    const content = await readFile(join(rootDir, fileName));
    setCommonHeaders(response);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(fileName)] || "application/octet-stream",
    });
    response.end(content);
  } catch (error) {
    console.error(`Unable to read ${fileName}:`, error);
    setCommonHeaders(response);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Internal server error");
  }
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
  }

  try {
    return JSON.parse(body || "{}");
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function handleLogin(request, response) {
  try {
    const payload = await readJsonBody(request);
    const username = String(payload.username || "").trim();
    const password = String(payload.password || "");

    if (!username || !password) {
      setCommonHeaders(response);
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(
        JSON.stringify({
          ok: false,
          message: "请输入用户名和密码。",
        }),
      );
      return;
    }

    setCommonHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(
      JSON.stringify({
        ok: true,
        message: `登录成功，${username}。`,
        user: { username },
      }),
    );
  } catch (error) {
    setCommonHeaders(response);
    response.writeHead(error.statusCode || 500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(
      JSON.stringify({
        ok: false,
        message: error.statusCode ? error.message : "服务器内部错误。",
      }),
    );
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && url.pathname === "/healthz") {
    setCommonHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/login") {
    await handleLogin(request, response);
    return;
  }

  if (request.method === "GET") {
    const fileName = pages.get(url.pathname) || assets.get(url.pathname);
    if (fileName) {
      await sendFile(response, fileName);
      return;
    }
  }

  setCommonHeaders(response);
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

function getLanAddresses() {
  const addresses = [];

  for (const interfaces of Object.values(networkInterfaces())) {
    for (const network of interfaces || []) {
      if (network.family === "IPv4" && !network.internal) {
        addresses.push(network.address);
      }
    }
  }

  return [...new Set(addresses)];
}

server.listen(port, host, () => {
  console.log(`Iframe login test is running on http://localhost:${port}`);
  console.log(`Listening on ${host}:${port}`);

  const lanAddresses = getLanAddresses();
  if (lanAddresses.length) {
    console.log("\nLAN access:");
    for (const address of lanAddresses) {
      console.log(`  http://${address}:${port}`);
    }
  } else {
    console.log("\nNo LAN IPv4 address detected. Use http://localhost to test locally.");
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
