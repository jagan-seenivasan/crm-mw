const { Lead, Task, Opportunity } = require('../models');

async function getDashboard(req, res, next) {
  try {
    const [leadCount, taskCount, completedTasks, pipelineValue, opportunityCount, opportunityValueTotal, opportunityByStage] =
      await Promise.all([
        Lead.countDocuments({ tenantId: req.tenantId }),
        Task.countDocuments({ tenantId: req.tenantId }),
        Task.countDocuments({ tenantId: req.tenantId, status: 'DONE' }),
        Lead.aggregate([
          { $match: { tenantId: req.tenantId } },
          { $group: { _id: null, total: { $sum: '$value' } } }
        ]),
        Opportunity.countDocuments({ tenantId: req.tenantId }),
        Opportunity.aggregate([
          { $match: { tenantId: req.tenantId } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Opportunity.aggregate([
          { $match: { tenantId: req.tenantId } },
          {
            $lookup: {
              from: 'stages',
              let: { stageId: '$stageId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$stageId'] }, { $eq: ['$tenantId', req.tenantId] }]
                    }
                  }
                },
                { $project: { name: 1, order: 1 } }
              ],
              as: 'stage'
            }
          },
          { $unwind: { path: '$stage', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: '$stageId',
              stageName: { $first: { $ifNull: ['$stage.name', 'Unassigned'] } },
              stageOrder: { $first: { $ifNull: ['$stage.order', 9999] } },
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          },
          { $sort: { stageOrder: 1, stageName: 1 } },
          { $project: { _id: 0, stageId: '$_id', stageName: 1, count: 1, totalAmount: 1 } }
        ])
      ]);

    res.json({
      leadCount,
      taskCount,
      completedTasks,
      pipelineValue: pipelineValue[0]?.total || 0,
      opportunityCount,
      opportunityValueTotal: opportunityValueTotal[0]?.total || 0,
      opportunityByStage
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard };
