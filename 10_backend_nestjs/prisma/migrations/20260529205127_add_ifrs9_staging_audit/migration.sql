-- CreateTable: Ifrs9StagingAudit
-- Audit trail réglementaire COBAC — immuable après création.
-- Chaque décision de staging IFRS 9 est persistée ici depuis scoring.service.ts.

CREATE TABLE "Ifrs9StagingAudit" (
    "id"              TEXT NOT NULL,
    "stagingId"       TEXT NOT NULL,
    "applicationId"   TEXT,
    "counterpartyId"  TEXT,
    "stage"           "IFRS9Stage" NOT NULL,
    "previousStage"   "IFRS9Stage",
    "sicrTriggered"   BOOLEAN NOT NULL,
    "stagingReasons"  JSONB NOT NULL,
    "pdCurrent"       DOUBLE PRECISION NOT NULL,
    "pdOrigination"   DOUBLE PRECISION NOT NULL,
    "lgdEstimate"     DOUBLE PRECISION NOT NULL,
    "lgdMethod"       TEXT NOT NULL,
    "eadEstimate"     DOUBLE PRECISION NOT NULL,
    "eirUsed"         DOUBLE PRECISION NOT NULL,
    "eclProvision"    DOUBLE PRECISION NOT NULL,
    "eclHorizon"      TEXT NOT NULL,
    "rwaEstimate"     DOUBLE PRECISION,
    "modelVersion"    TEXT NOT NULL,
    "scoredBy"        TEXT NOT NULL,
    "requestId"       TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ifrs9StagingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ifrs9StagingAudit_stagingId_key" ON "Ifrs9StagingAudit"("stagingId");
CREATE INDEX "Ifrs9StagingAudit_applicationId_idx" ON "Ifrs9StagingAudit"("applicationId");
CREATE INDEX "Ifrs9StagingAudit_counterpartyId_idx" ON "Ifrs9StagingAudit"("counterpartyId");
CREATE INDEX "Ifrs9StagingAudit_stage_idx" ON "Ifrs9StagingAudit"("stage");
CREATE INDEX "Ifrs9StagingAudit_createdAt_idx" ON "Ifrs9StagingAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "Ifrs9StagingAudit" ADD CONSTRAINT "Ifrs9StagingAudit_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ifrs9StagingAudit" ADD CONSTRAINT "Ifrs9StagingAudit_counterpartyId_fkey"
    FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
