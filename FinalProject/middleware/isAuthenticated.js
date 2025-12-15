import { auth } from '../auth.js';
import debug from 'debug';

const debugAuth = debug('app:auth');

export async function isAuthenticated(req, res, next) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "You must be logged in to access this resource"
    });
  }

  req.user = session.user;
  req.session = session.session;
  debugAuth(`User authenticated: ${session.user.email}`);
  next();
}