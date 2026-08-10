-- Public event routes use the slug without an organization prefix.
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
