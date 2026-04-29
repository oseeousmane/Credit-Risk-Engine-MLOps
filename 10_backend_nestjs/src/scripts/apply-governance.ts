import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const metadataPath = path.join(__dirname, '..', '..', '..', 'validation_metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error(`validation_metadata.json not found at: ${metadataPath}`);
    return;
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

  // Find the latest model version
  const latestVersion = await prisma.modelVersion.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { registry: true }
  });

  if (!latestVersion) {
    console.error('No model versions found to update.');
    return;
  }

  console.log(`Updating Model Version: ${latestVersion.registry.name} (${latestVersion.versionTag})`);

  const updated = await prisma.modelVersion.update({
    where: { id: latestVersion.id },
    data: {
      artifactCategory: metadata.artifactCategory,
      oot_auc: metadata.oot_auc,
      oot_ks: metadata.oot_ks,
      oot_psi: metadata.oot_psi,
      oot_period_start: new Date(metadata.oot_period_start),
      oot_period_end: new Date(metadata.oot_period_end),
      validationStatus: metadata.validationStatus,
    }
  });

  console.log('âœ… Governance metadata successfully applied to Prisma.');
  console.log(JSON.stringify(updated, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect());
