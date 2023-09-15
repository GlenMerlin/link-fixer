# link-fixer

A Discord bot, that replaces any Twitter, Instagram, and TikTok links with
embed- and privacy-friendly proxies.

# SQLite Schema
```sql
CREATE TABLE config (
    guild_id VARCHAR PRIMARY KEY,
    embed BOOLEAN NOT NULL,
    delMsg BOOLEAN NOT NULL
);
```