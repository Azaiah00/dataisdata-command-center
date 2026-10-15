/**
 * Sample records for trying the Vendor & Event Module (all fictional, all
 * flagged is_sample = true so "Remove sample data" deletes exactly these).
 */
import { supabase } from "@/lib/supabase";
import { newInviteToken } from "./data";
import { weightedScore, type CriteriaScores } from "./constants";

const day = 864e5;
const ago = (n: number) => new Date(Date.now() - n * day).toISOString();
const dateIn = (n: number) => new Date(Date.now() + n * day).toISOString().slice(0, 10);
const sc = (a: number[]): CriteriaScores => ({
  public_sector_experience: a[0],
  financial_stability: a[1],
  strategic_fit: a[2],
  innovation_value: a[3],
  compliance_security: a[4],
  ecosystem_complement: a[5],
});

type V = {
  company: string; contact: string; title: string; email: string; website: string; category: string; states: string; description: string; interests: string[];
  stage: "unscreened" | "invited" | "pending" | "decided"; created: number;
  app?: Record<string, unknown>; scores?: CriteriaScores; decision?: string; notes?: string;
};

const VENDORS: V[] = [
  { company: "Ridgeline Cyber Labs", contact: "Marcus Hale", title: "Founder & CEO", email: "marcus@ridgelinecyber.example", website: "ridgelinecyber.example", category: "Cyber", states: "Virginia, Maryland, North Carolina", description: "Managed detection and response built for small and mid-size local governments: 24/7 monitoring, tabletop exercises and incident response retainers.", interests: ["Vendor Showcase Events", "Prime/Sub Opportunities"], stage: "unscreened", created: 0.15 },
  { company: "Civic Signal AI", contact: "Priya Natarajan", title: "Head of Partnerships", email: "priya@civicsignal.example", website: "civicsignal.example", category: "AI", states: "Virginia, DC", description: "An AI assistant that answers resident questions from a city’s own ordinances, service catalog and 311 data, with hand-off to staff.", interests: ["Innovation Pilot", "Vendor Showcase Events"], stage: "unscreened", created: 1.4 },
  { company: "Harborline Fiber Partners", contact: "Darnell Brooks", title: "VP, Public Sector", email: "dbrooks@harborline.example", website: "harborline.example", category: "Broadband", states: "Virginia", description: "Middle-mile and last-mile fiber design, BEAD application support and open-access network operations.", interests: ["Strategic Partnership", "Prime/Sub Opportunities"], stage: "invited", created: 6 },
  {
    company: "Tidewater GovTech Collective", contact: "Alicia Moreno", title: "Managing Director", email: "alicia@tidewatergov.example", website: "tidewatergov.example", category: "GovTech & Data", states: "Virginia, Maryland", description: "Permitting, licensing and inspections software with a public open-data portal.", interests: ["Vendor Showcase Events", "Innovation Pilot"], stage: "pending", created: 12,
    app: { years_in_business: 9, legal_structure: "LLC", certifications: ["SWaM", "Woman-Owned"], insurance_coverage: "General liability $2M, cyber liability $5M", contract_vehicles: "Cooperative purchasing through a regional council", public_sector_references: "Three Virginia localities (permitting modernization, 2022–2025)", core_offerings: "Permitting and licensing software, open data portal, implementation", problem_solved: "Paper and email permitting that takes weeks and frustrates residents and contractors.", existing_gov_clients: "7 localities in Virginia and Maryland", differentiator: "City staff change workflows without a developer; typical go-live in 90 days.", technology_stack: "Cloud-hosted, REST APIs", integration_capabilities: "Esri ArcGIS, Microsoft 365", annual_revenue_range: "$2M–$5M", growth_pct: 38, cost_reduction_explanation: "Cuts permit processing time and staff hours, and replaces three older tools in a typical town.", strategic_alignment: "GovTech & Data with a cyber baseline.", open_to_revenue_share: true, compliance_standards: "SOC 2, NIST", data_handling_practices: "U.S.-hosted, customer-owned data, annual penetration test." },
  },
  {
    company: "Keystone Resilience Group", contact: "Thomas Wright", title: "Principal", email: "twright@keystoneres.example", website: "keystoneres.example", category: "Resiliency", states: "Virginia, West Virginia", description: "Flood modeling, hazard mitigation plans and FEMA grant support for coastal and riverside communities.", interests: ["Strategic Partnership", "Vendor Showcase Events"], stage: "decided", created: 60,
    app: { years_in_business: 14, legal_structure: "S-Corp", certifications: ["SWaM", "Minority-Owned"], insurance_coverage: "GL $2M, professional liability $3M", contract_vehicles: "State on-call contract; GSA schedule", public_sector_references: "Two coastal cities, one regional planning district", core_offerings: "Hazard mitigation plans, flood modeling, grant writing", problem_solved: "Localities miss mitigation funding because plans are out of date.", existing_gov_clients: "20+ localities", annual_revenue_range: "$5M–$10M", growth_pct: 21, cost_reduction_explanation: "Brings in outside mitigation dollars and lowers flood losses.", open_to_revenue_share: null, compliance_standards: "NIST" },
    scores: sc([90, 80, 90, 70, 70, 80]), decision: "Approved Innovation Partner", notes: "Strong references. Fills the resiliency gap. Good fit for coastal localities.",
  },
  {
    company: "Beacon Point Security", contact: "Lena Ortiz", title: "Director, Public Sector", email: "lortiz@beaconpoint.example", website: "beaconpoint.example", category: "Cyber", states: "Virginia, North Carolina", description: "Cyber assessments, incident response retainers and staff phishing training for local governments and school divisions.", interests: ["Vendor Showcase Events", "Prime/Sub Opportunities"], stage: "decided", created: 45,
    app: { years_in_business: 11, legal_structure: "C-Corp", certifications: ["SDVOSB"], insurance_coverage: "GL $2M, cyber liability $10M", contract_vehicles: "Statewide IT contract; cooperative contracts", core_offerings: "Cyber assessments, managed response, training", problem_solved: "Small IT teams can’t cover security around the clock.", existing_gov_clients: "30+", annual_revenue_range: "$10M–$50M", growth_pct: 18, cost_reduction_explanation: "Avoids breach costs and lowers cyber insurance premiums.", open_to_revenue_share: true, compliance_standards: "NIST, CISA, SOC 2, CJIS" },
    scores: sc([85, 80, 85, 75, 90, 70]), decision: "Approved Innovation Partner", notes: "Deep local government bench. CJIS-ready.",
  },
  {
    company: "Northstar Grants Collaborative", contact: "Renee Okafor", title: "Owner", email: "renee@northstargrants.example", website: "northstargrants.example", category: "Grants & Funding", states: "Virginia", description: "Grant research, writing and post-award compliance for small towns and counties.", interests: ["Vendor Showcase Events"], stage: "decided", created: 40,
    app: { years_in_business: 4, legal_structure: "LLC", certifications: ["Woman-Owned", "Minority-Owned"], core_offerings: "Grant writing, post-award reporting", problem_solved: "Small localities have no grants staff.", annual_revenue_range: "Under $1M", growth_pct: 55, cost_reduction_explanation: "Brings in outside funding.", open_to_revenue_share: true, compliance_standards: "None yet" },
    scores: sc([60, 50, 80, 60, 50, 90]), decision: "Approved Event Participant", notes: "Young firm. Approved for showcase events first; revisit partner status in six months.",
  },
  {
    company: "Brightpath Workforce Labs", contact: "Jordan Ellis", title: "CEO", email: "jordan@brightpath.example", website: "brightpath.example", category: "Workforce", states: "Virginia, Tennessee", description: "Digital skills bootcamps for municipal staff and residents.", interests: ["Vendor Showcase Events"], stage: "decided", created: 25,
    app: { years_in_business: 3, legal_structure: "LLC", certifications: ["None yet"], core_offerings: "Bootcamps", problem_solved: "Staff lack digital skills.", annual_revenue_range: "Under $1M", growth_pct: 12, cost_reduction_explanation: "Reduces outside contractor spend.", open_to_revenue_share: false, compliance_standards: "None yet" },
    scores: sc([40, 50, 60, 60, 40, 70]), decision: "Conditional", notes: "Conditional: needs one more public-sector reference and cyber liability insurance.",
  },
];

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

