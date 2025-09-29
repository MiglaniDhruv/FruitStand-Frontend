import { StockRouter } from "./routes";

// Export configured router instance for easy integration
export const stockRouter = new StockRouter();

// Export individual components for flexibility
export { StockModel } from "./model";
export { StockController } from "./controller";
export { StockRouter } from "./routes";