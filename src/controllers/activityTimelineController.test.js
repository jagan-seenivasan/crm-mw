const test = require('node:test');
const assert = require('node:assert/strict');
const { __test } = require('./activityTimelineController');

test('normalizeEntityType converts mixed case to upper case', () => {
  assert.equal(__test.normalizeEntityType('Lead'), 'LEAD');
  assert.equal(__test.normalizeEntityType('opportunity'), 'OPPORTUNITY');
});

test('getStageChangeFromAudit extracts stage changes from metadata', () => {
  const result = __test.getStageChangeFromAudit({
    metadata: {
      before: { stageId: 'aaa' },
      after: { stageId: 'bbb' }
    }
  });

  assert.deepEqual(result, {
    beforeStageId: 'aaa',
    afterStageId: 'bbb'
  });
});

test('toTimelineSort sorts newest first', () => {
  const items = [
    { createdAt: '2026-01-01T00:00:00.000Z' },
    { createdAt: '2026-01-03T00:00:00.000Z' },
    { createdAt: '2026-01-02T00:00:00.000Z' }
  ];
  const sorted = items.sort(__test.toTimelineSort);
  assert.equal(sorted[0].createdAt, '2026-01-03T00:00:00.000Z');
  assert.equal(sorted[2].createdAt, '2026-01-01T00:00:00.000Z');
});
