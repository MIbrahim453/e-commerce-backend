const authorizedRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(401).json({ message: "Unauthorized Access" });
    }

    next();
  };
};

export default authorizedRole;
