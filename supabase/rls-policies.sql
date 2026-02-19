-- Run this in Supabase SQL Editor if you get empty data or "Error fetching..."
-- It allows the anon (public) key to read/write all tables (no-auth internal app).

-- Core tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on accounts" ON accounts FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on contacts" ON contacts FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on engagements" ON engagements FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on opportunities" ON opportunities FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on activities" ON activities FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on partners" ON partners FOR ALL TO anon USING (true) WITH CHECK (true);

-- Junction tables
ALTER TABLE engagement_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on engagement_contacts" ON engagement_contacts FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE engagement_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on engagement_partners" ON engagement_partners FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE opportunity_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on opportunity_partners" ON opportunity_partners FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE activity_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on activity_contacts" ON activity_contacts FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE account_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on account_contacts" ON account_contacts FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on contractors" ON contractors FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE engagement_contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all on engagement_contractors" ON engagement_contractors FOR ALL TO anon USING (true) WITH CHECK (true);
