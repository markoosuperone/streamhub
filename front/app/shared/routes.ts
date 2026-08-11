export const ROUTES = {
  auth: '/auth',
  home: '/',
  library: '/library',
};

export const protectedRoutes = [ROUTES.home, ROUTES.library];

export const publicRoutes = [ROUTES.auth];
