-- =======================================================================================
-- OCTAIX CREDIT RISK ENGINE - DATABASE SECURITY HARDENING
-- =======================================================================================
-- Ce script comble les failles de sécurité de l'audit (Rôle 7 - Security Engineer).
-- 1. Active le Row Level Security (RLS) sur toutes les tables sensibles.
-- 2. Règle les permissions (refus total pour le rôle `anon`).
-- 3. Crée un Trigger d'Audit automatisé pour la table des décisions de scoring.
-- =======================================================================================

-- ───────────────────────────────────────────────────────────────────────────────────────
-- PARTIE 1 : RÉVOCATION DES PRIVILÈGES ANONYMES
-- ───────────────────────────────────────────────────────────────────────────────────────
-- Empêche quiconque possédant la clé publique (anon_key) de Supabase de lire
-- ou d'altérer la base de données (seuls les calls API authentifiés via NestJS sont permis).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- ───────────────────────────────────────────────────────────────────────────────────────
-- PARTIE 2 : ACTIVATION DU ROW LEVEL SECURITY (RLS)
-- ───────────────────────────────────────────────────────────────────────────────────────
-- Par défaut, PostgreSQL autorise la lecture totale si le RLS n'est pas activé.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Counterparty" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Decision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MicroLoanApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MicroLoanDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModelRegistry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModelVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModelMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────────────────────
-- PARTIE 3 : CRÉATION DES POLICIES (POLITIQUES D'ACCÈS)
-- ───────────────────────────────────────────────────────────────────────────────────────
-- Règle Générale : Le Backend Node.js (via le rôle service_role) a un accès complet.
-- Les utilisateurs authentifiés par le front-end n'accèdent qu'à leurs propres données
-- (Filtrage théorique sur tenant_id, ici on exige à minima d'être "authenticated").

-- Pour les Décisions (Scoring) : Seuls les rôles autorisés peuvent lire, personne ne peut supprimer
CREATE POLICY "decision_service_role_all" ON "Decision"
    AS PERMISSIVE FOR ALL TO service_role USING (true);

CREATE POLICY "decision_auth_read" ON "Decision"
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- Interdiction stricte de supprimer une décision de crédit (Immutabilité de l'historique)
CREATE POLICY "decision_no_delete" ON "Decision"
    AS RESTRICTIVE FOR DELETE TO public USING (false);

-- Application RLS similiaire pour les Tiers (Counterparty)
CREATE POLICY "counterparty_service_role_all" ON "Counterparty"
    AS PERMISSIVE FOR ALL TO service_role USING (true);

CREATE POLICY "counterparty_auth_read" ON "Counterparty"
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ───────────────────────────────────────────────────────────────────────────────────────
-- PARTIE 4 : TRIGGER D'AUDIT (AUDIT LOGGING) SUR LE SCORING
-- ───────────────────────────────────────────────────────────────────────────────────────
-- La réglementation bancaire (Bâle III / COBAC) exige que toute décision de crédit 
-- modifiée soit tracée de façon inaltérable.

-- 1. Fonction Trigger pour l'Audit
CREATE OR REPLACE FUNCTION fn_audit_decision_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Capturer l'ancien état (pour UPDATE ou DELETE)
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        old_data = row_to_json(OLD);
    ELSE
        old_data = '{}'::jsonb;
    END IF;

    -- Capturer le nouvel état (pour INSERT ou UPDATE)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        new_data = row_to_json(NEW);
    ELSE
        new_data = '{}'::jsonb;
    END IF;

    -- Si c'est un UPDATE sans réel changement métier, on ignore (optimisation)
    IF (TG_OP = 'UPDATE' AND old_data = new_data) THEN
        RETURN NEW;
    END IF;

    -- Insérer la trace dans la table AuditEvent existante
    INSERT INTO "AuditEvent" (
        "id", 
        "createdAt", 
        "action", 
        "entityType", 
        "entityId", 
        "performedBy", 
        "details"
    )
    VALUES (
        gen_random_uuid(),
        NOW(),
        TG_OP, -- 'INSERT', 'UPDATE', ou 'DELETE'
        'Decision',
        COALESCE(NEW."id", OLD."id"),
        -- On tente de récupérer l'ID de l'utilisateur ayant fait l'action depuis le JWT Supabase
        COALESCE(current_setting('request.jwt.claim.sub', true), 'SYSTEM_OR_SERVICE_ROLE'),
        jsonb_build_object('old', old_data, 'new', new_data)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attachement du Trigger aux tables de scoring
DROP TRIGGER IF EXISTS trg_audit_decision ON "Decision";
CREATE TRIGGER trg_audit_decision
AFTER INSERT OR UPDATE OR DELETE ON "Decision"
FOR EACH ROW EXECUTE FUNCTION fn_audit_decision_changes();

DROP TRIGGER IF EXISTS trg_audit_micro_decision ON "MicroLoanDecision";
CREATE TRIGGER trg_audit_micro_decision
AFTER INSERT OR UPDATE OR DELETE ON "MicroLoanDecision"
FOR EACH ROW EXECUTE FUNCTION fn_audit_decision_changes();

-- =======================================================================================
-- FIN DU SCRIPT DE DURCISSEMENT SÉCURITÉ
-- =======================================================================================
