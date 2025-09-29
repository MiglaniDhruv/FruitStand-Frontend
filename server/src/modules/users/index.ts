import { UserRouter } from "./routes";

// Export configured router instance for easy integration
export const userRouter = new UserRouter();

// Export individual components for flexibility
export { UserModel } from "./model";
export { UserController } from "./controller";
export { UserRouter } from "./routes";