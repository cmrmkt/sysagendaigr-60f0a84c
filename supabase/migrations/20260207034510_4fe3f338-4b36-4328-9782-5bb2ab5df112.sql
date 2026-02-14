-- Extend trial period for Igreja Teste ABC by 2 more days
UPDATE organizations 
SET trial_ends_at = NOW() + INTERVAL '2 days'
WHERE id = '5a772c9c-6322-4557-a4f0-1f3feee2e658';