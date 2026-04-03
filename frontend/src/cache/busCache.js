const busCache = new Map(); // routeId -> buses[]

export const getCachedBuses = (routeId) =>
  busCache.get(routeId) || null;

export const setCachedBuses = (routeId, buses) => {
  busCache.set(routeId, buses);
};

export const clearBusCache = () => {
  busCache.clear();
};
