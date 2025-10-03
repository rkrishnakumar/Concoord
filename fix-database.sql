-- Add missing columns to acc_credentials table
ALTER TABLE acc_credentials ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE acc_credentials ADD COLUMN IF NOT EXISTS "clientSecret" TEXT;

-- Add missing columns to procore_credentials table  
ALTER TABLE procore_credentials ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE procore_credentials ADD COLUMN IF NOT EXISTS "clientSecret" TEXT;

-- Add missing columns to revizto_credentials table
ALTER TABLE revizto_credentials ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE revizto_credentials ADD COLUMN IF NOT EXISTS "clientSecret" TEXT;
