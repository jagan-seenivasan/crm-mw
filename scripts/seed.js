require('dotenv').config();
const connectDB = require('../src/config/db');
const { Tenant, User, Stage } = require('../src/models');

async function seed() {
  await connectDB();

  const tenantCode = 'demo-tenant';
  const tenant = await Tenant.findOneAndUpdate(
    { code: tenantCode },
    { name: 'Demo Tenant', code: tenantCode, isActive: true },
    { new: true, upsert: true }
  );

  const ownerEmail = 'owner@demo.com';
  const existingOwner = await User.findOne({ tenantId: tenant.code, email: ownerEmail }).select('+password');

  if (!existingOwner) {
    await User.create({
      tenantId: tenant.code,
      name: 'Demo Owner',
      email: ownerEmail,
      password: 'Password@123',
      role: 'OWNER',
      isActive: true
    });
  } else {
    // Keep demo credentials deterministic across repeated seed runs.
    existingOwner.name = 'Demo Owner';
    existingOwner.role = 'OWNER';
    existingOwner.isActive = true;
    existingOwner.password = 'Password@123';
    await existingOwner.save();
  }

  const leadDefaults = [
    { name: 'New', order: 1 },
    { name: 'Contacted', order: 2 },
    { name: 'Qualified', order: 3 },
    { name: 'Proposal', order: 4 },
    { name: 'Won', order: 5 }
  ];

  for (const stage of leadDefaults) {
    await Stage.findOneAndUpdate(
      { tenantId: tenant.code, type: 'LEAD', name: stage.name },
      { tenantId: tenant.code, type: 'LEAD', ...stage },
      { upsert: true }
    );
  }

  const opportunityDefaults = [
    { name: 'Prospecting', order: 1 },
    { name: 'Discovery', order: 2 },
    { name: 'Proposal', order: 3 },
    { name: 'Negotiation', order: 4 },
    { name: 'Closed Won', order: 5 }
  ];

  for (const stage of opportunityDefaults) {
    await Stage.findOneAndUpdate(
      { tenantId: tenant.code, type: 'OPPORTUNITY', name: stage.name },
      { tenantId: tenant.code, type: 'OPPORTUNITY', ...stage },
      { upsert: true }
    );
  }

  console.log('Seed complete');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
