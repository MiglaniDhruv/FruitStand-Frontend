export { AuthModel } from "./model";
export { AuthController } from "./controller";
export { AuthRouter } from "./routes";

// Export router instance for use in main server
import { AuthRouter } from "./routes";
export const authRouter = new AuthRouter();