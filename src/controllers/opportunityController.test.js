const test = require('node:test');
const assert = require('node:assert/strict');
const { __test } = require('./opportunityController');

test('hasStageChanged returns false when stage id is unchanged', () => {
  const result = __test.hasStageChanged('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011');
  assert.equal(result, false);
});

test('hasStageChanged returns true when stage id is changed', () => {
  const result = __test.hasStageChanged('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');
  assert.equal(result, true);
});

test('recordStageHistoryIfChanged does not create history when stage is unchanged', async () => {
  const calls = [];
  const fakeRepo = {
    create: async (...args) => {
      calls.push(args);
    }
  };

  const created = await __test.recordStageHistoryIfChanged(
    {
      tenantId: 'demo-tenant',
      opportunityId: '507f1f77bcf86cd799439013',
      beforeStageId: '507f1f77bcf86cd799439011',
      afterStageId: '507f1f77bcf86cd799439011',
      actorId: '507f1f77bcf86cd799439014'
    },
    { opportunityStageHistoryRepository: fakeRepo }
  );

  assert.equal(created, false);
  assert.equal(calls.length, 0);
});

test('recordStageHistoryIfChanged creates history when stage is changed', async () => {
  const calls = [];
  const fakeRepo = {
    create: async (...args) => {
      calls.push(args);
    }
  };

  const created = await __test.recordStageHistoryIfChanged(
    {
      tenantId: 'demo-tenant',
      opportunityId: '507f1f77bcf86cd799439013',
      beforeStageId: '507f1f77bcf86cd799439011',
      afterStageId: '507f1f77bcf86cd799439012',
      actorId: '507f1f77bcf86cd799439014'
    },
    { opportunityStageHistoryRepository: fakeRepo }
  );

  assert.equal(created, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'demo-tenant');
  assert.equal(String(calls[0][1].oldStage), '507f1f77bcf86cd799439011');
  assert.equal(String(calls[0][1].newStage), '507f1f77bcf86cd799439012');
});
