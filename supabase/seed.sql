-- Demo organization for local development
INSERT INTO administration.organization (name, slug)
VALUES ('Organisation démo', 'demo')
ON CONFLICT (slug) DO NOTHING;
