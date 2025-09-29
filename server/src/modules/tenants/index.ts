import { TenantRouter } from "./routes";

// Export configured router instance for easy integration
export const tenantRouter = new TenantRouter();

// Export individual components for flexibility
export { TenantModel } from "./model";
export { TenantController } from "./controller";
export { TenantRouter } from "./routes";