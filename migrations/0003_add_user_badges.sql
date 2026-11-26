-- Migration number: 0003 	 2026-11-26T09:00:00.000Z
-- Badges: an admin-granted verified check, and a role (user, mod or admin).
-- "Early member" is not stored: it's worked out from sign-up order.
ALTER TABLE user ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'mod', 'admin'));
