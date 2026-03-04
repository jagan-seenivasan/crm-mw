const mongoose = require('mongoose');
const ApiError = require('../utils/apiError');
const { Account, Contact, Opportunity, Lead, Stage } = require('../models');

function splitLeadName(title = '') {
  const parts = String(title).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: 'Lead', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function runConversion({ tenantId, leadId, payload, actorId }, session = null) {
  const findOptions = session ? { tenantId, session } : { tenantId };
  const lead = await Lead.findOne({ _id: leadId }, null, findOptions);
  if (!lead) throw new ApiError(404, 'Lead not found');
  if (lead.isConverted) throw new ApiError(409, 'Lead is already converted');

  let account = null;

  if (payload.accountMode === 'existing') {
    if (!payload.existingAccountId) {
      throw new ApiError(400, 'existingAccountId is required for existing account mode');
    }
    account = await Account.findOne({ _id: payload.existingAccountId }, null, findOptions);
    if (!account) throw new ApiError(404, 'Selected account not found');
  } else {
    const accountData = payload.account || {};
    const name = accountData.name || lead.company || lead.title;
    if (!name) throw new ApiError(400, 'Account name is required');
    account = await Account.create(
      [
        {
          tenantId,
          name,
          email: accountData.email || lead.email || '',
          phone: accountData.phone || lead.phone || '',
          website: accountData.website || '',
          industry: accountData.industry || '',
          billingAddress: accountData.billingAddress || '',
          notes: accountData.notes || ''
        }
      ],
      session ? { session } : {}
    ).then((docs) => docs[0]);
  }

  const nameParts = splitLeadName(lead.title);
  const contactData = payload.contact || {};
  const contact = await Contact.create(
    [
      {
        tenantId,
        accountId: account._id,
        firstName: contactData.firstName || nameParts.firstName,
        lastName: contactData.lastName || nameParts.lastName,
        email: contactData.email || lead.email,
        phone: contactData.phone || lead.phone || '',
        title: contactData.title || ''
      }
    ],
    session ? { session } : {}
  ).then((docs) => docs[0]);

  let opportunity = null;
  if (payload.createOpportunity) {
    const opportunityData = payload.opportunity || {};
    const stage = await Stage.findOne(
      { tenantId, type: 'OPPORTUNITY' },
      null,
      session ? { tenantId, session }
        : { tenantId }
    ).sort({ order: 1 });

    if (!stage) {
      throw new ApiError(400, 'No OPPORTUNITY stages configured. Create opportunity stages first.');
    }

    opportunity = await Opportunity.create(
      [
        {
          tenantId,
          name: opportunityData.name || `${lead.title} Opportunity`,
          amount: Number(opportunityData.amount ?? lead.value ?? 0),
          status: opportunityData.status || 'OPEN',
          stageId: opportunityData.stageId || stage._id,
          accountId: account._id,
          contactId: contact._id,
          leadId: lead._id,
          expectedCloseDate: opportunityData.expectedCloseDate || null
        }
      ],
      session ? { session } : {}
    ).then((docs) => docs[0]);
  }

  lead.isConverted = true;
  lead.convertedAt = new Date();
  lead.accountId = account._id;
  lead.contactId = contact._id;
  lead.opportunityId = opportunity?._id || null;
  await lead.save(session ? { session } : {});

  return {
    leadId: lead._id,
    accountId: account._id,
    contactId: contact._id,
    opportunityId: opportunity?._id || null,
    actorId
  };
}

async function convertLead(payload) {
  let session = null;
  try {
    session = await mongoose.startSession();
    let result = null;
    await session.withTransaction(async () => {
      result = await runConversion(payload, session);
    });
    return result;
  } catch (error) {
    const message = String(error?.message || '');
    const noTxnSupport =
      message.includes('Transaction numbers are only allowed') ||
      message.includes('replica set') ||
      message.includes('standalone');

    if (noTxnSupport) {
      return runConversion(payload, null);
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = { convertLead };
