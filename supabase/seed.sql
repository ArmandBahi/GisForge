-- Demo client for local development
INSERT INTO administration.client (name, slug)
VALUES ('Greenvolt Demo', 'demo')
ON CONFLICT (slug) DO NOTHING;
