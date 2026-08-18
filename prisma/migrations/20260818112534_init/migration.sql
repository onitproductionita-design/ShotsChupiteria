-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "emoji" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "dailyNumber" INTEGER,
    "serviceDay" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customerName" TEXT,
    "note" TEXT,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "redeemToken" TEXT NOT NULL,
    "paymentRef" TEXT,
    "paymentMethod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "servedAt" DATETIME,
    "servedBy" TEXT
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "unitCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyCounter" (
    "serviceDay" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_category_sortOrder_idx" ON "Product"("category", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentRef_key" ON "Order"("paymentRef");

-- CreateIndex
CREATE INDEX "Order_status_paidAt_idx" ON "Order"("status", "paidAt");

-- CreateIndex
CREATE INDEX "Order_serviceDay_dailyNumber_idx" ON "Order"("serviceDay", "dailyNumber");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
