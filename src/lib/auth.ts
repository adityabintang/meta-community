import { betterAuth } from "better-auth";
import { toNodeHandler } from "better-auth/node";
import { memoryAdapter } from "@better-auth/memory-adapter";
import { dash } from "@better-auth/infra";

const authDb = {
  user: [],
  session: [],
  account: [],
  verification: [],
};

const authSecret =
  process.env.BETTER_AUTH_SECRET ||
  process.env.VITE_BETTER_AUTH_SECRET ||
  "2I7_aZg2MG8UjFJD85vLDx0fxMJJrYf92ZlkVzk3KCQ";

const authApiKey =
  process.env.BETTER_AUTH_API_KEY || process.env.VITE_BETTER_AUTH_API_KEY;

const appBaseURL =
  process.env.BETTER_AUTH_BASE_URL || "http://localhost:8080";

const trustedOrigins = (
  process.env.BETTER_AUTH_TRUSTED_ORIGINS ||
  "http://localhost:8080,https://laptop.tailed02ff.ts.net"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const deploymentPlatform =
  process.env.BETTER_AUTH_DEPLOYMENT_PLATFORM?.trim().toLowerCase() ||
  "generic";

const configuredIpHeaders = (process.env.BETTER_AUTH_IP_ADDRESS_HEADERS || "")
  .split(",")
  .map((header) => header.trim().toLowerCase())
  .filter(Boolean);

const platformIpHeaders = {
  cloudflare: ["cf-connecting-ip", "x-forwarded-for"],
  vercel: ["x-vercel-forwarded-for", "x-forwarded-for"],
  nginx: ["x-real-ip", "x-forwarded-for"],
  aws: ["x-forwarded-for"],
  generic: ["x-forwarded-for", "x-real-ip"],
};

const ipAddressHeaders =
  configuredIpHeaders.length > 0
    ? configuredIpHeaders
    : (platformIpHeaders[deploymentPlatform] || platformIpHeaders.generic);

const adminEmails = new Set([
  "adityabintang149@gmail.com",
  ...(process.env.BETTER_AUTH_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
]);

export const auth = betterAuth({
  appName: "Meta Community",
  baseURL: appBaseURL,
  basePath: "/api/auth",
  secret: authSecret,
  advanced: {
    ipAddress: {
      ipAddressHeaders,
    },
  },
  trustedOrigins,
  database: memoryAdapter(authDb),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "member",
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const normalizedEmail = user.email?.trim().toLowerCase();
          const resolvedRole =
            normalizedEmail && adminEmails.has(normalizedEmail)
              ? "admin"
              : (user.role ?? "member");

          return {
            data: {
              ...user,
              role: resolvedRole,
            },
          };
        },
      },
    },
  },
  plugins: [
    dash({
      apiKey: authApiKey,
    }),
  ],
});

export const authHandler = toNodeHandler(auth);
export default auth;
