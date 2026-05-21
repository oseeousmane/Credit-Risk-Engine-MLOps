-- AddColumns: account lockout fields on User
-- failedLoginAttempts: incremented on each bad password, reset on success.
-- lockedUntil: set to NOW() + lockout window when threshold is reached; NULL means unlocked.

ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
