-- AddColumn: hashedRefreshToken on User
-- Stores bcrypt hash of the refresh token. Raw token is never persisted.
-- Set to NULL on logout to invalidate the session server-side.

ALTER TABLE "User" ADD COLUMN "hashedRefreshToken" TEXT;
