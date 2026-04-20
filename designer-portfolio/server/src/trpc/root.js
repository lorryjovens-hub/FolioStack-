const { router } = require('./trpc');
const { authRouter } = require('./routers/auth.router');

const appRouter = router({
  auth: authRouter,
});

module.exports = { appRouter };
