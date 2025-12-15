import { ObjectId } from "mongodb";
import debug from 'debug';

const debugValidator = debug('app:validator');

const validId = (paramName) => {
  return (req, res, next) => {
    if (!ObjectId.isValid(req.params[paramName])) {
      debugValidator(`Invalid ObjectId for ${paramName}: ${req.params[paramName]}`);
      return res.status(400).json({ error: `${paramName} is not a valid ObjectId` });
    }

    req[paramName] = new ObjectId(req.params[paramName]);  //req.id 
    next();
  };
};

export { validId };