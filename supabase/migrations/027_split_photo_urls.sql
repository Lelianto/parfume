-- Add photo_urls array column for multiple product photos (up to 4)
-- Keep bottle_photo_url as primary photo for backward compatibility (cards, OG images, etc.)
ALTER TABLE splits ADD COLUMN photo_urls text[] DEFAULT '{}';

-- Backfill existing data: copy bottle_photo_url into photo_urls array
UPDATE splits
SET photo_urls = ARRAY[bottle_photo_url]
WHERE bottle_photo_url IS NOT NULL AND (photo_urls IS NULL OR photo_urls = '{}');
