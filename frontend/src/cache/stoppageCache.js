
let stoppageCache = null;

export const getCachedStoppages = () => stoppageCache;

export const setCachedStoppages = (data) => {
  stoppageCache = data;
};

export const clearStoppageCache = () => {
  stoppageCache = null;
};