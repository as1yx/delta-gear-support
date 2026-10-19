declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OPENROUTER_API_KEY?: string;
    OPENROUTER_MODEL?: string;
    SUPPORT_CONTACT?: string;
    BOOTSTRAP_OWNER_EMAIL?: string;
  }
}
