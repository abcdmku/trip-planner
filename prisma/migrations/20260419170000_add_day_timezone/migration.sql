ALTER TABLE "Day"
ADD COLUMN "timezone" TEXT;

UPDATE "Day" AS d
SET "timezone" = t."baseTimezone"
FROM "Trip" AS t
WHERE t."id" = d."tripId";

UPDATE "Day"
SET "timezone" = 'UTC'
WHERE "timezone" IS NULL;

ALTER TABLE "Day"
ALTER COLUMN "timezone" SET NOT NULL;
