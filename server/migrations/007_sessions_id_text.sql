-- Change sessions id column from UUID to TEXT
ALTER TABLE sessions 
  ALTER COLUMN id TYPE TEXT USING id::TEXT,
  ALTER COLUMN id DROP DEFAULT;
