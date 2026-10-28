-- The portal is used by two people on a private server and no longer asks for a sign-in,
-- so the accounts table is not needed. Who did what is still recorded on every run
-- in runs.dev_user and runs.ops_user.
DROP TABLE IF EXISTS users;
