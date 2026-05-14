-- CreateEnum
CREATE TYPE "Quadrant" AS ENUM ('DO_NOW', 'MAKE_EASY_THEN_DO', 'DO_WHEN_PASSING', 'IGNORE');

-- CreateTable
CREATE TABLE "Matrix" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Matrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "matrixId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "quadrant" "Quadrant" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Matrix_slug_key" ON "Matrix"("slug");

-- CreateIndex
CREATE INDEX "Topic_matrixId_quadrant_idx" ON "Topic"("matrixId", "quadrant");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

