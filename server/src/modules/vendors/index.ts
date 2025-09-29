import { VendorRouter } from "./routes";

// Export configured router instance for easy integration
export const vendorRouter = new VendorRouter();

// Export individual components for flexibility
export { VendorModel } from "./model";
export { VendorController } from "./controller";
export { VendorRouter } from "./routes";