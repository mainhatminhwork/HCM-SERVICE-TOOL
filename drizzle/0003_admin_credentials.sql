CREATE TABLE IF NOT EXISTS admin_credentials (
 id TEXT PRIMARY KEY NOT NULL,
 password_hash TEXT NOT NULL,
 source_version TEXT NOT NULL
);
