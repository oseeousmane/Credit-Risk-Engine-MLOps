-- AddColumn: pdAtOrigination on Application
-- IFRS 9 §B5.5.15 — PD at initial recognition (immutable SICR denominator).
-- Nullable so existing rows are unaffected; populated by decisioning service on first scoring.

ALTER TABLE "Application" ADD COLUMN "pdAtOrigination" DOUBLE PRECISION;
