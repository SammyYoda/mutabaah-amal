export const ADMIN = { name: 'Admin E2E', email: 'admin@e2e.test', password: 'kata-laluan-admin' };
export const DEV_API_PORT = 3101;
export const DEV_WEB_PORT = 3000;
export const PROD_PORT = Number(process.env.E2E_PROD_PORT ?? 3199);