export async function hasSampleData(): Promise<boolean> {
  const { data, error } = await supabase.from("vendor_inquiries").select("id").eq("is_sample", true).limit(1);
  return !error && !!data?.length;
}

export async function loadSampleData(actor: string): Promise<void> {
  const partnerIds: Record<string, string> = {};
  for (const v of VENDORS) {
    const decided = v.stage === "decided";
    const total = v.scores ? weightedScore(v.scores) : null;
    let partnerId: string | null = null;
    if (decided && v.decision && v.decision !== "Conditional" && v.decision !== "Not Approved") {
      const p = await must(
        supabase
          .from("partners")
          .insert([{ name: v.company, partner_type: "Vendor", capabilities: (v.app?.core_offerings as string) || null, contract_vehicles: (v.app?.contract_vehicles as string) || null, vendor_score: total, vendor_status: v.decision, innovation_category: v.category, website: v.website, public_description: v.description, is_sample: true, notes: "Sample data" }])
          .select("id")
          .single()
      );
      partnerId = (p as { id: string }).id;
      partnerIds[v.company] = partnerId;
    }
    const status = v.stage === "unscreened" ? "Unscreened Inquiry" : v.stage === "invited" ? "Invited to Apply" : v.stage === "pending" ? "Application Submitted" : v.decision;
    const inq = await must(
      supabase
        .from("vendor_inquiries")
        .insert([{ company_name: v.company, primary_contact: v.contact, title: v.title, email: v.email, website: v.website, core_service_category: v.category, worked_public_sector: true, states: v.states, brief_description: v.description, interested_in: v.interests, status, created_at: ago(v.created), invite_token: v.stage === "unscreened" ? null : newInviteToken(), invited_at: v.stage === "unscreened" ? null : ago(v.created - 2), invited_by: v.stage === "unscreened" ? null : actor, partner_id: partnerId, source: "public", is_sample: true }])
        .select("id")
        .single()
    );
    if (v.app) {
      await must(
        supabase.from("vendor_applications").insert([
          {
            ...v.app,
            inquiry_id: (inq as { id: string }).id,
            created_at: ago(v.created - 5),
            status: decided ? v.decision : "Pending Review",
            score: total,
            criteria_scores: v.scores || null,
            reviewed_by: decided ? actor : null,
            decision_notes: v.notes || null,
            coi_confirmed: decided,
            decided_at: decided ? ago(v.created - 9) : null,
            partner_id: partnerId,
            source: "invite",
            is_sample: true,
          },
        ])
      );
    }
  }

  const riverton = await must(
    supabase
      .from("accounts")
      .insert([{ name: "City of Riverton", account_type: "City", status: "Prospect", owner: actor, innovation_tier: "Advisory", readiness_score: 58, population_size: 48000, annual_it_budget: 3200000, top_challenges: ["Cyber", "AI", "GovTech & Data"], grant_funding_interest: true, is_sample: true, notes: "Sample data" }])
      .select("id")
      .single()
  );
  const rivertonId = (riverton as { id: string }).id;
  await must(
    supabase.from("client_intakes").insert([
      { organization_name: "City of Riverton", organization_type: "City", contact_name: "Angela Price", contact_title: "Chief Information Officer", contact_email: "aprice@riverton.example", population_size: 48000, annual_it_budget: 3200000, top_challenges: ["Cyber", "AI", "GovTech & Data"], current_initiatives: "Replacing a 15-year-old permitting system; piloting a resident AI assistant.", grant_funding_interest: true, interested_in: ["Innovation Dashboard", "Cyber Assessment", "Advisory Services"], status: "Converted", assigned_tier: "Advisory", readiness_score: 58, advisory_estimate: 48000, advisory_engagement: true, account_id: rivertonId, reviewed_at: ago(20), reviewed_by: actor, source: "public", created_at: ago(30), is_sample: true },
      { organization_name: "Ashford County", organization_type: "County", contact_name: "Michael Turner", contact_title: "Deputy County Administrator", contact_email: "mturner@ashfordcounty.example", population_size: 112000, annual_it_budget: 9800000, top_challenges: ["Broadband", "Resiliency", "Grants & Funding"], current_initiatives: "Closing rural broadband gaps; updating the hazard mitigation plan.", grant_funding_interest: true, interested_in: ["Broadband Strategy", "Advisory Services"], status: "New", source: "public", created_at: ago(2), is_sample: true },
      { organization_name: "Town of Millbrook", organization_type: "Town", contact_name: "Sharon Lee", contact_title: "Town Manager", contact_email: "slee@millbrook.example", population_size: 7400, annual_it_budget: 420000, top_challenges: ["Grants & Funding", "Workforce", "Cyber"], current_initiatives: "First IT strategic plan; looking for grant-funded cyber upgrades.", grant_funding_interest: true, interested_in: ["Innovation Dashboard", "Cyber Assessment"], status: "Qualified", assigned_tier: "Dashboard Only", readiness_score: 34, advisory_estimate: 12000, reviewed_at: ago(10), reviewed_by: actor, source: "public", created_at: ago(15), is_sample: true },
    ])
  );

  const events = (await must(
    supabase
      .from("events")
      .insert([
        { name: "AI in Local Government Showcase", event_date: dateIn(24), location: "Richmond, VA", theme: "AI", target_audience: "City managers, CIOs, procurement officers", capacity: 120, registration_link: "dataisdata.com/events", status: "Registration Open", revenue_generated: 15000, is_sample: true, notes: "Sample data" },
        { name: "Broadband & Resiliency Forum", event_date: dateIn(58), location: "Chesterfield, VA", theme: "Broadband", target_audience: "County administrators, planning directors", capacity: 80, status: "Planned", revenue_generated: 0, is_sample: true, notes: "Sample data" },
        { name: "Cyber Readiness Roundtable", event_date: dateIn(-35), location: "Petersburg, VA", theme: "Cyber", target_audience: "Town managers, IT directors, school divisions", capacity: 60, status: "Completed", post_event_leads: 9, revenue_generated: 5000, is_sample: true, notes: "Sample data" },
      ])
      .select("id, name")
  )) as { id: string; name: string }[];
  const ev = (n: string) => events.find((e) => e.name === n)!.id;
  const ai = ev("AI in Local Government Showcase"), bb = ev("Broadband & Resiliency Forum"), cy = ev("Cyber Readiness Roundtable");
  const k = partnerIds["Keystone Resilience Group"], b = partnerIds["Beacon Point Security"], n = partnerIds["Northstar Grants Collaborative"];
  await must(
    supabase.from("event_vendors").insert([
      { event_id: ai, partner_id: k, sponsorship_tier: "Strategic Partner", fee: 10000, paid: true, paid_at: ago(5) },
      { event_id: ai, partner_id: b, sponsorship_tier: "Premium Sponsor", fee: 5000, paid: true, paid_at: ago(3) },
      { event_id: ai, partner_id: n, sponsorship_tier: "Showcase", fee: 2500, paid: false },
      { event_id: bb, partner_id: n, sponsorship_tier: "Showcase", fee: 2500, paid: false },
      { event_id: cy, partner_id: b, sponsorship_tier: "Showcase", fee: 2500, paid: true, paid_at: ago(40) },
      { event_id: cy, partner_id: k, sponsorship_tier: "Showcase", fee: 2500, paid: true, paid_at: ago(40) },
    ])
  );
  await must(
    supabase.from("event_attendees").insert([
      { event_id: ai, account_id: rivertonId, rsvp: "yes", invited_at: ago(9), responded_at: ago(4) },
      { event_id: cy, account_id: rivertonId, rsvp: "yes", invited_at: ago(50), responded_at: ago(42) },
    ])
  );
  await must(
    supabase.from("event_tasks").insert([
      { event_id: ai, title: "Confirm venue and AV", done: true },
      { event_id: ai, title: "Publish the vendor fee disclosure on the event page", done: true },
      { event_id: ai, title: "Send invitations to approved localities", done: false },
      { event_id: bb, title: "Shortlist broadband vendors", done: false },
      { event_id: cy, title: "Send attendee survey", done: true },
      { event_id: cy, title: "Share the lead list with sponsors", done: true },
    ])
  );
  await supabase.from("innovation_activity").insert([{ actor_name: "Sample data", message: `${actor} loaded sample data (8 vendors, 3 localities, 3 events)` }]);
}

