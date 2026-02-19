-- =============================================================================
-- TONY'S PROJECT DATA MIGRATION
-- Run this in the Supabase SQL Editor to seed all real project data.
-- This script creates the contractors table (if needed), inserts accounts,
-- contractors, engagements, and links them all together.
-- =============================================================================

-- 1) Create contractors table and junction table if they don't exist
CREATE TABLE IF NOT EXISTS contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    title_role TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engagement_contractors (
    engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
    PRIMARY KEY (engagement_id, contractor_id)
);

-- 2) RLS policies (safe to re-run with IF NOT EXISTS pattern)
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contractors' AND policyname='Allow anon all on contractors') THEN
    CREATE POLICY "Allow anon all on contractors" ON contractors FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE engagement_contractors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='engagement_contractors' AND policyname='Allow anon all on engagement_contractors') THEN
    CREATE POLICY "Allow anon all on engagement_contractors" ON engagement_contractors FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3) Insert 6 Accounts
INSERT INTO accounts (name, account_type, region_state, region_locality, primary_focus, status, owner) VALUES
('Virginia State University', 'University', 'VA', 'Petersburg', 'IT Services, Cybersecurity, Enterprise Architecture', 'Active', 'Tony Wood'),
('Department of Medical Assistance Services', 'State Agency', 'VA', 'Richmond', 'IT Support, Project Management', 'Active', 'Tony Wood'),
('Virginia IT Agency', 'State Agency', 'VA', 'Richmond', 'Enterprise IT, Innovation, Customer Account Management', 'Active', 'Tony Wood'),
('Virginia Department of Emergency Management', 'State Agency', 'VA', 'Richmond', 'Infrastructure, SharePoint, Emergency Ops', 'Active', 'Tony Wood'),
('Virginia Office of Data Governance and Analytics', 'State Agency', 'VA', 'Richmond', 'Data Governance, Procurement, Workforce Development', 'Active', 'Tony Wood'),
('Virginia Department of Transportation', 'State Agency', 'VA', 'Richmond', 'IT Customer Relationship Management', 'Active', 'Tony Wood');

-- 4) Insert ~30 Unique Contractors
INSERT INTO contractors (full_name, title_role, status) VALUES
('Norman Gaines', 'Technical Support Analyst / Project Manager', 'Active'),
('Toby', 'IT Security Analyst', 'Active'),
('Jeffrey Limones', 'ServiceNow Developer', 'Active'),
('Foskey', 'Business Analyst', 'Active'),
('Womack', 'Web Technologies Tools Administrator', 'Active'),
('Rhodd', 'Enterprise Architect', 'Active'),
('Thornton', 'Program Manager', 'Active'),
('LaKetra Wilkerson', 'Business Readiness Analyst', 'Active'),
('Leslie Hannaford', 'CAM/Business Readiness Specialist', 'Active'),
('Malcomb', 'Infrastructure Solutions Architect / Business Analyst', 'Active'),
('Anthony Wood', 'ICE Program Manager / MITA Cost Analyst', 'Active'),
('Chaun Burnette', 'Planning Coordinator / Business Analyst', 'Active'),
('Vinoba', 'Business Analyst', 'Active'),
('Akiah Moore', 'Business Analyst / Customer Account Manager', 'Active'),
('Jennifer Schoemmell', 'Project Manager', 'Active'),
('Margaret McGuire', 'IT Customer Relationship Manager', 'Active'),
('Selena Ballou', 'Program Coordinator / Business Analyst', 'Active'),
('Haros', 'Procurement Specialist', 'Active'),
('Anthony Dib', 'IT Purchasing Analyst', 'Active'),
('Dunlap', 'ICE Program Coordinator', 'Active'),
('Adderley', 'ICE Coordinator', 'Active'),
('JeVette', 'Messaging Project Coordinator', 'Active'),
('Kelly', 'Business Readiness Specialist / Transition Analyst', 'Active'),
('Habtamu Anliy', 'Programmer Analyst', 'Active'),
('Jamal Williams', 'Help Desk/Tech Support Analyst', 'Active'),
('Donald Johnson', 'Help Desk/Tech Support Analyst', 'Active'),
('Haysha Griffin', 'Help Desk/Tech Support Analyst', 'Active'),
('Chelsea O''Neal', 'Help Desk/Tech Support Analyst', 'Active'),
('Preyanka Dubey', 'Business Analyst', 'Active');

-- 5) Insert Engagements and link to contractors
-- We use a DO block with variables so we can reference IDs without hardcoding UUIDs

