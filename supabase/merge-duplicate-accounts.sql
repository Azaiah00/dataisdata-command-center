-- =============================================================================
-- MERGE DUPLICATE ACCOUNTS
-- Combines accounts that have the same name into a single record.
-- Keeps the account that has primary_focus set (or the oldest if none do),
-- moves all engagements, contacts, opportunities, activities, and links to it,
-- then deletes the duplicate account rows.
--
-- How to run: Supabase Dashboard → SQL Editor → New query → paste this file → Run
-- =============================================================================

DO $$
DECLARE
  dup RECORD;
  keeper_id UUID;
  dup_id UUID;
  i INT;
BEGIN
  -- For each account name that appears more than once
  FOR dup IN
    SELECT
      name,
      array_agg(id ORDER BY
        (CASE WHEN primary_focus IS NOT NULL AND trim(primary_focus) != '' THEN 0 ELSE 1 END),
        created_at
      ) AS id_list
    FROM accounts
    GROUP BY name
    HAVING count(*) > 1
  LOOP
    keeper_id := dup.id_list[1];

    -- Merge each duplicate into the keeper (skip first element, that's the keeper)
    FOR i IN 2..array_length(dup.id_list, 1) LOOP
      dup_id := dup.id_list[i];

      -- Point all related rows to the keeper account
      UPDATE contacts SET account_id = keeper_id WHERE account_id = dup_id;
      UPDATE engagements SET account_id = keeper_id WHERE account_id = dup_id;
      UPDATE opportunities SET account_id = keeper_id WHERE account_id = dup_id;
      UPDATE activities SET account_id = keeper_id WHERE account_id = dup_id;

      -- Any account that had this duplicate as parent now points to keeper
      UPDATE accounts SET parent_account_id = keeper_id WHERE parent_account_id = dup_id;

      -- Move account_contacts links to keeper (may create duplicate (keeper, contact_id) rows)
      UPDATE account_contacts SET account_id = keeper_id WHERE account_id = dup_id;

      -- Remove duplicate (account_id, contact_id) rows for keeper, keeping one per contact
      DELETE FROM account_contacts a
      USING account_contacts b
      WHERE a.account_id = b.account_id
        AND a.contact_id = b.contact_id
        AND a.ctid < b.ctid
        AND a.account_id = keeper_id;

      -- Clear parent on the duplicate so we can delete it safely
      UPDATE accounts SET parent_account_id = NULL WHERE id = dup_id;

      -- Delete the duplicate account row
      DELETE FROM accounts WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;
