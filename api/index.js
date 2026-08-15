import handleRequest, { ensureDbInitialized } from "../server/auth-server.mjs";

export default async function handler(req, res) {
  await ensureDbInitialized();
  return handleRequest(req, res);
}