DO $$
DECLARE
  -- Account IDs
  acc_vsu UUID;
  acc_dmas UUID;
  acc_vita UUID;
  acc_vdem UUID;
  acc_odga UUID;
  acc_vdot UUID;
  -- Contractor IDs
  c_gaines UUID;
  c_toby UUID;
  c_limones UUID;
  c_foskey UUID;
  c_womack UUID;
  c_rhodd UUID;
  c_thornton UUID;
  c_wilkerson UUID;
  c_hannaford UUID;
  c_malcomb UUID;
  c_awood UUID;
  c_burnette UUID;
  c_vinoba UUID;
  c_moore UUID;
  c_schoemmell UUID;
  c_mcguire UUID;
  c_ballou UUID;
  c_haros UUID;
  c_dib UUID;
  c_dunlap UUID;
  c_adderley UUID;
  c_jevette UUID;
  c_kelly UUID;
  c_anliy UUID;
  c_jwilliams UUID;
  c_djohnson UUID;
  c_griffin UUID;
  c_oneal UUID;
  c_dubey UUID;
  -- Engagement IDs (temp vars)
  eng_id UUID;
BEGIN
  -- Look up account IDs
  SELECT id INTO acc_vsu FROM accounts WHERE name = 'Virginia State University' LIMIT 1;
  SELECT id INTO acc_dmas FROM accounts WHERE name = 'Department of Medical Assistance Services' LIMIT 1;
  SELECT id INTO acc_vita FROM accounts WHERE name = 'Virginia IT Agency' LIMIT 1;
  SELECT id INTO acc_vdem FROM accounts WHERE name = 'Virginia Department of Emergency Management' LIMIT 1;
  SELECT id INTO acc_odga FROM accounts WHERE name = 'Virginia Office of Data Governance and Analytics' LIMIT 1;
  SELECT id INTO acc_vdot FROM accounts WHERE name = 'Virginia Department of Transportation' LIMIT 1;

  -- Look up contractor IDs
  SELECT id INTO c_gaines FROM contractors WHERE full_name = 'Norman Gaines' LIMIT 1;
  SELECT id INTO c_toby FROM contractors WHERE full_name = 'Toby' LIMIT 1;
  SELECT id INTO c_limones FROM contractors WHERE full_name = 'Jeffrey Limones' LIMIT 1;
  SELECT id INTO c_foskey FROM contractors WHERE full_name = 'Foskey' LIMIT 1;
  SELECT id INTO c_womack FROM contractors WHERE full_name = 'Womack' LIMIT 1;
  SELECT id INTO c_rhodd FROM contractors WHERE full_name = 'Rhodd' LIMIT 1;
  SELECT id INTO c_thornton FROM contractors WHERE full_name = 'Thornton' LIMIT 1;
  SELECT id INTO c_wilkerson FROM contractors WHERE full_name = 'LaKetra Wilkerson' LIMIT 1;
  SELECT id INTO c_hannaford FROM contractors WHERE full_name = 'Leslie Hannaford' LIMIT 1;
  SELECT id INTO c_malcomb FROM contractors WHERE full_name = 'Malcomb' LIMIT 1;
  SELECT id INTO c_awood FROM contractors WHERE full_name = 'Anthony Wood' LIMIT 1;
  SELECT id INTO c_burnette FROM contractors WHERE full_name = 'Chaun Burnette' LIMIT 1;
  SELECT id INTO c_vinoba FROM contractors WHERE full_name = 'Vinoba' LIMIT 1;
  SELECT id INTO c_moore FROM contractors WHERE full_name = 'Akiah Moore' LIMIT 1;
  SELECT id INTO c_schoemmell FROM contractors WHERE full_name = 'Jennifer Schoemmell' LIMIT 1;
  SELECT id INTO c_mcguire FROM contractors WHERE full_name = 'Margaret McGuire' LIMIT 1;
  SELECT id INTO c_ballou FROM contractors WHERE full_name = 'Selena Ballou' LIMIT 1;
  SELECT id INTO c_haros FROM contractors WHERE full_name = 'Haros' LIMIT 1;
  SELECT id INTO c_dib FROM contractors WHERE full_name = 'Anthony Dib' LIMIT 1;
  SELECT id INTO c_dunlap FROM contractors WHERE full_name = 'Dunlap' LIMIT 1;
  SELECT id INTO c_adderley FROM contractors WHERE full_name = 'Adderley' LIMIT 1;
  SELECT id INTO c_jevette FROM contractors WHERE full_name = 'JeVette' LIMIT 1;
  SELECT id INTO c_kelly FROM contractors WHERE full_name = 'Kelly' LIMIT 1;
  SELECT id INTO c_anliy FROM contractors WHERE full_name = 'Habtamu Anliy' LIMIT 1;
  SELECT id INTO c_jwilliams FROM contractors WHERE full_name = 'Jamal Williams' LIMIT 1;
  SELECT id INTO c_djohnson FROM contractors WHERE full_name = 'Donald Johnson' LIMIT 1;
  SELECT id INTO c_griffin FROM contractors WHERE full_name = 'Haysha Griffin' LIMIT 1;
  SELECT id INTO c_oneal FROM contractors WHERE full_name = 'Chelsea O''Neal' LIMIT 1;
  SELECT id INTO c_dubey FROM contractors WHERE full_name = 'Preyanka Dubey' LIMIT 1;

  -- ========== DMAS ENGAGEMENTS ==========

  -- 1. DMAS - Technical Support Analyst 2 - Norman Gaines
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Technical Support Analyst 2', acc_dmas, 'Staff Aug', 'Complete',
  'Desktop Support/ A/V equipment SME

