-- Add optional variant field to perfumes (e.g. LILAC, CHROMA, UTOPIA for brand HMNS)
ALTER TABLE perfumes ADD COLUMN variant text;
