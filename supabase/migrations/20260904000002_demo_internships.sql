-- AlgoIntern demo catalog seed data.
-- Safe for development/STP demonstrations only. No student or application data is seeded.

with demo_companies (name, normalized_name, logo_url, website_url, industry, description, headquarters) as (
  values
    ('Northstar Labs Demo', 'northstar-labs-demo', null, 'https://example.com/companies/northstar-labs-demo', 'Software', 'Fictional product engineering studio for AlgoIntern demonstrations.', 'Bengaluru'),
    ('Pixel Harbor Demo', 'pixel-harbor-demo', null, 'https://example.com/companies/pixel-harbor-demo', 'Design Technology', 'Fictional design technology company used in the demo catalog.', 'Mumbai'),
    ('Cloudline Systems Demo', 'cloudline-systems-demo', null, 'https://example.com/companies/cloudline-systems-demo', 'Cloud Infrastructure', 'Fictional cloud infrastructure team for development testing.', 'Hyderabad'),
    ('Kite Analytics Demo', 'kite-analytics-demo', null, 'https://example.com/companies/kite-analytics-demo', 'Data and Analytics', 'Fictional analytics company used for discovery demonstrations.', 'Pune'),
    ('Sentinel Forge Demo', 'sentinel-forge-demo', null, 'https://example.com/companies/sentinel-forge-demo', 'Cybersecurity', 'Fictional security engineering company for demo listings.', 'Delhi'),
    ('Brightpath AI Demo', 'brightpath-ai-demo', null, 'https://example.com/companies/brightpath-ai-demo', 'Artificial Intelligence', 'Fictional applied AI lab for AlgoIntern development data.', 'Remote'),
    ('Orbit Commerce Demo', 'orbit-commerce-demo', null, 'https://example.com/companies/orbit-commerce-demo', 'Commerce Technology', 'Fictional commerce platform with student-friendly engineering projects.', 'Delhi'),
    ('Greenfield Digital Demo', 'greenfield-digital-demo', null, 'https://example.com/companies/greenfield-digital-demo', 'Digital Products', 'Fictional digital product studio for realistic catalog coverage.', 'Remote'),
    ('Vertex Networks Demo', 'vertex-networks-demo', null, 'https://example.com/companies/vertex-networks-demo', 'Networking', 'Fictional network systems company for development demonstrations.', 'Bengaluru')
),
inserted_companies as (
  insert into public.companies (name, normalized_name, logo_url, website_url, industry, description, headquarters)
  select name, normalized_name, logo_url, website_url, industry, description, headquarters
  from demo_companies
  where not exists (
    select 1 from public.companies existing
    where existing.normalized_name = demo_companies.normalized_name
  )
  returning id
)
select count(*) from inserted_companies;

with demo_sources (name, base_url, source_type, is_active) as (
  values
    ('AlgoIntern Demo Catalog', 'https://example.com/algointern-demo-catalog', 'import', true),
    ('AlgoIntern Demo Partner Feed', 'https://example.com/algointern-demo-feed', 'feed', true),
    ('AlgoIntern Demo Public Listings', 'https://example.com/algointern-demo-listings', 'public_listing', true)
)
insert into public.sources (name, base_url, source_type, is_active)
select demo.name, demo.base_url, demo.source_type, demo.is_active
from demo_sources demo
where not exists (
  select 1 from public.sources existing
  where existing.name = demo.name
);

