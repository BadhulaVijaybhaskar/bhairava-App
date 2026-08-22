-- CreateEnum
CREATE TYPE "PlotInterestType" AS ENUM ('VIEWED', 'INTERESTED', 'CALLBACK_REQUEST', 'WAITLIST', 'OFFER');

-- CreateTable
CREATE TABLE "plot_interests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "plot_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "guest_name" TEXT,
    "guest_mobile" TEXT,
    "guest_email" TEXT,
    "type" "PlotInterestType" NOT NULL DEFAULT 'INTERESTED',
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'APP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plot_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plot_interests_organization_id_created_at_idx" ON "plot_interests"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "plot_interests_plot_id_created_at_idx" ON "plot_interests"("plot_id", "created_at");

-- CreateIndex
CREATE INDEX "plot_interests_project_id_created_at_idx" ON "plot_interests"("project_id", "created_at");

-- AddForeignKey
ALTER TABLE "plot_interests" ADD CONSTRAINT "plot_interests_plot_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
