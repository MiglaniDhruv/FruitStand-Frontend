import { UserRouter } from "./routes";

// Export a configured router instance for the user module
export const userRouter = new UserRouter();

// Export the router instance for mounting in the main application
export default userRouter.getRouter();