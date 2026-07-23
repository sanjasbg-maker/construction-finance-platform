-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "openingBalanceCurrency" "Currency" NOT NULL DEFAULT 'EUR';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "openingBalanceCurrency" "Currency" NOT NULL DEFAULT 'EUR';