with demo_internships (
  company_normalized_name, source_name, title, description, location, work_mode,
  employment_type, domain, skills, stipend_min, stipend_max, stipend_currency,
  duration, eligibility_cgpa, application_url, source_listing_id, posted_at, deadline
) as (
  values
    ('northstar-labs-demo', 'AlgoIntern Demo Catalog', 'Web Development Intern', 'Build responsive product pages and internal tools with a small product engineering team.', 'Bengaluru', 'Hybrid', 'Internship', 'Web Development', array['React', 'TypeScript', 'HTML', 'CSS'], 18000::numeric, 26000::numeric, 'INR', '3 months', 7.0::numeric, 'https://example.com/apply/demo-web-development-001', 'demo-web-development-001', now() - interval '2 days', now() + interval '26 days'),
    ('pixel-harbor-demo', 'AlgoIntern Demo Catalog', 'Frontend Development Intern', 'Translate thoughtful interface designs into accessible, polished web experiences.', 'Mumbai', 'On-site', 'Internship', 'Frontend Development', array['React', 'JavaScript', 'CSS', 'Figma'], 20000::numeric, 30000::numeric, 'INR', '4 months', 7.2::numeric, 'https://example.com/apply/demo-frontend-002', 'demo-frontend-002', now() - interval '5 days', now() + interval '18 days'),
    ('orbit-commerce-demo', 'AlgoIntern Demo Catalog', 'Backend Development Intern', 'Work on APIs, background jobs, and data services supporting a growing commerce platform.', 'Delhi', 'Hybrid', 'Internship', 'Backend Development', array['Node.js', 'PostgreSQL', 'REST APIs', 'Docker'], 22000::numeric, 32000::numeric, 'INR', '6 months', 7.5::numeric, 'https://example.com/apply/demo-backend-003', 'demo-backend-003', now() - interval '7 days', now() + interval '34 days'),
    ('northstar-labs-demo', 'AlgoIntern Demo Partner Feed', 'Software Engineering Intern', 'Ship production features across the stack while learning modern engineering practices.', 'Remote', 'Remote', 'Internship', 'Software Engineering', array['Python', 'React', 'Git', 'Testing'], 25000::numeric, 38000::numeric, 'INR', '6 months', 7.0::numeric, 'https://example.com/apply/demo-software-004', 'demo-software-004', now() - interval '1 day', now() + interval '41 days'),
    ('brightpath-ai-demo', 'AlgoIntern Demo Catalog', 'Machine Learning Intern', 'Prototype evaluation workflows and data pipelines for practical language applications.', 'Remote', 'Remote', 'Internship', 'AI/ML', array['Python', 'Pandas', 'scikit-learn', 'Jupyter'], 28000::numeric, 42000::numeric, 'INR', '5 months', 7.8::numeric, 'https://example.com/apply/demo-aiml-005', 'demo-aiml-005', now() - interval '4 days', now() + interval '29 days'),
    ('kite-analytics-demo', 'AlgoIntern Demo Partner Feed', 'Data Science Intern', 'Explore customer datasets, build experiments, and communicate findings to product teams.', 'Pune', 'Hybrid', 'Internship', 'Data Science', array['Python', 'SQL', 'Pandas', 'Statistics'], 24000::numeric, 36000::numeric, 'INR', '4 months', 7.3::numeric, 'https://example.com/apply/demo-data-science-006', 'demo-data-science-006', now() - interval '9 days', now() + interval '22 days'),
    ('sentinel-forge-demo', 'AlgoIntern Demo Public Listings', 'Cybersecurity Intern', 'Help investigate security signals and improve practical application security checklists.', 'Delhi', 'On-site', 'Internship', 'Cybersecurity', array['Linux', 'Networking', 'Python', 'OWASP'], 20000::numeric, 28000::numeric, 'INR', '3 months', 7.0::numeric, 'https://example.com/apply/demo-security-007', 'demo-security-007', now() - interval '12 days', now() + interval '15 days'),
    ('cloudline-systems-demo', 'AlgoIntern Demo Catalog', 'Cloud and DevOps Intern', 'Improve deployment workflows, observability, and infrastructure automation for engineering teams.', 'Hyderabad', 'Hybrid', 'Internship', 'Cloud/DevOps', array['AWS', 'Docker', 'Kubernetes', 'CI/CD'], 26000::numeric, 40000::numeric, 'INR', '6 months', 7.5::numeric, 'https://example.com/apply/demo-devops-008', 'demo-devops-008', now() - interval '3 days', now() + interval '38 days'),
    ('greenfield-digital-demo', 'AlgoIntern Demo Public Listings', 'Full Stack Web Intern', 'Build customer-facing workflows from database models through responsive interfaces.', 'Remote', 'Remote', 'Internship', 'Web Development', array['Next.js', 'TypeScript', 'Supabase', 'Tailwind CSS'], 18000::numeric, 27000::numeric, 'INR', '3 months', null, 'https://example.com/apply/demo-fullstack-009', 'demo-fullstack-009', now() - interval '15 days', now() + interval '9 days'),
    ('vertex-networks-demo', 'AlgoIntern Demo Partner Feed', 'Network Automation Intern', 'Create small automation tools that make network operations more observable and repeatable.', 'Bengaluru', 'On-site', 'Internship', 'Cloud/DevOps', array['Python', 'Linux', 'Networking', 'Ansible'], 23000::numeric, 34000::numeric, 'INR', '5 months', 7.4::numeric, 'https://example.com/apply/demo-network-010', 'demo-network-010', now() - interval '18 days', now() + interval '31 days'),
    ('brightpath-ai-demo', 'AlgoIntern Demo Public Listings', 'AI Research Assistant Intern', 'Support experiments, dataset preparation, and reproducible evaluation for applied AI research.', 'Hyderabad', 'Hybrid', 'Internship', 'AI/ML', array['Python', 'PyTorch', 'NLP', 'Git'], 30000::numeric, 45000::numeric, 'INR', '6 months', 8.0::numeric, 'https://example.com/apply/demo-ai-research-011', 'demo-ai-research-011', now() - interval '21 days', now() + interval '44 days'),
    ('kite-analytics-demo', 'AlgoIntern Demo Catalog', 'Business Intelligence Intern', 'Turn operational data into clear dashboards and concise recommendations for internal teams.', 'Mumbai', 'Hybrid', 'Internship', 'Data Science', array['SQL', 'Power BI', 'Excel', 'Data Visualization'], 17000::numeric, 25000::numeric, 'INR', '3 months', 6.8::numeric, 'https://example.com/apply/demo-bi-012', 'demo-bi-012', now() - interval '24 days', now() + interval '12 days'),
    ('orbit-commerce-demo', 'AlgoIntern Demo Public Listings', 'Mobile and Frontend Intern', 'Prototype mobile-first commerce experiences and reusable interface components.', 'Pune', 'On-site', 'Internship', 'Frontend Development', array['React Native', 'JavaScript', 'REST APIs', 'Git'], 19000::numeric, 29000::numeric, 'INR', '4 months', 7.0::numeric, 'https://example.com/apply/demo-mobile-013', 'demo-mobile-013', now() - interval '28 days', now() + interval '25 days'),
    ('sentinel-forge-demo', 'AlgoIntern Demo Catalog', 'Security Engineering Intern', 'Assist with threat modeling, security testing, and documentation for developer tools.', 'Remote', 'Remote', 'Internship', 'Cybersecurity', array['Python', 'Web Security', 'Linux', 'Threat Modeling'], 27000::numeric, 39000::numeric, 'INR', '5 months', 7.6::numeric, 'https://example.com/apply/demo-security-014', 'demo-security-014', now() - interval '31 days', now() + interval '36 days'),
    ('cloudline-systems-demo', 'AlgoIntern Demo Public Listings', 'Platform Engineering Intern', 'Learn how reliable platforms are built through automation, monitoring, and service ownership.', 'Remote', 'Hybrid', 'Internship', 'Software Engineering', array['Go', 'Docker', 'Terraform', 'Observability'], 29000::numeric, 43000::numeric, 'INR', '6 months', 7.7::numeric, 'https://example.com/apply/demo-platform-015', 'demo-platform-015', now() - interval '36 days', now() + interval '20 days')
)
insert into public.internships (
  company_id, source_id, title, description, location, work_mode, employment_type,
  domain, skills, stipend_min, stipend_max, stipend_currency, duration,
  eligibility_cgpa, application_url, source_listing_id, posted_at, deadline, is_active
)
select
  company.id,
  source.id,
  demo.title,
  demo.description,
  demo.location,
  demo.work_mode,
  demo.employment_type,
  demo.domain,
  demo.skills,
  demo.stipend_min,
  demo.stipend_max,
  demo.stipend_currency,
  demo.duration,
  demo.eligibility_cgpa,
  demo.application_url,
  demo.source_listing_id,
  demo.posted_at,
  demo.deadline,
  true
from demo_internships demo
join public.companies company on company.normalized_name = demo.company_normalized_name
join public.sources source on source.name = demo.source_name
where not exists (
  select 1 from public.internships existing
  where existing.source_listing_id = demo.source_listing_id
);
