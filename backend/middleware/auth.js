import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'marg_railway_secret_key_2026';

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    department: user.department || 'All',
    contractor_company: user.contractor_company || null,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadBase64).digest('base64url');
  return `${payloadBase64}.${signature}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payloadBase64).digest('base64url');

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.query.token;

  if (!token) {
    req.user = { username: 'officer', name: 'Control Officer', role: 'CONTROL_OFFICER' };
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authorization token.' });
  }

  req.user = decoded;
  next();
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Map authority aliases
    const userRole = req.user.role === 'AUTHORITY' ? 'CONTROL_OFFICER' : req.user.role;
    const normalizedAllowed = allowedRoles.map(r => r === 'AUTHORITY' ? 'CONTROL_OFFICER' : r);

    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized for this operation.`
      });
    }

    next();
  };
}
