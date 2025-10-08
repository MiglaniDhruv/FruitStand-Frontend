/**
 * This file shows the pattern for updating remaining controllers.
 * Each controller should be updated following this exact pattern.
 */

// PATTERN FOR ALL REMAINING CONTROLLERS:

// 1. Add imports at top:
import { NotFoundError, ValidationError, BadRequestError, ForbiddenError } from "../../types";

// 2. Remove these methods from BaseController usage:
// - Remove all this.handleError() calls -> let errors propagate
// - Remove all this.sendValidationError() calls -> use this.validateZodSchema() 
// - Remove all this.sendNotFound() calls -> use this.ensureResourceExists() or throw new NotFoundError()
// - Remove all manual validation error responses -> throw BadRequestError
// - Remove all tenant context checks -> if (!req.tenantId) throw new ForbiddenError('No tenant context found')

// 3. Replace try-catch patterns:
// OLD:
try {
  // some operation
  if (!result) {
    return this.sendNotFound(res, "Resource not found");
  }
  res.json(result);
} catch (error) {
  return this.handleError(res, error, "Operation failed");
}

// NEW:
const result = await someOperation();
this.ensureResourceExists(result, "Resource");
res.json(result);

// 4. Replace validation patterns:
// OLD:
const validation = schema.safeParse(req.body);
if (!validation.success) {
  return this.sendValidationError(res, validation.error.errors);
}

// NEW:
const validatedData = this.validateZodSchema(schema, req.body);

// 5. Replace database operations that might fail:
// OLD:
const result = await model.deleteResource(id);

// NEW:
const result = await this.wrapDatabaseOperation(() => 
  model.deleteResource(id)
);

// 6. Replace all manual error responses with throwing errors:
// return res.status(400).json({ message: "Bad request" });
// becomes:
// throw new BadRequestError("Bad request");

// 7. Keep success responses as-is:
// res.json(data); // ✓ Keep this
// res.status(201).json(data); // ✓ Keep this

/**
 * EXAMPLE COMPLETE CONTROLLER UPDATE:
 */

export class ExampleController extends BaseController {
  // OLD METHOD:
  async oldMethod(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.tenantId) return res.status(403).json({ message: 'No tenant context found' });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return this.sendValidationError(res, validation.error.errors);
      }
      
      const result = await model.getData(req.tenantId, validation.data);
      if (!result) {
        return this.sendNotFound(res, "Data not found");
      }
      
      res.json(result);
    } catch (error) {
      return this.handleError(res, error, "Failed to get data");
    }
  }

  // NEW METHOD:
  async newMethod(req: AuthenticatedRequest, res: Response) {
    if (!req.tenantId) throw new ForbiddenError('No tenant context found');
    
    const validatedData = this.validateZodSchema(schema, req.body);
    
    const result = await model.getData(req.tenantId, validatedData);
    this.ensureResourceExists(result, "Data");
    
    res.json(result);
  }
}