Desktop Support Technician needed to assist in the installation of IT peripherals for DMAS workstations. Install IT peripherals on agency staff desktops.

This position is responsible for delivery of IT operational technical support services to DMAS as a member of the IT Services Team within the Division of Information Management. This position supports the delivery of IT services to include Agency specific desktop computing IT peripherals and surplus. This position supports the IT Services Team by providing IT installation services, maintaining IT inventory. This position serves as a member of the Agency IT Resource (AITR) Team by collaborating with VITA IT resources meeting all VITA policies, guidelines and standards for any effort related to the general scope of IT activity within DMAS. This position does have a physical requirement of lifting up to 25 pounds including activities such as moving and installing IT equipment.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_gaines);

  -- DMAS - Project Manager 2 - Malcomb
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Project Manager 2', acc_dmas, 'Staff Aug', 'Complete',
  'This individual works in DMAS PMO as a project manager. The position will be responsible for providing project management support for multiple PMO initiatives. The specific projects will include FAS Releases, Financial Management System Changes, TMSIS Changes, PMO Operations and Certification Support.

Duties:
1. Manage Full Project Lifecycle - Planning, Execution & Controlling, Reporting, Closeout
2. Manage Project Schedules and Budgets
3. Manage Stakeholder Communications
4. Create presentations and dashboards as needed
5. Manage vendor deliverables
6. Manage requirement development or testing as needed')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_malcomb);

  -- ========== VSU ENGAGEMENTS ==========

  -- 2. VSU - IT Security Analyst 3 - Toby
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('IT Security Analyst 3', acc_vsu, 'Staff Aug', 'Complete',
  'Develop, execute and track the performance of security measures to protect information and network infrastructure and computer systems.
- Design computer security strategy and engineer comprehensive cybersecurity architecture
- Identify, define and document system security requirements and recommend solutions to management
- Configure, troubleshoot and maintain security infrastructure software and hardware
- Install software that monitors systems and networks for security breaches and intrusions
- Monitor systems for irregular behavior and set up preventive measures
- Plan, develop, implement and update company''s information security strategy
- Educate and train staff on information system security best practices
- Configure, troubleshoot, and maintain camera surveillance and card access, and panic alarms')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_toby);

  -- 3. VSU - ServiceNow Developer - Jeffrey Limones
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('ServiceNow Developer', acc_vsu, 'Staff Aug', 'Complete',
  'A ServiceNow developer is required to develop, test and deploy service request forms and workflow.

Day to Day:
- Develop, maintain, and enhance service request applications on the ServiceNow platform to automate and improve business processes
- Develop test cases for functional, UAT testing, resolution of reported defects and perform integration testing using sample data
- Troubleshoot technical issues through all phases of SDLC
- Collaborate with the project manager to establish timelines, specifications, and budget
- Implement and monitor changes to ensure a smooth transition
- Conduct staff training on new procedures
- Provide regular updates on project status to supervisors')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_limones);

  -- 4. VSU - Business Analyst - Foskey
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Business Analyst', acc_vsu, 'Staff Aug', 'Complete',
  'Collaborates with global project teams to implement initiatives. Maintain master issue and risk register and meeting notes. Designs and deploys compliance training communication and programs suitable for designated countries and/or targeted teams/leaders. Executes communications for all business facing and internal communications related to planning, remediating or mitigating risks.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_foskey);

  -- 5. VSU - Enterprise Architect 4 - Rhodd
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Enterprise Architect 4', acc_vsu, 'Staff Aug', 'Complete',
  '25% Direct the operational and strategic planning of the IT department and subdivisions, including business requirements, budgeting, project planning, and organizing and negotiating the allocation of resources. Review performance of IT systems to determine operating costs, productivity levels, and upgrade requirements. Implement the ITIL Roadmap for the organization.

25% Directs the daily operations of Data Center, Infrastructure, and outsourcing contracts which support server management, data, voice and video network services, messaging services, help desk services research computing support management, and disaster-recovery planning and management. Manage IT outsourcing contracts and staffing.

20% Oversee negotiation and administration of vendor, outsourcer, and consultant contracts and service agreements.

15% Works with project management to develop work plans, resource planning, budgeting, execution, and management of ongoing and future projects.

10% Consults with and provides technical expertise to faculty regarding research plans, identifying emerging research computing needs.

5% Other duties as assigned by the CIO and Deputy CIO for IT Operations.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_rhodd);

  -- 6. VSU - Program Manager - Thornton
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Program Manager - GRC', acc_vsu, 'Staff Aug', 'Complete',
  'VSU is seeking a Program Manager to lead their Governance, Risk Management, and Compliance program activities. The individual is expected to plan and develop methods and procedures for implementing GRC programs, direct and coordinate GRC program activities, and exercise control over personnel responsible for specific functions.

The Program Manager works within the Office of the CIO to provide oversight, direction, and guidance for IT Investment projects reviewed by the IT Investment Board (ITIB). Ensures all IT Investment projects have a valid project plan that maintains scope, tasks, schedules, estimates, and status. Directs corrective actions where performance falls below objectives. Assists with development of IT Risk Management standards, policies, and guidelines. Monitor progress of technology investment projects. Direct and manage business continuity planning, problem analysis, and resolution.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_thornton);

  -- VSU - Infrastructure Solutions Architect 3 - Malcomb
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Infrastructure Solutions Architect 3', acc_vsu, 'Staff Aug', 'Complete',
  'Analyzes user requirements, technical specifications and existing technical architecture designs to develop and oversee implementation of architecture for Infrastructures.

