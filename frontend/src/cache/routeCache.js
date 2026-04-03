let routeCache = null;

export const getCachedRoutes = () => routeCache;

export const setCachedRoutes = (routes) => {
  routeCache = routes;
};

export const clearRouteCache = () => {
  routeCache = null;
};
