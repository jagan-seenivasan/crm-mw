const { query } = require('express-validator');
const { Lead, Account, Contact, Opportunity } = require('../models');

const searchValidation = [
  query('q').trim().isLength({ min: 1 }).withMessage('q is required'),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 20 })
    .withMessage('limit must be between 1 and 20')
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function search(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Number(req.query.limit || 5);
    const regex = new RegExp(escapeRegex(q), 'i');
    const tenantId = req.tenantId;

    const [leads, accounts, contacts, opportunities] = await Promise.all([
      Lead.find(
        {
          tenantId,
          $or: [{ title: regex }, { email: regex }, { phone: regex }, { company: regex }]
        },
        { title: 1, email: 1, company: 1, createdAt: 1 },
        { tenantId }
      )
        .sort({ createdAt: -1 })
        .limit(limit),
      Account.find(
        {
          tenantId,
          $or: [{ name: regex }, { email: regex }, { phone: regex }, { industry: regex }]
        },
        { name: 1, email: 1, phone: 1, createdAt: 1 },
        { tenantId }
      )
        .sort({ createdAt: -1 })
        .limit(limit),
      Contact.find(
        {
          tenantId,
          $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }]
        },
        { firstName: 1, lastName: 1, email: 1, createdAt: 1 },
        { tenantId }
      )
        .sort({ createdAt: -1 })
        .limit(limit),
      Opportunity.find(
        {
          tenantId,
          $or: [{ name: regex }, { status: regex }]
        },
        { name: 1, status: 1, amount: 1, createdAt: 1 },
        { tenantId }
      )
        .sort({ createdAt: -1 })
        .limit(limit)
    ]);

    res.json({
      query: q,
      results: [
        ...leads.map((item) => ({
          entityType: 'LEAD',
          id: String(item._id),
          title: item.title,
          subtitle: [item.email, item.company].filter(Boolean).join(' | ')
        })),
        ...accounts.map((item) => ({
          entityType: 'ACCOUNT',
          id: String(item._id),
          title: item.name,
          subtitle: [item.email, item.phone].filter(Boolean).join(' | ')
        })),
        ...contacts.map((item) => ({
          entityType: 'CONTACT',
          id: String(item._id),
          title: `${item.firstName || ''} ${item.lastName || ''}`.trim(),
          subtitle: item.email || ''
        })),
        ...opportunities.map((item) => ({
          entityType: 'OPPORTUNITY',
          id: String(item._id),
          title: item.name,
          subtitle: `${item.status || ''}${typeof item.amount === 'number' ? ` | ${item.amount}` : ''}`
        }))
      ]
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchValidation,
  search
};
