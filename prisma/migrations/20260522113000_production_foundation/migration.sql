-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CommodityStatus" AS ENUM ('draft', 'verified', 'published');

-- CreateEnum
CREATE TYPE "SubmissionSource" AS ENUM ('admin', 'respondent', 'spike');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'submitted', 'verified', 'published');

-- CreateEnum
CREATE TYPE "CalculationStatus" AS ENUM ('draft', 'verified', 'published', 'insufficient_data', 'no_data');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'respondent', 'member');

-- CreateEnum
CREATE TYPE "RespondentStatus" AS ENUM ('active', 'pending', 'disabled');

-- CreateEnum
CREATE TYPE "RespondentCollectionMode" AS ENUM ('self_service', 'manual_outreach');

-- CreateEnum
CREATE TYPE "PasswordSetupStatus" AS ENUM ('temporary', 'active', 'reset_required');

-- CreateTable
CREATE TABLE "Commodity" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameUk" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'metric_ton',
    "status" "CommodityStatus" NOT NULL DEFAULT 'published',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commodity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryBasis" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "status" "CommodityStatus" NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryBasis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Respondent" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "RespondentStatus" NOT NULL DEFAULT 'active',
    "collectionMode" "RespondentCollectionMode" NOT NULL DEFAULT 'self_service',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Respondent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespondentContact" (
    "id" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Primary contact',
    "phone" TEXT,
    "email" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RespondentContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespondentAuthAccount" (
    "id" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "loginEmail" TEXT NOT NULL,
    "passwordHash" TEXT,
    "temporaryPassword" TEXT,
    "passwordSetupStatus" "PasswordSetupStatus" NOT NULL DEFAULT 'temporary',
    "lastGeneratedAt" TIMESTAMP(3),
    "passwordSetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RespondentAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespondentEmailSchedule" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "workdays" TEXT NOT NULL DEFAULT 'Monday-Friday',
    "sendTime" TEXT NOT NULL DEFAULT '16:30',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Kyiv',
    "sender" TEXT NOT NULL DEFAULT 'UGA Index <onboarding@resend.dev>',
    "replyTo" TEXT,
    "subject" TEXT NOT NULL DEFAULT 'UGA Index daily price survey',
    "surveyUrl" TEXT NOT NULL DEFAULT '/respondent',
    "template" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RespondentEmailSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespondentEmailDelivery" (
    "id" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "contactId" TEXT,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "providerId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespondentEmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespondentSurveyToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "contactId" TEXT,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespondentSurveyToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Basket" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deliveryBasisId" TEXT NOT NULL,
    "weight" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Basket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasketRespondent" (
    "id" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "weight" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BasketRespondent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "respondentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT,
    "temporaryPassword" TEXT,
    "passwordSetupStatus" "PasswordSetupStatus" NOT NULL DEFAULT 'temporary',
    "lastGeneratedAt" TIMESTAMP(3),
    "passwordSetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSubmission" (
    "id" TEXT NOT NULL,
    "tradeDate" DATE NOT NULL,
    "commodityId" TEXT NOT NULL,
    "deliveryBasisId" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "submittedById" TEXT,
    "source" "SubmissionSource" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "priceUsdPerMt" DECIMAL(12,2) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalIndicative" (
    "id" TEXT NOT NULL,
    "tradeDate" DATE NOT NULL,
    "commodityId" TEXT NOT NULL,
    "deliveryBasisId" TEXT NOT NULL,
    "source" "SubmissionSource" NOT NULL DEFAULT 'spike',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'submitted',
    "priceUsdPerMt" DECIMAL(12,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ExternalIndicative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexCalculation" (
    "id" TEXT NOT NULL,
    "tradeDate" DATE NOT NULL,
    "commodityId" TEXT NOT NULL,
    "deliveryBasisId" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "status" "CalculationStatus" NOT NULL,
    "medianUsdPerMt" DECIMAL(12,4),
    "valueUsdPerMt" DECIMAL(12,4),
    "publicValueUsdPerMt" DECIMAL(12,1),
    "rawCount" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "basketWeight" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedById" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexCalculationItem" (
    "id" TEXT NOT NULL,
    "calculationId" TEXT NOT NULL,
    "priceSubmissionId" TEXT,
    "respondentId" TEXT,
    "priceUsdPerMt" DECIMAL(12,2) NOT NULL,
    "included" BOOLEAN NOT NULL,
    "deviationPct" DECIMAL(10,4),
    "exclusionReason" TEXT,

    CONSTRAINT "IndexCalculationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedIndex" (
    "id" TEXT NOT NULL,
    "tradeDate" DATE NOT NULL,
    "commodityId" TEXT NOT NULL,
    "deliveryBasisId" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "calculationId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'published',
    "calculatedValueUsdPerMt" DECIMAL(12,1),
    "benchmarkBlendEnabled" BOOLEAN NOT NULL DEFAULT false,
    "benchmarkValueUsdPerMt" DECIMAL(12,1),
    "adjustmentMethod" TEXT,
    "adjustmentReason" TEXT,
    "valueUsdPerMt" DECIMAL(12,1) NOT NULL,
    "changeAbsUsdPerMt" DECIMAL(12,1),
    "changePct" DECIMAL(10,2),
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishedIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "UserRole",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commodity_code_key" ON "Commodity"("code");

-- CreateIndex
CREATE INDEX "Commodity_status_sortOrder_idx" ON "Commodity"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryBasis_code_key" ON "DeliveryBasis"("code");

-- CreateIndex
CREATE INDEX "Respondent_status_collectionMode_idx" ON "Respondent"("status", "collectionMode");

-- CreateIndex
CREATE INDEX "RespondentContact_respondentId_primary_active_idx" ON "RespondentContact"("respondentId", "primary", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RespondentAuthAccount_respondentId_key" ON "RespondentAuthAccount"("respondentId");

-- CreateIndex
CREATE UNIQUE INDEX "RespondentAuthAccount_loginEmail_key" ON "RespondentAuthAccount"("loginEmail");

-- CreateIndex
CREATE INDEX "RespondentAuthAccount_passwordSetupStatus_idx" ON "RespondentAuthAccount"("passwordSetupStatus");

-- CreateIndex
CREATE INDEX "RespondentEmailDelivery_respondentId_sentAt_idx" ON "RespondentEmailDelivery"("respondentId", "sentAt");

-- CreateIndex
CREATE INDEX "RespondentEmailDelivery_status_trigger_sentAt_idx" ON "RespondentEmailDelivery"("status", "trigger", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "RespondentSurveyToken_token_key" ON "RespondentSurveyToken"("token");

-- CreateIndex
CREATE INDEX "RespondentSurveyToken_respondentId_expiresAt_idx" ON "RespondentSurveyToken"("respondentId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Basket_code_key" ON "Basket"("code");

-- CreateIndex
CREATE INDEX "Basket_deliveryBasisId_active_idx" ON "Basket"("deliveryBasisId", "active");

-- CreateIndex
CREATE INDEX "BasketRespondent_respondentId_active_idx" ON "BasketRespondent"("respondentId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BasketRespondent_basketId_respondentId_key" ON "BasketRespondent"("basketId", "respondentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE INDEX "PriceSubmission_tradeDate_commodityId_deliveryBasisId_statu_idx" ON "PriceSubmission"("tradeDate", "commodityId", "deliveryBasisId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSubmission_tradeDate_commodityId_deliveryBasisId_respo_key" ON "PriceSubmission"("tradeDate", "commodityId", "deliveryBasisId", "respondentId", "source");

-- CreateIndex
CREATE INDEX "ExternalIndicative_tradeDate_source_status_idx" ON "ExternalIndicative"("tradeDate", "source", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIndicative_tradeDate_commodityId_deliveryBasisId_so_key" ON "ExternalIndicative"("tradeDate", "commodityId", "deliveryBasisId", "source");

-- CreateIndex
CREATE INDEX "IndexCalculation_tradeDate_status_idx" ON "IndexCalculation"("tradeDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IndexCalculation_tradeDate_commodityId_deliveryBasisId_bask_key" ON "IndexCalculation"("tradeDate", "commodityId", "deliveryBasisId", "basketId");

-- CreateIndex
CREATE INDEX "IndexCalculationItem_calculationId_included_idx" ON "IndexCalculationItem"("calculationId", "included");

-- CreateIndex
CREATE INDEX "IndexCalculationItem_respondentId_idx" ON "IndexCalculationItem"("respondentId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedIndex_calculationId_key" ON "PublishedIndex"("calculationId");

-- CreateIndex
CREATE INDEX "PublishedIndex_tradeDate_locked_idx" ON "PublishedIndex"("tradeDate", "locked");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedIndex_tradeDate_commodityId_deliveryBasisId_basket_key" ON "PublishedIndex"("tradeDate", "commodityId", "deliveryBasisId", "basketId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "RespondentContact" ADD CONSTRAINT "RespondentContact_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespondentAuthAccount" ADD CONSTRAINT "RespondentAuthAccount_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespondentEmailDelivery" ADD CONSTRAINT "RespondentEmailDelivery_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespondentSurveyToken" ADD CONSTRAINT "RespondentSurveyToken_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Basket" ADD CONSTRAINT "Basket_deliveryBasisId_fkey" FOREIGN KEY ("deliveryBasisId") REFERENCES "DeliveryBasis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketRespondent" ADD CONSTRAINT "BasketRespondent_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "Basket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketRespondent" ADD CONSTRAINT "BasketRespondent_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSubmission" ADD CONSTRAINT "PriceSubmission_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSubmission" ADD CONSTRAINT "PriceSubmission_deliveryBasisId_fkey" FOREIGN KEY ("deliveryBasisId") REFERENCES "DeliveryBasis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSubmission" ADD CONSTRAINT "PriceSubmission_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSubmission" ADD CONSTRAINT "PriceSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalIndicative" ADD CONSTRAINT "ExternalIndicative_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalIndicative" ADD CONSTRAINT "ExternalIndicative_deliveryBasisId_fkey" FOREIGN KEY ("deliveryBasisId") REFERENCES "DeliveryBasis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexCalculation" ADD CONSTRAINT "IndexCalculation_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexCalculation" ADD CONSTRAINT "IndexCalculation_deliveryBasisId_fkey" FOREIGN KEY ("deliveryBasisId") REFERENCES "DeliveryBasis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexCalculation" ADD CONSTRAINT "IndexCalculation_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "Basket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexCalculation" ADD CONSTRAINT "IndexCalculation_calculatedById_fkey" FOREIGN KEY ("calculatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexCalculationItem" ADD CONSTRAINT "IndexCalculationItem_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "IndexCalculation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexCalculationItem" ADD CONSTRAINT "IndexCalculationItem_priceSubmissionId_fkey" FOREIGN KEY ("priceSubmissionId") REFERENCES "PriceSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexCalculationItem" ADD CONSTRAINT "IndexCalculationItem_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedIndex" ADD CONSTRAINT "PublishedIndex_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedIndex" ADD CONSTRAINT "PublishedIndex_deliveryBasisId_fkey" FOREIGN KEY ("deliveryBasisId") REFERENCES "DeliveryBasis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedIndex" ADD CONSTRAINT "PublishedIndex_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "Basket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedIndex" ADD CONSTRAINT "PublishedIndex_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "IndexCalculation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedIndex" ADD CONSTRAINT "PublishedIndex_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