Lead/support technical teams to design cloud infrastructure, develop detailed architecture models to host test, development, and production environments; plan for system and application migration(s) to the cloud, adhering to technical and business requirements and best practices; develop and document technical designs for integration and implementation of new cloud applications and systems; optimize costs of cloud solutions by identifying waste and automating when necessary.

Architect, build, and deploy cloud solutions across public, private and hybrid cloud environments. Responsible for maintaining infrastructure components and troubleshooting infrastructure incidents, monitor cloud services, network, and infrastructure security compliance.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_malcomb);

  -- VSU - Business Analyst 3 - Akiah Moore
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Business Analyst 3 - Moore', acc_vsu, 'Staff Aug', 'Complete',
  'The Business Analyst plans, develops, tests and documents computer programs, applying knowledge of programming techniques and computer systems. Evaluates user request for new or modified program. Reviews, analyzes, and evaluates business systems and user needs. Formulates systems to parallel overall business strategies. Leads analysis and solution definition. Understands the business issues and data challenges of the organization. Identifies strengths and weaknesses and suggests areas of improvement. Develops functional and non-functional specifications, use cases and system design specifications. Conducts effective joint applications development and brainstorming sessions. Interviews and surveys subject matter experts and stakeholders to gather requirements. Understands agile development and the universal modeling language.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_moore);

  -- VSU - Project Manager 3 - Jennifer Schoemmell
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Project Manager 3', acc_vsu, 'Staff Aug', 'Complete',
  '- Aligning TS special projects with TS and Enterprise mission and objectives