export async function removeSampleData(actor: string): Promise<{ keptAccounts: string[] }> {
  // Children cascade from events (vendors, attendees, tasks, requests) and partners.
  for (const t of ["events", "vendor_applications", "vendor_inquiries", "client_intakes", "partners"]) {
    const { error } = await supabase.from(t).delete().eq("is_sample", true);
    if (error) throw error;
  }
  // Sample accounts: deleting an account also deletes its engagements, invoices, opportunities
  // and activities, so any sample account that real work was attached to is kept (and unflagged).
  const { data: accts, error: accErr } = await supabase.from("accounts").select("id, name").eq("is_sample", true);
  if (accErr) throw accErr;
  const list = (accts as { id: string; name: string }[]) || [];
  const ids = list.map((a) => a.id);
  const kept: string[] = [];
  if (ids.length) {
    const used = new Set<string>();
    for (const t of ["engagements", "invoices", "opportunities", "activities"]) {
      const { data } = await supabase.from(t).select("account_id").in("account_id", ids);
      for (const r of (data as { account_id: string }[]) || []) used.add(r.account_id);
    }
    const remove = ids.filter((id) => !used.has(id));
    if (remove.length) {
      await supabase.from("contacts").delete().in("account_id", remove);
      const { error } = await supabase.from("accounts").delete().in("id", remove);
      if (error) throw error;
    }
    for (const a of list.filter((x) => used.has(x.id))) {
      kept.push(a.name);
      await supabase.from("accounts").update({ is_sample: false }).eq("id", a.id);
    }
  }
  await supabase.from("innovation_activity").delete().eq("actor_name", "Sample data");
  await supabase.from("innovation_activity").insert([{ actor_name: actor, message: `${actor} removed the sample data` }]);
  return { keptAccounts: kept };
}
