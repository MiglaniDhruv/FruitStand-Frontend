import { ItemRouter } from "./routes";

// Export configured router instance for easy integration
export const itemRouter = new ItemRouter();

// Export individual components for flexibility
export { ItemModel } from "./model";
export { ItemController } from "./controller";
export { ItemRouter } from "./routes";