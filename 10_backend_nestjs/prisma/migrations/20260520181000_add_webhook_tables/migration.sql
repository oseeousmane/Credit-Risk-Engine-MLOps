-- CreateTable: WebhookSubscription + WebhookDelivery
-- Outbound webhook system for credit decision notifications.

CREATE TABLE "WebhookSubscription" (
    "id"          TEXT NOT NULL,
    "url"         TEXT NOT NULL,
    "secret"      TEXT NOT NULL,
    "events"      TEXT[],
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookDelivery" (
    "id"             TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "event"          TEXT NOT NULL,
    "payload"        JSONB NOT NULL,
    "statusCode"     INTEGER,
    "success"        BOOLEAN NOT NULL,
    "attemptCount"   INTEGER NOT NULL DEFAULT 1,
    "responseBody"   TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WebhookDelivery"
    ADD CONSTRAINT "WebhookDelivery_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId")
    REFERENCES "WebhookSubscription"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
