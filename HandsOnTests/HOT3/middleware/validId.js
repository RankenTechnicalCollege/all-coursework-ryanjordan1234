const { ObjectId } = require('mongodb');

const validId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: `Invalid ${paramName}. Must be a valid MongoDB ObjectId.`
      });
    }

    next();
  };
};

module.exports = validId;