- Collaborating with managers regarding special project planning and execution
- Reviewing project portfolios to ensure they abide by strategic decisions
- Reporting on special project resource needs and performance
- Reviewing trends to ensure they align with TS
- Meeting with TS Business owners and stakeholders to determine project requirements and ensure an optimal outcome')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_schoemmell);

  -- VSU - Business Analyst 3 - Ballou
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Business Analyst 3 - Ballou', acc_vsu, 'Staff Aug', 'Complete',
  'The Business Analyst plans, develops, tests and documents computer programs, applying knowledge of programming techniques and computer systems. Evaluates user request for new or modified program. Reviews, analyzes, and evaluates business systems and user needs. Formulates systems to parallel overall business strategies. Leads analysis and solution definition. Understands the business issues and data challenges. Identifies strengths and weaknesses and suggests areas of improvement. Reviews and edits requirements, specifications, business processes and recommendations. Develops functional and non-functional specifications, use cases and system design specifications. Conducts effective joint applications development and brainstorming sessions. Understands agile development and the universal modeling language.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_ballou);

  -- VSU - Help Desk x4
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Help Desk/Tech Support Analyst - Jamal Williams', acc_vsu, 'Staff Aug', 'Complete',
  'Provide a centralized reporting and problem resolution facility to support users of Information Technology. Under general supervision, provide technical software, hardware and network problem resolution to all VSU technology users by performing question/problem diagnosis and guiding users through step-by-step solutions in a call center environment; clearly communicate technical solutions in a user-friendly, professional manner; provide one-on-one end-user training as needed; assist other technicians as call volume permits; assign more complex end-user problems to appropriate support groups; conduct hardware and software inventory database maintenance and reporting.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_jwilliams);

  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Help Desk/Tech Support Analyst - Donald Johnson', acc_vsu, 'Staff Aug', 'Complete',
  'Provide a centralized reporting and problem resolution facility to support users of Information Technology. Under general supervision, provide technical software, hardware and network problem resolution to all VSU technology users by performing question/problem diagnosis and guiding users through step-by-step solutions in a call center environment.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_djohnson);

  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Help Desk/Tech Support Analyst - Haysha Griffin', acc_vsu, 'Staff Aug', 'Complete',
  'Provide a centralized reporting and problem resolution facility to support users of Information Technology. Under general supervision, provide technical software, hardware and network problem resolution to all VSU technology users.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_griffin);

  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Help Desk/Tech Support Analyst - Chelsea O''Neal', acc_vsu, 'Staff Aug', 'Complete',
  'Provide a centralized reporting and problem resolution facility to support users of Information Technology. Under general supervision, provide technical software, hardware and network problem resolution to all VSU technology users.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_oneal);

  -- ========== VITA ENGAGEMENTS ==========

  -- VITA - Web Technologies Tools Administrator - Womack
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Web Technologies Tools Administrator', acc_vita, 'Staff Aug', 'Complete',
  'Coordinate delivery of enterprise web technology tools for the Commonwealth of Virginia web ecosystem. The position requires a web technologist background with experience in administering enterprise tools. Will work closely with customers to ensure tools are utilized effectively. Responsible for delivering the tools and ensuring software currency in the installed base. Must develop and implement processes to track customers, tool usage and metrics reporting. Responsible for security compliance of the enterprise tools. Will develop reports and presentations to validate delivery, usage and compliance.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_womack);

  -- VITA - Business Readiness/BA4 - LaKetra Wilkerson
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Business Readiness / BA4', acc_vita, 'Staff Aug', 'Complete',
  'Cross functional position supporting the Customer Strategy and Investment Governance Directorate (CSIG). Closes a gap in the business readiness group for organizational change management (OCM), data analytics, drafting, reviewing and QA of various communications. Serves as liaison between business readiness group, customer account management division and customer experience organization. Handles MOU effort, coordinates ATIR and CAC meetings and analyzes survey data related to customer experience.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_wilkerson);

  -- VITA - 365 Desktop Support Analyst ONSITE
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('365 Desktop Support Analyst ONSITE', acc_vita, 'Staff Aug', 'Complete',
  'Contractors to aide and provide technical support to agencies as they migrate to O365 and MS Outlook. Provide critical support for mobile device migration, outlook profile creation, accessing OneDrive and configuring the O365 suite. Ability to solve minor to complex issues with O365 including Outlook. Knowledge of MS Teams and the Microsoft suite of products. Experience configuring O365 mobile app for iOS and Google platforms. Will serve as desk side technical support to agencies once their migration occurs.')
  RETURNING id INTO eng_id;

  -- VITA - CAM/Business Readiness Specialist - Leslie Hannaford
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('CAM/Business Readiness Specialist', acc_vita, 'Staff Aug', 'Complete',
  'Cross functional position supporting CAM and Business Readiness divisions. Closes a gap in the business readiness group for drafting, reviewing and QA of various communications. Serves as liaison between business readiness group and customer account management division. Handles MOU effort, serves as POC and coordinates ATIR and CAC meetings. Also serves as POC for CAM metrics and works closely with CAM Analysts on all internal projects.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_hannaford);

  -- VITA - ICE Project Manager 3 - Anthony Wood
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('ICE Project Manager 3', acc_vita, 'Staff Aug', 'Complete',
  'Innovation Center of Excellence (ICE) program management. Lead and coordinate innovation initiatives for the Virginia IT Agency.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_awood);

  -- VITA - Planning Coordinator/BA4 - Chaun Burnette
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Planning Coordinator / BA4', acc_vita, 'Staff Aug', 'Complete',
  'Combined role shared between Customer Account Management Division and IT Investment Management Division. Needed to complete the MOU effort, provide data analysis as well as agency IT strategic planning reviews, tracking and coordination. Will have responsibility for coordination and follow up of actions for the Customer Advisory Council (CAC).')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_burnette);

  -- VITA - Business Analyst 4 REMOTE - Vinoba
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Business Analyst 4 - REMOTE', acc_vita, 'Staff Aug', 'Complete',
  'Closes a gap from a recent resignation in the business readiness group for drafting, reviewing and QA of various communications. Will take on numerous efforts including the enterprise messaging migration project. Will serve as POC for the messaging effort and be the primary POC for the MSI as it relates to OCM.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_vinoba);

  -- VITA - MITA Cost Analyst - Wood
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('MITA Cost Analyst', acc_vita, 'Staff Aug', 'Complete',
  'VITA desires to expand the customer base of a shared data service offering referred to as MITA. The application toolsets reside on the SOA (Service Oriented Architecture) platform including Enterprise Data Management, Enterprise Service Bus, and the Commonwealth Authentication Service.

Requirements: 12+ years experience in business analysis, experience with IT cost strategies (IBM-based SOA products preferred), significant experience in business writing, familiarity with Service Oriented Architecture, working knowledge of IBM Smart Cloud Cost Management (SCCM) system, demonstrated ability to create cost drivers out of SOA based data environments, understanding of Federal cost allocation model.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_awood);

  -- VITA - ICE Program Coordinator - Dunlap
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('ICE Program Coordinator', acc_vita, 'Staff Aug', 'Complete',
  'Support the VITA ICE program: Maintain documentation of innovation and VITA Innovation Center of Excellence processes. Organize and encourage collaboration, engagement, open dialog, group creativity sessions. Facilitate internal and external customer analysis, customer observation, open innovation idea gathering, future farming, trend analysis. Development of standard requirements, success criteria, systems of measurement, metrics. Maintain Communication Management Plans. SharePoint Site Management. Survey Development. Program Coordination for VITA ICE demonstration.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_dunlap);

  -- VITA - ICE Program Manager - Woods
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('ICE Program Manager', acc_vita, 'Staff Aug', 'Complete',
  'Innovation Center of Excellence program management and leadership.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_awood);

  -- VITA - ICE Coordinator - Adderley
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('ICE Coordinator', acc_vita, 'Staff Aug', 'Complete',
  'Knowledge and experience with process, project or program coordination. Ability to organize and encourage collaboration. Ability to effectively and efficiently manage and prioritize tasks and time over multiple activities with competing priorities. Excellent oral and written communication skills. Some customer account management experience. Basic knowledge of innovative technologies.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_adderley);

  -- VITA - CRM Program Coordinator - Ballou
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('CRM Program Coordinator', acc_vita, 'Staff Aug', 'Complete',
  'Supporting management of the RMG portfolio of projects including: ensuring timely status reports, ensuring compliance with RMG portfolio management practices, serving as risk & issue coordinator, training project leads on RMG and VITA work plan processes. Supporting RMG business process management (BPM) including leading business process development/improvement efforts. Planning and scheduling including meeting coordination, project schedule development. Supporting CRM Strategy development and implementation. SharePoint site development and maintenance. Division records management.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_ballou);

  -- VITA - GSUITE Messaging Proj Coordinator - JeVette
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('GSUITE Messaging Project Coordinator', acc_vita, 'Staff Aug', 'Complete',
  'Organize and lead staff to work backlog of 3000 messaging tickets. Serves as point person for resolving tickets worked by VITA internal team. Provide statistics and perform trend analysis on current tickets including backlog, incoming tickets, resolution, and volume by agency. Prioritize tickets based on criteria set by the CIO. Single point of escalation for messaging issues from Customer Account Managers. Single point of contact with VITA messaging vendor Tempus Nova. Supports Risk and Issue Management by monitoring and analyzing ticket volume.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_jevette);

  -- VITA - Asset Management Analyst - Malcomb
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Asset Management Analyst', acc_vita, 'Staff Aug', 'Complete',
  'Perform analysis of asset management/billing source data as provided by a supplier to confirm its validity, and support activities to correct errors. Will work with customers and suppliers for this effort. Position required to compensate for MSI not providing billing data of sufficient accuracy. There will be a surge of billing disputes that VITA is not capable of addressing without additional resources.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_malcomb);

  -- VITA - Innovation Program Coordinator - Ballou
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Innovation Program Coordinator', acc_vita, 'Staff Aug', 'Complete',
  'Support the VITA Innovation program: Enhancement and coordination of the Commonwealth Data Internship Program (CDIP) and Next Generation Data Analytics Program. Organize and encourage collaboration, engagement, open dialog, group creativity sessions. Facilitate internal and external customer technology needs analysis, customer meetings, supplier demonstrations. Perform research of technology trends. Maintain Communication Management Plans. Maintain and manage updates for the VIP website. Perform SharePoint Site Management. Develop and administer Customer Surveys, perform trend analysis.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_ballou);

  -- VITA - Program Coordinator (unnamed)
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Program Coordinator', acc_vita, 'Staff Aug', 'Complete',
  'Planning and scheduling including meeting coordination and logistics, project schedule updates, tactical plan updates. Program and project management including assisting in or leading process improvement projects, tracking progress, developing and implementing new processes and procedures. Records management. Project planning, development, monitoring and reporting. Requires expertise in MS Office, SharePoint, experience as a program coordinator, experience with CRM tools (MS Dynamics preferred).')
  RETURNING id INTO eng_id;

  -- VITA - Business Analyst 5 - Malcomb
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Business Analyst 5', acc_vita, 'Staff Aug', 'Complete',
  'Perform analysis of asset management/billing source data as provided by a supplier to confirm its validity, and support activities to correct errors. Will work with customers and suppliers. Position required to compensate for MSI not providing billing data of sufficient accuracy. Additionally, perform Service Level analysis from suppliers and work with suppliers and service owners to improve current levels of performance and reporting.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_malcomb);

  -- VITA - Systems Analyst (unnamed)
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Systems Analyst - Messaging', acc_vita, 'Staff Aug', 'Complete',
  'Perform Level 2 incident management for Messaging Services. Provide technical guidance to end users on how to fix incidents. Interface with multiple suppliers to coordinate and resolve incidents. Leverage multiple data sources and platforms to troubleshoot issues. Working knowledge of email flow and architecture. Understanding of on premise/cloud service interaction. Basic understanding of authentication including SSO and MFA. Working knowledge of Apple and Android operating systems.')
  RETURNING id INTO eng_id;

  -- VITA - Contract Specialist (unnamed)
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Contract Specialist / Technical Writer', acc_vita, 'Staff Aug', 'Complete',
  'Responsible for developing the Memorandum of Understanding (MOU) and serve as the central coordination point for establishing the base (template) MOU, managing changes to the MOUs as services are modified. Will collaborate with the CAM organization to research and manage the review and execution of out of scope devices and security and CIO exceptions as they relate to the infrastructure MOU between Commonwealth agencies and VITA.')
  RETURNING id INTO eng_id;

  -- VITA - Business Readiness Spec - Kelly
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Business Readiness Specialist', acc_vita, 'Staff Aug', 'Complete',
  'Ensure all business readiness projects have entry in SharePoint per procedures. Ensure all communications have appropriate approvals and are scheduled for distribution. Track business readiness projects in the RMG work plan; log risks and issues. Assist with tracking of business readiness metrics. Maintain business readiness SharePoint site. Maintain calendar including project communication plan dates, project major milestones, review/approve/distribute tasks, and customer impact dates.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_kelly);

  -- VITA - CAM Customer Account Manager - Moore
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('CAM Customer Account Manager', acc_vita, 'Staff Aug', 'Complete',
  'Handles all backend processes, coordination and metrics. Works across PMD, ITIM, and CRM/Business Readiness. Knowledge of all VITA services and the Comprehensive Infrastructure Agreement (CIA). Strategic planning activities and related policies for acquisition, operation and maintenance of Commonwealth IT services. Building effective professional relationships across customers, stakeholders, technical teams and service providers. Knowledge of ITIL, CObIT, Six Sigma/Lean Six Sigma.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_moore);

  -- VITA - Gov Transition Analyst - Kelly
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Governor''s Transition Analyst', acc_vita, 'Staff Aug', 'Complete',
  'Help document transition within the Governor''s office. Part time position (20 hours/week). Ensure all business readiness projects have entry in SharePoint. Ensure all reviewed communications have appropriate approvals. Track business readiness projects in the RMG work plan. Assist with tracking of business readiness metrics. Maintain business readiness SharePoint site and calendar.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_kelly);

  -- VITA - Innovation Prog Coordinator/PM2 - Selena Ballou (Transition)
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Innovation Prog Coordinator / PM2', acc_vita, 'Staff Aug', 'Complete',
  'Support the VITA Innovation program: Enhancement and coordination of CDIP and Next Generation Data Analytics Program. Organize and encourage collaboration, engagement, open dialog, group creativity sessions. Facilitate internal and external customer technology needs analysis. Perform research of technology trends, coordinate publishing in the clearinghouse. Maintain Communication Management Plans. Manage VIP website updates. SharePoint Site Management. Develop and administer Customer Surveys. Provide Program Coordination support.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_ballou);

  -- ========== VDEM ENGAGEMENTS ==========

  -- VDEM - Infra Solutions Architect - Malcomb
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Infrastructure Solutions Architect', acc_vdem, 'Staff Aug', 'Complete',
  'Engagement for an individual as an infrastructure solution architect to assess and collaborate with technical vendors to complete current infrastructure project at EOC and move agency transformation forward. Individual with technical expertise and project management knowledge to reboot and finalize the EOC network project including infrastructure, AV system and telecommunications functionality.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_malcomb);

  -- VDEM - Project Manager 5 - Gaines
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Project Manager 5', acc_vdem, 'Staff Aug', 'Complete',
  'Individual with substantial expertise in current technologies for audio visual networking in a larger venue or emergency operations center. If not VITA PM certified or PMP, will need to complete the VITA certification. Responsible for tracking all governance and reporting requirements for the project for VITA and status report updates to the working group assembled from VDEM and Governor''s Situation Room.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_gaines);

  -- VDEM - Programmer Analyst 6 - Anliy
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Programmer Analyst 6', acc_vdem, 'Staff Aug', 'Complete',
  'VDEM is restarting SharePoint and incorporating MSTeams at the same time. Part of the move to a modern SharePoint site is building a responsive website to include multiple functionality such as approval workflows, potential addition of a training hub, onboarding for new hires, calendaring and staff hub. Need additional programming support to assist the SharePoint architect.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_anliy);

  -- ========== VDOT ENGAGEMENTS ==========

  -- VDOT - IT Customer Relationship Manager - McGuire
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('IT Customer Relationship Manager', acc_vdot, 'Staff Aug', 'Complete',
  'Strategic thinker who fosters positive/purposeful interactions, builds and preserves trusting relationships with assigned business partners throughout the agency. Manages escalations for work within the service, product and project delivery pipelines. Meeting with Agency leadership up to Executive level. Working closely with IT leadership to ensure successful delivery of all products and services. Assigned to partner with Districts as a point of focus for IT management, escalations, and coordination. Develop and maintain multi-year business capability roadmap. Managing escalations related to technology procurements, projects and service delivery.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_mcguire);

  -- ========== ODGA ENGAGEMENTS ==========

  -- ODGA - Procurement Specialist - Haros
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Procurement Specialist', acc_odga, 'Staff Aug', 'Complete',
  'Procurement specialist supporting the Virginia Office of Data Governance and Analytics.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_haros);

  -- ODGA - IT Purchasing Analyst - Anthony Dib
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('IT Purchasing Analyst', acc_odga, 'Staff Aug', 'Complete',
  'Provides critical support services to ODGA executive branch agency partners by assisting agency staff in procurement of goods and services. Manages relationships and transactions within the ODGA related to all purchases and receivables. Maintaining records for all vendors, key suppliers, and negotiated purchasing agreements. Responsible for assisting with procurement process, including contract management, contract negotiation and preparation of purchase orders. Ensuring commitments to customers are met. Demonstrated ability to interpret and apply state procurement regulations, policies, and procedures.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_dib);

  -- ODGA - Business Analyst - Preyanka Dubey
  INSERT INTO engagements (name, account_id, engagement_type, status, scope_summary)
  VALUES ('Business Analyst - Workforce Development', acc_odga, 'Staff Aug', 'Complete',
  'Supports ODGA and specifically the Office of Workforce Development (newly created agency). Reports to Deputy Chief Data Officer. Provides strategic business analysis services to ODGA and the Office of Workforce Development. Works closely within ODGA to gain in-depth understanding of business strategy, processes, services, roadmap. Key to understanding and documenting capabilities needed to address business challenges. Acts as liaison between ODGA and Office of Workforce Development. Responsible for reviewing assigned business processes end-to-end to identify operational, financial and technological risks. Identify opportunities to improve efficiency.')
  RETURNING id INTO eng_id;
  INSERT INTO engagement_contractors (engagement_id, contractor_id) VALUES (eng_id, c_dubey);

END $$;
