const { createExpressMiddleware } = require('@trpc/server/adapters/express');
const { appRouter } = require('./root');

function createContext({ req, res }) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  return {
    req,
    res,
    token,
  };
}

const trpcExpress = createExpressMiddleware({
  router: appRouter,
  createContext,
});

module.exports = { trpcExpress, appRouter };
