-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "duocUsername" TEXT NOT NULL DEFAULT '',
    "duocPassword" TEXT NOT NULL DEFAULT '',
    "duocStoreId" TEXT,
    "duocWarehouseCode" TEXT,
    "qd228AppName" TEXT,
    "qd228AppKey" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TransactionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "referenceNumber" TEXT,
    "items" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT
);
