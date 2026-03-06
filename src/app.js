const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./config/env');
const setupSwagger = require('./config/swagger');
const tenantResolver = require('./middleware/tenantResolver');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const userRoutes = require('./routes/userRoutes');
const leadRoutes = require('./routes/leadRoutes');
const stageRoutes = require('./routes/stageRoutes');
const taskRoutes = require('./routes/taskRoutes');
const contactRoutes = require('./routes/contactRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const accountRoutes = require('./routes/accountRoutes');
const noteRoutes = require('./routes/noteRoutes');
const activityRoutes = require('./routes/activityRoutes');
const activityTimelineRoutes = require('./routes/activityTimelineRoutes');
const searchRoutes = require('./routes/searchRoutes');
const savedFilterRoutes = require('./routes/savedFilterRoutes');
const permissionConfigRoutes = require('./routes/permissionConfigRoutes');
const platformRoutes = require('./routes/platformRoutes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true
  })
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(tenantResolver);

setupSwagger(app);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/activity-timeline', activityTimelineRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/saved-filters', savedFilterRoutes);
app.use('/api/permission-config', permissionConfigRoutes);
app.use('/api/platform', platformRoutes);

app.use(errorHandler);

module.exports = app;
